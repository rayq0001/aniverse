import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import { GoogleSyncService } from './googleSync';
import { convertToWebP } from './tools/sharp-compositor';
import firebaseConfig from '../../firebase-applet-config.json';

// Firestore REST API helper (avoids client SDK gRPC issues on server)
async function firestoreSet(collectionPath: string, docId: string, data: Record<string, any>) {
  const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/${collectionPath}/${docId}`;
  const fields: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'number') {
      fields[key] = Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
    } else if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (Array.isArray(value)) {
      fields[key] = { arrayValue: { values: value.map((v: any) => ({ stringValue: String(v) })) } };
    }
  }
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`Firestore write failed: ${res.status} ${await res.text()}`);
}

export interface AutomationTask {
  id: string;
  type: 'scrape' | 'ai' | 'full_pipeline';
  status: 'pending' | 'running' | 'completed' | 'error';
  logs: string[];
  progress: number;
}

interface PipelineInput {
  url?: string;
  source: string;
  name?: string;
  chapter?: string;
  contentId?: string;
  startChapter?: string;
  endChapter?: string;
}

export class AutomationOrchestrator {
  private syncService: GoogleSyncService;
  private toolsPath: string;
  private tempPath: string;
  private ai: GoogleGenAI | null;

  constructor() {
    this.syncService = new GoogleSyncService();
    this.toolsPath = path.join(process.cwd(), 'services', 'automation', 'tools');
    this.tempPath = path.join(process.cwd(), 'services', 'automation', 'temp');
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
    this.ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
    
    if (!fs.existsSync(this.tempPath)) {
      fs.mkdirSync(this.tempPath, { recursive: true });
    }
  }

  private log(taskId: string, message: string, tasks: Record<string, any>) {
    const timestamp = new Date().toLocaleTimeString();
    const formattedMessage = `[${timestamp}] ${message}`;
    if (tasks[taskId]) {
      tasks[taskId].logs.push(formattedMessage);
    }
    console.log(`[${taskId}]: ${formattedMessage}`);
  }

  private getChapterRange(data: PipelineInput) {
    const start = Number(data.startChapter || data.chapter || 1);
    const end = Number(data.endChapter || data.chapter || start);

    if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0 || end < start) {
      throw new Error('Invalid chapter range provided.');
    }

    return { start, end };
  }

  private copyDirectoryContents(srcDir: string, destDir: string) {
    const entries = fs.readdirSync(srcDir, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destDir, entry.name);

      if (entry.isDirectory()) {
        if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true });
        this.copyDirectoryContents(srcPath, destPath);
      } else if (entry.isFile()) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  private getImageFilesRecursive(dirPath: string): string[] {
    const result: string[] = [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        result.push(...this.getImageFilesRecursive(fullPath));
      } else if (entry.isFile() && entry.name.match(/\.(jpg|jpeg|png|webp)$/i)) {
        result.push(fullPath);
      }
    }

    return result;
  }

  private getMimeType(filePath: string) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.png') return 'image/png';
    if (ext === '.webp') return 'image/webp';
    return 'image/jpeg';
  }

  private async buildTranslationDocFromImages(taskId: string, imagePaths: string[], tasks: Record<string, any>) {
    if (!this.ai || imagePaths.length === 0) return '';

    const maxPages = 8;
    const selected = imagePaths.slice(0, maxPages);
    this.log(taskId, `📝 [STEP 3.1]: Extracting and translating dialogue from ${selected.length} page(s)...`, tasks);

    const sections: string[] = [];
    for (let i = 0; i < selected.length; i++) {
      const imgPath = selected[i];
      try {
        const base64 = fs.readFileSync(imgPath).toString('base64');
        const response = await this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: this.getMimeType(imgPath),
                  data: base64,
                },
              },
              {
                text: 'Extract spoken text from this comic page and translate it to Arabic. Return only concise translated lines in reading order. If no text exists, return: (no dialogue).',
              },
            ],
          },
        });

        const translated = (response.text || '').trim() || '(no dialogue)';
        sections.push(`Page ${i + 1}:\n${translated}`);
      } catch (err: any) {
        this.log(taskId, `⚠️ [WARNING]: Translation failed for page ${i + 1}: ${err?.message || 'unknown error'}`, tasks);
        sections.push(`Page ${i + 1}:\n(translation failed)`);
      }
    }

    return sections.join('\n\n---\n\n');
  }

  async runFullPipeline(taskId: string, data: PipelineInput, tasks: Record<string, any>) {
    try {
      const { start, end } = this.getChapterRange(data);
      const seriesLabel = data.name || data.contentId || data.url || 'Unknown Series';
      const chapterLabel = start === end ? String(start) : `${start}-${end}`;
      const pipelineStart = Date.now();

      this.log(taskId, `🚀 Starting full pipeline for "${seriesLabel}" Ch.${chapterLabel}`, tasks);
      tasks[taskId].status = 'running';
      
      // 1. SCRAPE
      const stepStart1 = Date.now();
      this.log(taskId, `📂 [STEP 1]: Initiating scraper for ${data.source}...`, tasks);
      const rawPath = path.join(this.tempPath, seriesLabel, chapterLabel, 'raw');
      if (!fs.existsSync(rawPath)) fs.mkdirSync(rawPath, { recursive: true });
      
      await this.runTool(taskId, 'scrape', data, tasks, rawPath);
      tasks[taskId].progress = 25;
      this.log(taskId, `⏱️ [STEP 1] Scraping done in ${((Date.now() - stepStart1) / 1000).toFixed(1)}s`, tasks);

      // 2. AI DETECTION (TextBPN++ — Tile-Based)
      const stepStart2 = Date.now();
      this.log(taskId, `🔍 [STEP 2]: Detecting text areas (tile-based)...`, tasks);
      const maskPath = path.join(this.tempPath, seriesLabel, chapterLabel, 'mask');
      if (!fs.existsSync(maskPath)) fs.mkdirSync(maskPath, { recursive: true });
      
      try {
        await this.runTool(taskId, 'detect', { ...data, input: rawPath, output: maskPath }, tasks);
        tasks[taskId].progress = 50;
        this.log(taskId, `⏱️ [STEP 2] Detection done in ${((Date.now() - stepStart2) / 1000).toFixed(1)}s`, tasks);
      } catch (err: any) {
        this.log(taskId, `⚠️ [WARNING]: AI Detection failure (${err?.message || 'unknown error'}). Falling back to original frames.`, tasks);
        tasks[taskId].progress = 50;
      }

      // 3. CLEAN & TRANSLATE (TsengScans — Tile-Based Inpainting)
      const stepStart3 = Date.now();
      this.log(taskId, `✨ [STEP 3]: In-painting text regions (tile-based)...`, tasks);
      const finalPath = path.join(this.tempPath, seriesLabel, chapterLabel, 'final');
      if (!fs.existsSync(finalPath)) fs.mkdirSync(finalPath, { recursive: true });
      
      let translationResult = '';
      try {
        await this.runTool(taskId, 'translate', { ...data, input: rawPath, mask: maskPath, output: finalPath }, tasks);
        tasks[taskId].progress = 70;
        this.log(taskId, `⏱️ [STEP 3] Inpainting done in ${((Date.now() - stepStart3) / 1000).toFixed(1)}s`, tasks);
      } catch (err: any) {
        this.log(taskId, `⚠️ [WARNING]: AI Processing failure (${err?.message || 'unknown error'}). Using raw frames for library.`, tasks);
        this.copyDirectoryContents(rawPath, finalPath);
        tasks[taskId].progress = 70;
      }

      // 3.5. OPTIMIZE — Convert final images to WebP with Sharp
      const stepStart35 = Date.now();
      const finalImages = this.getImageFilesRecursive(finalPath);
      let optimizedImages = finalImages;
      try {
        this.log(taskId, `🖼️ [STEP 3.5]: Optimizing ${finalImages.length} images with Sharp...`, tasks);
        const webpPath = path.join(this.tempPath, seriesLabel, chapterLabel, 'webp');
        const webpFiles = await convertToWebP(finalPath, webpPath, 85);
        if (webpFiles.length > 0) {
          optimizedImages = webpFiles;
          this.log(taskId, `⏱️ [STEP 3.5] WebP conversion done in ${((Date.now() - stepStart35) / 1000).toFixed(1)}s`, tasks);
        }
      } catch (err: any) {
        this.log(taskId, `ℹ️ WebP optimization skipped (${err?.message}). Using originals.`, tasks);
      }
      tasks[taskId].progress = 75;

      // 3.6 TRANSLATE DIALOGUE
      try {
        translationResult = await this.buildTranslationDocFromImages(taskId, optimizedImages, tasks);
      } catch (err: any) {
        this.log(taskId, `⚠️ [WARNING]: Dialogue translation skipped (${err?.message || 'unknown error'}).`, tasks);
      }

      // 4. SYNC TO GOOGLE (Parallel uploads)
      const stepStart4 = Date.now();
      this.log(taskId, `🌐 [STEP 4]: Syncing to Cloud Storage...`, tasks);
      if (await this.syncService.isReady()) {
        const rootFolderId = await this.syncService.getOrCreateFolder('Aniverse-Automated');
        const manhwaFolderId = await this.syncService.getOrCreateFolder(seriesLabel, rootFolderId);
        const chapterFolderId = await this.syncService.getOrCreateFolder(`Chapter-${chapterLabel}`, manhwaFolderId);
        
        // Upload images in parallel batches of 4
        const uploadBatchSize = 4;
        for (let i = 0; i < optimizedImages.length; i += uploadBatchSize) {
          const batch = optimizedImages.slice(i, i + uploadBatchSize);
          await Promise.all(batch.map(fp => this.syncService.uploadFile(chapterFolderId, fp)));
        }
        
        if (translationResult) {
          await this.syncService.createOrUpdateDoc(chapterFolderId, `Translation-${seriesLabel}-Ch${chapterLabel}`, translationResult);
        }
        
        this.log(taskId, `⏱️ [STEP 4] Cloud sync done in ${((Date.now() - stepStart4) / 1000).toFixed(1)}s`, tasks);
      } else {
        this.log(taskId, `ℹ️ [INFO]: Cloud Sync skipped (service-account.json not configured).`, tasks);
      }

      const totalTime = ((Date.now() - pipelineStart) / 1000).toFixed(1);
      tasks[taskId].status = 'completed';
      tasks[taskId].progress = 100;
      tasks[taskId].chapterLabel = chapterLabel;
      tasks[taskId].imagePaths = optimizedImages;
      this.log(taskId, `🏁 Pipeline finished in ${totalTime}s total!`, tasks);
      
    } catch (err: any) {
      this.log(taskId, `🛑 [FATAL]: ${err.message}`, tasks);
      tasks[taskId].status = 'error';
    }
  }

  private runTool(taskId: string, type: string, data: any, tasks: Record<string, any>, customPath?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let cmd = '';
      let cwd = '';

      // Tool Manifest - Correcting mapping and entry points
      const toolsMap: Record<string, { dir: string, exec: 'python' | 'node', script: string }> = {
        'scrape-naver': { dir: 'naver-downloader', exec: 'python', script: 'nava.py' },
        'scrape-kakao': { dir: 'kakao-downloader', exec: 'node', script: 'src/v2/main.ts' },
        'scrape-aio': { dir: 'aio-downloader', exec: 'python', script: 'aio-dl.py' },
          'detect': { dir: 'text-bpn-plus', exec: 'python', script: 'run_cli.py' },
          'translate': { dir: 'tseng-scans-ai', exec: 'python', script: 'run_cli.py' }
      };

      const toolKey = type === 'scrape' ? `scrape-${data.source.toLowerCase()}` : type;
      const toolConfig = toolsMap[toolKey];

      if (!toolConfig) {
        return reject(new Error(`Unknown tool type or source: ${toolKey}`));
      }

      cwd = path.join(this.toolsPath, toolConfig.dir);
      if (!fs.existsSync(cwd)) {
        return reject(new Error(`Tool directory missing: ${toolConfig.dir}`));
      }

      const scriptPath = path.join(cwd, toolConfig.script);
      if (!fs.existsSync(scriptPath)) {
        return reject(new Error(`Tool script missing: ${toolConfig.dir}/${toolConfig.script}`));
      }

      if (toolConfig.exec === 'python') {
        // Use tool's own venv if present, otherwise fall back to system python3
        const venvPython = process.platform === 'win32'
          ? path.join(cwd, 'venv', 'Scripts', 'python.exe')
          : path.join(cwd, 'venv', 'bin', 'python');
        const pythonPath = fs.existsSync(venvPython) ? venvPython : 'python3';
        
        if (type === 'scrape') {
          if (data.source === 'Naver') {
            const { start, end } = this.getChapterRange(data);
            cmd = `"${pythonPath}" -u ${toolConfig.script} "${data.contentId}" "${start}" "${end}" "${customPath}"`;
          } else {
            cmd = `"${pythonPath}" -u ${toolConfig.script} --url "${data.url}" --output "${customPath}"`;
          }
        } else if (type === 'detect') {
          cmd = `"${pythonPath}" -u ${toolConfig.script} --input "${data.input}" --output "${data.output}"`;
        } else if (type === 'translate') {
          cmd = `"${pythonPath}" -u ${toolConfig.script} --input "${data.input}" --mask "${data.mask}" --output "${data.output}"`;
        }
      } else if (toolConfig.exec === 'node') {
        if (data.source === 'Kakao') {
          const { start, end } = this.getChapterRange(data);
          const offset = start - 1;
          const limit = end - start + 1;
          cmd = `npm run build && npm run start -- id=${data.contentId} offset=${offset} limit=${limit} output="${customPath}"`;
        } else {
          cmd = `npm run start -- --url "${data.url}" --output "${customPath}"`;
        }
      }

      this.log(taskId, `⚙️ [EXEC]: ${toolConfig.dir} (${toolConfig.exec})`, tasks);
      
      const child = spawn(cmd, { shell: true, cwd });
      let result = '';

      child.stdout.on('data', (d) => {
        const line = d.toString().trim();
        if (line) {
          // Filtering heavy binary logs if any, but keeping text
          if (line.length < 500) this.log(taskId, `[${toolConfig.dir}]: ${line}`, tasks);
          result += line + '\n';
        }
      });

      child.stderr.on('data', (d) => {
        const line = d.toString().trim();
        if (line && !line.includes('DeprecationWarning')) {
          this.log(taskId, `[${toolConfig.dir}-ERR]: ${line}`, tasks);
        }
      });

      child.on('close', (code) => {
        if (code === 0) {
          this.log(taskId, `✅ ${toolConfig.dir} completed successfully.`, tasks);
          resolve(result);
        } else {
          this.log(taskId, `❌ ${toolConfig.dir} exited with code ${code}.`, tasks);
          reject(new Error(`${toolConfig.dir} failed.`));
        }
      });
    });
  }

  async finalizeStaffChapter(manhwaId: string, chapterNumber: string, imageUrls: string[], task: any, chapterTitle?: string) {
    try {
      if (task.id) this.log(task.id, `💾 Writing Ch.${chapterNumber} metadata to library...`, { [task.id]: task });
      
      const chapterData: any = {
        number: parseFloat(chapterNumber),
        images: imageUrls,
        views: 0,
        releaseDate: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      if (chapterTitle) chapterData.title = chapterTitle;
      await firestoreSet(`manhwas/${manhwaId}/chapters`, chapterNumber, chapterData);

      if (task.id) this.log(task.id, `🎉 Database updated successfully!`, { [task.id]: task });

      // Sync to Google Drive
      if (await this.syncService.isReady()) {
        if (task.id) this.log(task.id, `☁️ Syncing assets to Google Drive...`, { [task.id]: task });
        const rootFolderId = await this.syncService.getOrCreateFolder('Aniverse-Automated');
        const manhwaFolderId = await this.syncService.getOrCreateFolder(manhwaId, rootFolderId);
        const chapterFolderId = await this.syncService.getOrCreateFolder(`Chapter-${chapterNumber}`, manhwaFolderId);
        
        for (const imgPath of imageUrls) {
           // imgPath is /uploads/manhwas/id/chapters/num/file.jpg
           // We need to resolve it relative to the workspace root correctly
           if (imgPath.startsWith('/uploads/')) {
             // Correct Windows pathing: remove leading slash then join
             const relativePath = imgPath.startsWith('/') ? imgPath.substring(1) : imgPath;
             const localAbsPath = path.join(process.cwd(), relativePath);
             
             try {
                if (fs.existsSync(localAbsPath)) {
                  await this.syncService.uploadFile(chapterFolderId, localAbsPath);
                } else {
                  if (task.id) this.log(task.id, `⚠️ File not found locally: ${localAbsPath}`, { [task.id]: task });
                }
             } catch(e: any) {
                if (task.id) this.log(task.id, `⚠️ Cloud sync error for ${path.basename(imgPath)}: ${e.message}`, { [task.id]: task });
             }
           }
        }
        if (task.id) this.log(task.id, `✅ Cloud backup complete.`, { [task.id]: task });
      }

    } catch (err: any) {
      if (task.id) this.log(task.id, `❌ [FAIL]: Staff chapter finalization failed: ${err.message}`, { [task.id]: task });
      throw err;
    }
  }

  /**
   * Bulk scrape: download chapters and save directly to uploads + Firestore.
   * No AI processing — just raw download + store.
   */
  async runBulkScrape(
    taskId: string,
    data: { source: string; contentId: string; startChapter: number; endChapter: number; manhwaId: string },
    tasks: Record<string, any>
  ) {
    const { source, contentId, startChapter, endChapter, manhwaId } = data;
    const totalChapters = endChapter - startChapter + 1;

    try {
      tasks[taskId].status = 'running';
      this.log(taskId, `🚀 Bulk scrape: ${source} ID=${contentId}, Ch.${startChapter}–${endChapter} (${totalChapters} chapters)`, tasks);

      const batchSize = 50;
      let completedChapters = 0;

      for (let batchStart = startChapter; batchStart <= endChapter; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize - 1, endChapter);
        const batchLabel = `${batchStart}-${batchEnd}`;

        this.log(taskId, `📂 [BATCH] Scraping Ch.${batchLabel}...`, tasks);

        // Scrape to temp directory
        const rawPath = path.join(this.tempPath, `bulk_${manhwaId}`, batchLabel, 'raw');
        if (!fs.existsSync(rawPath)) fs.mkdirSync(rawPath, { recursive: true });

        const scrapeData: PipelineInput = {
          source,
          contentId,
          startChapter: String(batchStart),
          endChapter: String(batchEnd),
        };

        try {
          await this.runTool(taskId, 'scrape', scrapeData, tasks, rawPath);
        } catch (err: any) {
          this.log(taskId, `❌ Batch ${batchLabel} scrape failed: ${err.message}`, tasks);
          continue;
        }

        // Find downloaded chapter folders inside rawPath (usually nested under title folder)
        const findChapterDirs = (dir: string): Map<number, string> => {
          const result = new Map<number, string>();
          const entries = fs.readdirSync(dir, { withFileTypes: true });

          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              const num = parseInt(entry.name);
              if (!isNaN(num) && num >= batchStart && num <= batchEnd) {
                // This is a chapter directory with numeric name
                const images = fs.readdirSync(fullPath).filter(f => f.match(/\.(jpg|jpeg|png|webp)$/i));
                if (images.length > 0) {
                  result.set(num, fullPath);
                }
              } else {
                // Recurse into title subdirectories
                const sub = findChapterDirs(fullPath);
                sub.forEach((v, k) => result.set(k, v));
              }
            }
          }
          return result;
        };

        const chapterDirs = findChapterDirs(rawPath);
        this.log(taskId, `📁 Found ${chapterDirs.size} chapter directories in batch`, tasks);

        // Process each chapter: copy to uploads and create Firestore record
        const uploadsBase = path.join(process.cwd(), 'uploads', 'manhwas', manhwaId, 'chapters');

        for (const [chNum, chDir] of chapterDirs) {
          const destDir = path.join(uploadsBase, String(chNum));
          if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

          const images = fs.readdirSync(chDir)
            .filter(f => f.match(/\.(jpg|jpeg|png|webp)$/i))
            .sort((a, b) => {
              const nA = parseInt(a.replace(/[^0-9]/g, '') || '0');
              const nB = parseInt(b.replace(/[^0-9]/g, '') || '0');
              return nA - nB;
            });

          const imageUrls: string[] = [];
          images.forEach((img, idx) => {
            const ext = path.extname(img);
            const newName = `${String(idx + 1).padStart(3, '0')}${ext}`;
            fs.copyFileSync(path.join(chDir, img), path.join(destDir, newName));
            imageUrls.push(`/uploads/manhwas/${manhwaId}/chapters/${chNum}/${newName}`);
          });

          // Write Firestore chapter record
          try {
            await firestoreSet(`manhwas/${manhwaId}/chapters`, String(chNum), {
              number: chNum,
              title: `الفصل ${chNum}`,
              images: imageUrls,
              views: 0,
              createdAt: new Date().toISOString(),
            });
          } catch (dbErr: any) {
            this.log(taskId, `⚠️ Firestore write failed for Ch.${chNum}: ${dbErr.message}`, tasks);
          }

          completedChapters++;
          tasks[taskId].progress = Math.round((completedChapters / totalChapters) * 100);
          this.log(taskId, `✅ Ch.${chNum}: ${imageUrls.length} pages saved (${completedChapters}/${totalChapters})`, tasks);
        }

        // Clean up temp batch directory
        try {
          fs.rmSync(path.join(this.tempPath, `bulk_${manhwaId}`, batchLabel), { recursive: true, force: true });
        } catch {}
      }

      tasks[taskId].status = 'completed';
      tasks[taskId].progress = 100;
      this.log(taskId, `🏁 Bulk scrape finished! ${completedChapters}/${totalChapters} chapters saved.`, tasks);

    } catch (err: any) {
      this.log(taskId, `🛑 [FATAL]: ${err.message}`, tasks);
      tasks[taskId].status = 'error';
    }
  }
}
