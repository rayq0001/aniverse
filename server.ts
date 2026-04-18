import express from "express";
import dotenv from "dotenv";
dotenv.config();

import path from "path";
import fs from "fs";
import multer from "multer";
import AdmZip from "adm-zip";
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import crypto from "crypto";
import { AutomationOrchestrator } from "./services/automation/orchestrator";
import { stitchVertical } from "./services/automation/tools/sharp-compositor";
// Google Drive folder download helper (no API key needed — scrapes public folder page)
async function downloadDriveFolder(driveLink: string, destDir: string): Promise<string[]> {
  const folderMatch = driveLink.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (!folderMatch) throw new Error('Invalid Google Drive folder link');
  const folderId = folderMatch[1];

  // Try multiple URL formats — Google sometimes 404s on one but not the other
  const urls = [
    `https://drive.google.com/drive/folders/${folderId}`,
    `https://drive.google.com/drive/folders/${folderId}?usp=sharing`,
    `https://drive.google.com/drive/u/0/folders/${folderId}`,
  ];

  let html = '';
  let success = false;
  for (const url of urls) {
    try {
      const pageRes = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        redirect: 'follow',
      });
      if (pageRes.ok) {
        html = await pageRes.text();
        success = true;
        break;
      }
    } catch {}
  }
  if (!success) throw new Error(`Failed to access Drive folder: 404 — make sure the folder is public (Anyone with the link).`);

  // Unescape \xNN sequences and HTML entities in the embedded JS data
  let unescaped = html.replace(/\\x([0-9a-fA-F]{2})/g, (_, hex: string) =>
    String.fromCharCode(parseInt(hex, 16))
  );
  unescaped = unescaped.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

  // Extract file entries from Google's embedded data structure
  // Format: null,"FILE_ID"],null,null,null,"image/jpeg" ... "FILENAME.jpg"
  const files: { id: string; name: string }[] = [];
  const seen = new Set<string>();
  const blockPattern = /null,"([a-zA-Z0-9_-]{20,60})"\],null,null,null,"image\/(jpe?g|png|webp|gif|bmp)/gi;
  let m;
  while ((m = blockPattern.exec(unescaped)) !== null) {
    if (seen.has(m[1]) || m[1] === folderId) continue;
    const after = unescaped.substring(m.index, m.index + 500);
    const fnMatch = after.match(/"([^"]{1,100}\.(jpe?g|png|webp|gif|bmp))"/i);
    if (fnMatch) {
      seen.add(m[1]);
      files.push({ id: m[1], name: fnMatch[1] });
    }
  }

  // Fallback: try data-id attributes paired with nearby image references
  if (files.length === 0) {
    const dataIdPattern = /data-id="([a-zA-Z0-9_-]{20,60})"/g;
    while ((m = dataIdPattern.exec(unescaped)) !== null) {
      if (!seen.has(m[1]) && m[1] !== folderId) {
        seen.add(m[1]);
        files.push({ id: m[1], name: `${files.length}.jpg` });
      }
    }
  }

  if (files.length === 0) throw new Error(`No images found in Drive folder (folderId: ${folderId}, html length: ${html.length}). Make sure the folder is public and contains image files.`);

  // Sort by number in filename
  files.sort((a, b) => {
    const numA = parseInt(a.name.replace(/[^0-9]/g, '') || '0');
    const numB = parseInt(b.name.replace(/[^0-9]/g, '') || '0');
    return numA - numB;
  });

  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

  // Download each image via direct download URL
  const savedPaths: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = path.extname(file.name) || '.jpg';
    const newName = `${String(i + 1).padStart(3, '0')}${ext}`;
    const destPath = path.join(destDir, newName);

    const dlUrl = `https://drive.usercontent.google.com/download?id=${file.id}&export=download`;
    let dlRes = await fetch(dlUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
      redirect: 'follow',
    });
    
    // Fallback to lh3 direct image link
    if (!dlRes.ok) {
      dlRes = await fetch(`https://lh3.googleusercontent.com/d/${file.id}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' },
        redirect: 'follow',
      });
    }
    
    // Fallback to old uc endpoint
    if (!dlRes.ok) {
      dlRes = await fetch(`https://drive.google.com/uc?export=download&id=${file.id}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' },
        redirect: 'follow',
      });
    }
    
    if (!dlRes.ok) { console.error(`Failed to download ${file.name}: ${dlRes.status}`); continue; }

    // Handle virus scan warning for large files
    const contentType = dlRes.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const body = await dlRes.text();
      const confirmMatch = body.match(/confirm=([a-zA-Z0-9_-]+)/);
      if (confirmMatch) {
        const confirmRes = await fetch(`https://drive.google.com/uc?export=download&id=${file.id}&confirm=${confirmMatch[1]}`, {
          headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow',
        });
        if (confirmRes.ok) {
          fs.writeFileSync(destPath, Buffer.from(await confirmRes.arrayBuffer()));
          savedPaths.push(newName);
        }
      }
    } else {
      fs.writeFileSync(destPath, Buffer.from(await dlRes.arrayBuffer()));
      savedPaths.push(newName);
    }
  }

  if (savedPaths.length === 0) throw new Error('Failed to download any images from Drive folder.');
  return savedPaths;
}

// Task Management State
const activeTasks: Record<string, any> = {};
const orchestrator = new AutomationOrchestrator();

async function startServer() {
  const app = express();
  const PORT = 3002; // API server - Vite dev server runs on 3000 and proxies here

  // Middleware for parsing JSON with a higher limit for images
  app.use(express.json({ limit: "50mb" }));

  // Setup Multer and Uploads static dir
  const _dirname = path.resolve();
  const uploadsDir = path.join(_dirname, "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  app.use("/uploads", express.static(uploadsDir));
  
  const upload = multer({ dest: path.join(_dirname, "temp_uploads"), limits: { fileSize: 50 * 1024 * 1024 } });

  // Profile image upload endpoint
  app.post("/api/upload-profile-image", upload.single('image'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const { type, userId } = req.body; // type: 'avatar' | 'banner'
      if (!userId || !type) return res.status(400).json({ error: 'Missing userId or type' });

      // Validate file type
      const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedMimes.includes(req.file.mimetype)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Invalid file type. Allowed: jpg, png, gif, webp' });
      }

      // Limit file size (50MB)
      if (req.file.size > 50 * 1024 * 1024) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'File too large. Max 50MB' });
      }

      // Sanitize userId to prevent path traversal
      const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '');
      const ext = path.extname(req.file.originalname) || '.jpg';
      const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, '');
      const profileDir = path.join(uploadsDir, 'profiles', safeUserId);
      if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

      const filename = `${type}_${Date.now()}${safeExt}`;
      const destPath = path.join(profileDir, filename);
      fs.renameSync(req.file.path, destPath);

      const imageUrl = `/uploads/profiles/${safeUserId}/${filename}`;
      res.json({ success: true, url: imageUrl });
    } catch (err: any) {
      console.error('Profile image upload error:', err.message);
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(500).json({ error: err.message });
    }
  });

  // Initialize Google GenAI
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "";
  if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY is not set in environment.");
  }
  const ai = new GoogleGenAI({ apiKey });

  // Tools definition for Agent
  const tools: { functionDeclarations: FunctionDeclaration[] } = {
    functionDeclarations: [
      {
        name: "search_manhwa",
        description: "Search manhwa database",
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: { type: Type.STRING },
            genre: { type: Type.STRING },
          },
        },
      },
      {
        name: "navigate_to",
        description: "Navigate user",
        parameters: {
          type: Type.OBJECT,
          properties: {
            page: {
              type: Type.STRING,
              enum: ["home", "library", "details", "advanced-search"],
            },
            id: { type: Type.STRING },
          },
          required: ["page"],
        },
      },
    ],
  };

  // API Routes FIRST

  // Serve static files from public folder
  app.use(express.static("public"));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/translate", async (req, res) => {
    try {
      const { text, targetLanguage = "Arabic" } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Translate the following text to ${targetLanguage}. Return ONLY the translated text: "${text}"`,
              },
            ],
          },
        ],
      });
      
      const translated = response.text || (response.candidates?.[0]?.content?.parts?.[0]?.text) || text;
      res.json({
        text: (translated as string)
          .replace(/^(إليك|الترجمة|ترجمة).*?:\s*/i, "")
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/\(?المصدر:[^\n)]*\)?/gi, "")
          .replace(/\(?Source:[^\n)]*\)?/gi, "")
          .trim()
      });
    } catch (err: any) {
      console.error("Translate error:", err.message);
      res.status(500).json({ text: req.body.text || "حدث خطأ" });
    }
  });

  app.post("/api/translate-genres", async (req, res) => {
    try {
      const { genres = [] } = req.body;
      if (!genres.length) return res.json({ genres: [] });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Translate: ${genres.join(", ")}`,
      });

      const translated = (response.text || "")
        .split(/[,،]/)
        .map((s) => s.trim())
        .filter(Boolean);

      res.json({ genres: translated });
    } catch (err: any) {
      console.error("Genres translate error:", err.message);
      res.status(500).json({ genres: req.body.genres });
    }
  });

  app.post("/api/agent", async (req, res) => {
    try {
      const { userMessage, context, history = [], language = "ar" } = req.body;
      
      const instructions = language === "ar"
        ? `أنت "جين" خبير المانهوا. السياق: ${context?.path || ""}. قدم تحليلات مختصرة وتجنب التكرار.`
        : `You are Jin, manhwa expert. Context: ${context?.path || ""}. Provide concise explanations and avoid repetition.`;

      const maxHistory = history.slice(-6); // Phase 4 improvement
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { role: "user", parts: [{ text: instructions }] },
          ...maxHistory,
          { role: "user", parts: [{ text: userMessage }] },
        ],
        config: {
          temperature: 0.7,
          tools: [tools],
        },
      });

      const responseText = response.text || (response.candidates?.[0]?.content?.parts?.[0]?.text) || "";
      const functionCalls = response.functionCalls || (response.candidates?.[0]?.content?.parts?.filter((p: any) => p.functionCall).map((p: any) => p.functionCall)) || [];

      res.json({
        text: responseText,
        functionCalls: functionCalls,
      });
    } catch (err: any) {
      console.error("Agent error:", err.message);
      res.status(500).json({ 
        text: req.body.language === "ar" ? "حدث خطأ فني، حاول مرة أخرى." : "Technical error, try again." 
      });
    }
  });

  app.post("/api/analyze-manhwa", async (req, res) => {
    try {
      const { title, description, language = "ar" } = req.body;
      const prompt = language === "ar"
        ? `تحليل عميق لمانهوا "${title}":\nالوصف: ${description}`
        : `Deep analysis of "${title}":\nDescription: ${description}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      res.json({ text: response.text || (language === "ar" ? "حدث خطأ" : "Error") });
    } catch (err: any) {
      console.error("Analyze Manhwa error:", err.message);
      res.status(500).json({ text: req.body.language === "ar" ? "حدث خطأ" : "Error" });
    }
  });

  app.post("/api/analyze-chapter", async (req, res) => {
    try {
      const { title, chapterNumber, language = "ar" } = req.body;
      const prompt = language === "ar"
        ? `ملخص الفصل ${chapterNumber} من "${title}" بدون حرق`
        : `Chapter ${chapterNumber} summary of "${title}"`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      res.json({ text: response.text || "حدث خطأ" });
    } catch (err: any) {
      console.error("Analyze Chapter error:", err.message);
      res.status(500).json({ text: "حدث خطأ" });
    }
  });

  app.post("/api/explain-page", async (req, res) => {
    try {
      const { imageBase64, language = "ar" } = req.body;
      const imagePart = {
        inlineData: { mimeType: "image/jpeg", data: imageBase64 },
      };
      const textPart = {
        text: language === "ar" ? "اشرح هذه الصفحة" : "Explain this page",
      };

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: [imagePart, textPart] },
      });

      res.json({ text: response.text || "حدث خطأ" });
    } catch (err: any) {
      console.error("Explain Page error:", err.message);
      res.status(500).json({ text: "حدث خطأ" });
    }
  });

  app.post("/api/find-matching", async (req, res) => {
    try {
      const { base64, mimeType, list = [] } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
          parts: [
            { inlineData: { mimeType, data: base64 } },
            { text: JSON.stringify(list) },
          ],
        },
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch (err: any) {
      console.error("Find Matching error:", err.message);
      res.status(500).json({});
    }
  });

  // --- ANILIST SEARCH + TRANSLATE ---
  app.post("/api/anilist/search", async (req, res) => {
    try {
      const { title } = req.body;
      if (!title) return res.status(400).json({ error: "title is required" });

      console.log(`\n📱 AniList Search Request: "${title}"`);
      
      const anilistQuery = `
        query ($search: String) {
          Media(search: $search, type: MANGA, format_in: [MANGA, ONE_SHOT]) {
            id
            title { romaji english native }
            description(asHtml: false)
            coverImage { extraLarge large }
            bannerImage
            startDate { year month day }
            status
            genres
            staff(sort: RELEVANCE, perPage: 5) {
              edges { role node { name { full } } }
            }
          }
        }
      `;

      const aniRes = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: anilistQuery, variables: { search: title } }),
      });
      const aniData = await aniRes.json();
      const media = aniData?.data?.Media;
      if (!media) return res.status(404).json({ error: "Not found on AniList" });

      console.log(`✓ Found: ${media.title?.english || media.title?.romaji}`);

      // Clean description: remove (Source: ...) lines and HTML tags
      let cleanDesc = (media.description || "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]*>/g, "")
        .replace(/\(Source:[^)]*\)/gi, "")
        .replace(/\(source:[^)]*\)/gi, "")
        .replace(/\[Written by[^\]]*\]/gi, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      // DeepL helper function
      const deeplApiKey = process.env.DEEPL_API_KEY || "";
      const translateWithDeepL = async (text: string): Promise<string> => {
        if (!text) return text;
        if (!deeplApiKey) {
          console.warn("⚠️  DeepL API Key not configured - skipping translation");
          return text;
        }
        try {
          const deeplRes = await fetch("https://api-free.deepl.com/v2/translate", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `DeepL-Auth-Key ${deeplApiKey}`
            },
            body: JSON.stringify({
              text: [text],
              target_lang: "AR",
            }),
          });
          
          if (!deeplRes.ok) {
            const errorData = await deeplRes.text();
            console.error(`❌ DeepL API error (${deeplRes.status}):`, errorData);
            return text;
          }
          
          const deeplData = await deeplRes.json();
          const translatedText = deeplData?.translations?.[0]?.text || text;
          console.log("✓ Translation successful:", text.substring(0, 50) + "...");
          return translatedText;
        } catch (e) {
          console.error("❌ DeepL translation failed:", e);
          return text;
        }
      };

      // Translate description with DeepL
      let descriptionAr = cleanDesc;
      try {
        if (cleanDesc) {
          console.log("🔄 Translating description...");
          descriptionAr = await translateWithDeepL(cleanDesc);
        }
      } catch (translateErr) {
        console.error("❌ Description translation failed:", translateErr);
      }

      // Translate each genre individually with DeepL
      let genresAr: string[] = media.genres || [];
      try {
        if (media.genres?.length) {
          console.log(`🔄 Translating ${media.genres.length} genres...`);
          const translatedGenres = await Promise.all(
            media.genres.map((genre: string) => translateWithDeepL(genre))
          );
          genresAr = translatedGenres.filter(Boolean);
          console.log("✓ All genres translated successfully");
        }
      } catch (translateErr) {
        console.error("❌ Genre translation failed:", translateErr);
      }

      // Extract author/artist from staff
      const authorEdge = media.staff?.edges?.find((e: any) => e.role === "Story" || e.role === "Story & Art" || e.role === "Original Creator");
      const artistEdge = media.staff?.edges?.find((e: any) => e.role === "Art" || e.role === "Story & Art");

      const startDate = media.startDate;
      const releaseDate = startDate?.year
        ? `${startDate.year}-${String(startDate.month || 1).padStart(2, "0")}-${String(startDate.day || 1).padStart(2, "0")}`
        : "";

      const statusMap: Record<string, string> = {
        RELEASING: "ongoing",
        FINISHED: "completed",
        HIATUS: "hiatus",
        NOT_YET_RELEASED: "ongoing",
        CANCELLED: "completed",
      };

      res.json({
        anilistId: media.id,
        title: media.title?.english || media.title?.romaji || title,
        titleOriginal: media.title?.native || "",
        titleRomaji: media.title?.romaji || "",
        descriptionEn: cleanDesc,
        descriptionAr,
        coverImage: media.coverImage?.extraLarge || media.coverImage?.large || "",
        bannerImage: media.bannerImage || media.coverImage?.extraLarge || "",
        releaseDate,
        status: statusMap[media.status] || "ongoing",
        genresEn: media.genres || [],
        genresAr,
        author: authorEdge?.node?.name?.full || "",
        artist: artistEdge?.node?.name?.full || authorEdge?.node?.name?.full || "",
      });
      
      console.log("✅ Translation complete and data sent to client\n");
    } catch (err: any) {
      console.error("❌ AniList search error:", err.message);
      res.status(500).json({ error: "Failed to fetch from AniList" });
    }
  });

  // --- AUTOMATION ROUTES ---

  // Bulk scrape: download chapters only (no AI), save to uploads + Firestore
  app.post("/api/automation/bulk-scrape", async (req, res) => {
    const { source, contentId, startChapter, endChapter, manhwaId } = req.body;
    
    if (!source || !contentId || !startChapter || !endChapter || !manhwaId) {
      return res.status(400).json({ error: 'Missing required fields: source, contentId, startChapter, endChapter, manhwaId' });
    }

    const start = parseInt(startChapter);
    const end = parseInt(endChapter);
    if (isNaN(start) || isNaN(end) || start <= 0 || end < start) {
      return res.status(400).json({ error: 'Invalid chapter range' });
    }

    const taskId = `bulk_${Date.now()}`;
    activeTasks[taskId] = {
      id: taskId,
      type: 'bulk_scrape',
      status: 'pending',
      logs: [`[SYSTEM]: Starting bulk scrape for ${end - start + 1} chapters...`],
      progress: 0,
    };

    // Run in background
    orchestrator.runBulkScrape(taskId, { source, contentId, startChapter: start, endChapter: end, manhwaId }, activeTasks);

    res.json({ taskId, message: 'Bulk scrape started' });
  });

  app.post("/api/automation/start", async (req, res) => {
    const { type, url, source, name, chapter, contentId, startChapter, endChapter } = req.body;
    const taskId = `task_${Date.now()}`;
    
    activeTasks[taskId] = {
      id: taskId,
      type: type || 'full_pipeline',
      status: 'pending',
      logs: [`[SYSTEM]: Starting ${type || 'full_pipeline'} sequence...`],
      progress: 0
    };

    if (type === 'full_pipeline' || !type) {
      // Run as background task (don't await)
      orchestrator.runFullPipeline(taskId, { url, source, name, chapter, contentId, startChapter, endChapter }, activeTasks);
    } else {
      // Individual tool run (fallback for existing UI)
      // For now, we point them to the orchestrator as well or keep the spawn
      orchestrator.runFullPipeline(taskId, { url, source, name, chapter, contentId, startChapter, endChapter }, activeTasks);
    }

    res.json({ taskId, message: "Task started" });
  });

  app.get("/api/automation/tasks", (_req, res) => {
    const tasks = Object.values(activeTasks).map((task: any) => ({
      id: task.id,
      status: task.status,
      progress: task.progress,
      logs: task.logs.slice(-50),
      chapterLabel: task.chapterLabel,
      images: (task.imagePaths || []).map((p: string) => `/api/automation/image?path=${encodeURIComponent(p)}`),
    }));
    res.json({ tasks });
  });

  app.get("/api/automation/readiness", (_req, res) => {
    const toolsBase = path.join(process.cwd(), 'services', 'automation', 'tools');

    const checkTool = (dirName: string, scriptName: string) => {
      const dirPath = path.join(toolsBase, dirName);
      const scriptPath = path.join(dirPath, scriptName);

      if (!fs.existsSync(dirPath)) {
        return { ready: false, reason: `Missing directory: ${dirName}` };
      }
      if (!fs.existsSync(scriptPath)) {
        return { ready: false, reason: `Missing script: ${dirName}/${scriptName}` };
      }
      return { ready: true, reason: 'ok' };
    };

    const detect = checkTool('text-bpn-plus', 'run_cli.py');
    const translate = checkTool('tseng-scans-ai', 'run_cli.py');

    res.json({
      ready: detect.ready && translate.ready,
      detect,
      translate,
    });
  });

  // Serve scraped image files for preview
  app.get("/api/automation/image", (req, res) => {
    const filePath = req.query.path as string;
    if (!filePath) return res.status(400).send('Missing path');
    const resolved = path.resolve(filePath);
    // Security: must be within the temp directory
    const tempDir = path.join(process.cwd(), 'services', 'automation', 'temp');
    if (!resolved.startsWith(tempDir)) return res.status(403).send('Forbidden');
    res.sendFile(resolved);
  });

  app.post("/api/automation/quick-chapter-upload", upload.fields([
    { name: 'zipFile', maxCount: 1 },
    { name: 'imageFiles', maxCount: 500 }
  ]), async (req, res) => {
    const { manhwaId, chapterNumber: rawChapterNumber, chapterTitle, driveLink, skipStitch } = req.body;
    let chapterNumber = rawChapterNumber;
    if (!manhwaId) {
      return res.status(400).json({ success: false, error: 'Missing manhwaId' });
    }
    // If chapterNumber is missing, auto-infer next available number
    if (!chapterNumber) {
      // Try to get from Firestore first
      try {
        const admin = require('firebase-admin');
        if (!admin.apps.length) {
          admin.initializeApp();
        }
        const db = admin.firestore();
        const chaptersSnap = await db.collection('manhwas').doc(manhwaId).collection('chapters').orderBy('number', 'desc').limit(1).get();
        if (!chaptersSnap.empty) {
          const lastNum = chaptersSnap.docs[0].data().number;
          chapterNumber = String(Number(lastNum) + 1);
        } else {
          chapterNumber = '1';
        }
      } catch (err) {
        // Fallback: check filesystem
        const chaptersDir = path.join(uploadsDir, 'manhwas', manhwaId, 'chapters');
        if (fs.existsSync(chaptersDir)) {
          const dirs = fs.readdirSync(chaptersDir).filter(f => fs.statSync(path.join(chaptersDir, f)).isDirectory() && f.match(/^\d+$/));
          const nums = dirs.map(d => parseInt(d)).filter(n => !isNaN(n));
          const maxNum = nums.length ? Math.max(...nums) : 0;
          chapterNumber = String(maxNum + 1);
        } else {
          chapterNumber = '1';
        }
      }
    }

    try {
      const chapterDir = path.join(uploadsDir, 'manhwas', manhwaId, 'chapters', chapterNumber);
      if (!fs.existsSync(chapterDir)) fs.mkdirSync(chapterDir, { recursive: true });

      let imageUrls: string[] = [];
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

      if (files?.zipFile?.[0]) {
        // Extract ZIP
        const zipFile = files.zipFile[0];
        const zip = new AdmZip(zipFile.path);
        zip.extractAllTo(chapterDir, true);
        fs.unlinkSync(zipFile.path);
        
        // Collect images (including from subdirectories)
        const collectImages = (dir: string): string[] => {
          let results: string[] = [];
          for (const item of fs.readdirSync(dir)) {
            const fullPath = path.join(dir, item);
            if (fs.statSync(fullPath).isDirectory()) {
              results = results.concat(collectImages(fullPath));
            } else if (item.match(/\.(jpg|jpeg|png|webp|gif)$/i) && !item.startsWith('.') && !item.startsWith('__')) {
              results.push(fullPath);
            }
          }
          return results;
        };
        
        const allImages = collectImages(chapterDir).sort((a, b) => {
          const numA = parseInt(path.basename(a).replace(/[^0-9]/g, '') || '0');
          const numB = parseInt(path.basename(b).replace(/[^0-9]/g, '') || '0');
          return numA - numB;
        });
        
        // Move files from subdirectories to root chapter dir and rename sequentially
        allImages.forEach((imgPath, idx) => {
          const ext = path.extname(imgPath);
          const newName = `${String(idx + 1).padStart(3, '0')}${ext}`;
          const newPath = path.join(chapterDir, newName);
          if (imgPath !== newPath) {
            fs.copyFileSync(imgPath, newPath);
          }
        });
        
        // Clean up subdirectories
        for (const item of fs.readdirSync(chapterDir)) {
          const fullPath = path.join(chapterDir, item);
          if (fs.statSync(fullPath).isDirectory()) {
            fs.rmSync(fullPath, { recursive: true, force: true });
          }
        }
        
        const finalFiles = fs.readdirSync(chapterDir)
          .filter(f => f.match(/\.(jpg|jpeg|png|webp|gif)$/i))
          .sort((a, b) => {
            const numA = parseInt(a.replace(/[^0-9]/g, '') || '0');
            const numB = parseInt(b.replace(/[^0-9]/g, '') || '0');
            return numA - numB;
          });
        imageUrls = finalFiles.map(f => `/uploads/manhwas/${manhwaId}/chapters/${chapterNumber}/${f}`);
        
      } else if (files?.imageFiles?.length) {
        // Individual image files
        const sortedFiles = [...files.imageFiles].sort((a, b) => {
          const numA = parseInt(a.originalname.replace(/[^0-9]/g, '') || '0');
          const numB = parseInt(b.originalname.replace(/[^0-9]/g, '') || '0');
          return numA - numB;
        });
        
        sortedFiles.forEach((file, idx) => {
          const ext = path.extname(file.originalname);
          const newName = `${String(idx + 1).padStart(3, '0')}${ext}`;
          const dest = path.join(chapterDir, newName);
          fs.copyFileSync(file.path, dest);
          fs.unlinkSync(file.path);
        });
        
        imageUrls = sortedFiles.map((_, idx) => {
          const ext = path.extname(sortedFiles[idx].originalname);
          return `/uploads/manhwas/${manhwaId}/chapters/${chapterNumber}/${String(idx + 1).padStart(3, '0')}${ext}`;
        });
        
      } else if (driveLink) {
        // Download all images from Google Drive folder
        const savedFiles = await downloadDriveFolder(driveLink, chapterDir);
        imageUrls = savedFiles.map(f => `/uploads/manhwas/${manhwaId}/chapters/${chapterNumber}/${f}`);
      } else {
        return res.status(400).json({ success: false, error: 'No files or drive link provided' });
      }

      // Stitch images vertically into seamless strips (eliminates gaps between pages)
      if (skipStitch !== 'true' && imageUrls.length > 1) {
        try {
          const rawDir = chapterDir;
          const stitchedDir = path.join(chapterDir, '_stitched');
          const stitchedFiles = await stitchVertical(rawDir, stitchedDir, 5, 800, 88);
          
          if (stitchedFiles.length > 0) {
            // Remove original images (keep _stitched folder)
            const origFiles = fs.readdirSync(rawDir).filter(f => 
              f.match(/\.(jpg|jpeg|png|webp|gif|bmp)$/i) && !f.startsWith('.')
            );
            for (const f of origFiles) {
              fs.unlinkSync(path.join(rawDir, f));
            }
            
            // Move stitched files to chapter root
            for (const f of stitchedFiles) {
              fs.renameSync(path.join(stitchedDir, f), path.join(rawDir, f));
            }
            fs.rmSync(stitchedDir, { recursive: true, force: true });
            
            // Update URLs to stitched files
            imageUrls = stitchedFiles.map(f => `/uploads/manhwas/${manhwaId}/chapters/${chapterNumber}/${f}`);
          }
        } catch (stitchErr: any) {
          console.warn('Stitch warning (using original images):', stitchErr.message);
        }
      }

      // Update Firestore via orchestrator
      await orchestrator.finalizeStaffChapter(manhwaId, chapterNumber, imageUrls, {
        logs: [],
        status: 'done',
        progress: 100,
      }, chapterTitle);

      res.json({ success: true, pages: imageUrls.length });
    } catch (err: any) {
      console.error("Quick upload error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Merge chapters endpoint
  app.post("/api/automation/merge-chapters", express.json(), async (req, res) => {
    const { manhwaId, sourceChapters, targetChapterNumber, targetChapterTitle } = req.body;

    if (!manhwaId || !sourceChapters || !Array.isArray(sourceChapters) || sourceChapters.length < 2 || !targetChapterNumber) {
      return res.status(400).json({ success: false, error: 'Need manhwaId, at least 2 sourceChapters, and targetChapterNumber' });
    }

    try {
      const targetDir = path.join(uploadsDir, 'manhwas', manhwaId, 'chapters', String(targetChapterNumber));
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

      let allImages: string[] = [];
      let pageIndex = 1;

      // Sort source chapters numerically
      const sortedSources = [...sourceChapters].sort((a: string, b: string) => parseFloat(a) - parseFloat(b));

      for (const chapterNum of sortedSources) {
        const srcDir = path.join(uploadsDir, 'manhwas', manhwaId, 'chapters', String(chapterNum));
        if (!fs.existsSync(srcDir)) continue;

        const files = fs.readdirSync(srcDir)
          .filter((f: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
          .sort((a: string, b: string) => {
            const numA = parseInt(a.replace(/[^0-9]/g, '') || '0');
            const numB = parseInt(b.replace(/[^0-9]/g, '') || '0');
            return numA - numB;
          });

        for (const file of files) {
          const ext = path.extname(file);
          const newName = `${String(pageIndex).padStart(3, '0')}${ext}`;
          fs.copyFileSync(path.join(srcDir, file), path.join(targetDir, newName));
          allImages.push(`/uploads/manhwas/${manhwaId}/chapters/${targetChapterNumber}/${newName}`);
          pageIndex++;
        }
      }

      if (allImages.length === 0) {
        return res.status(400).json({ success: false, error: 'No images found in source chapters' });
      }

      // Update Firestore with merged chapter
      await orchestrator.finalizeStaffChapter(manhwaId, String(targetChapterNumber), allImages, {
        logs: [],
        status: 'done',
        progress: 100,
      }, targetChapterTitle || `Merged ${sortedSources.join('+')}`);

      res.json({ success: true, pages: allImages.length, merged: sortedSources.length });
    } catch (err: any) {
      console.error("Merge chapters error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Stitch existing chapter images into seamless strips
  app.post("/api/automation/stitch-chapter", express.json(), async (req, res) => {
    const { manhwaId, chapterNumber, groupSize, targetWidth } = req.body;
    if (!manhwaId || !chapterNumber) {
      return res.status(400).json({ success: false, error: 'Missing manhwaId or chapterNumber' });
    }
    try {
      const chapterDir = path.join(uploadsDir, 'manhwas', manhwaId, 'chapters', String(chapterNumber));
      if (!fs.existsSync(chapterDir)) {
        return res.status(404).json({ success: false, error: 'Chapter directory not found' });
      }

      const stitchedDir = path.join(chapterDir, '_stitched');
      const stitchedFiles = await stitchVertical(
        chapterDir, stitchedDir,
        groupSize || 5,
        targetWidth || 800,
        88
      );

      if (stitchedFiles.length === 0) {
        return res.status(400).json({ success: false, error: 'No images found to stitch' });
      }

      // Remove originals, move stitched
      const origFiles = fs.readdirSync(chapterDir).filter(f =>
        f.match(/\.(jpg|jpeg|png|webp|gif|bmp)$/i) && !f.startsWith('.')
      );
      for (const f of origFiles) fs.unlinkSync(path.join(chapterDir, f));
      for (const f of stitchedFiles) fs.renameSync(path.join(stitchedDir, f), path.join(chapterDir, f));
      fs.rmSync(stitchedDir, { recursive: true, force: true });

      const imageUrls = stitchedFiles.map(f => `/uploads/manhwas/${manhwaId}/chapters/${chapterNumber}/${f}`);

      // Update Firestore
      await orchestrator.finalizeStaffChapter(manhwaId, String(chapterNumber), imageUrls, {
        logs: [], status: 'done', progress: 100,
      });

      res.json({ success: true, pages: stitchedFiles.length, stitchedFrom: origFiles.length });
    } catch (err: any) {
      console.error("Stitch chapter error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/automation/staff-publish", upload.single("zipFile"), async (req, res) => {
    const taskId = crypto.randomUUID();
    const { manhwaId, chapterNumber, driveLink } = req.body;
    
    activeTasks[taskId] = {
      id: taskId,
      type: 'staff_publish',
      status: 'pending',
      logs: [`[SYSTEM]: Starting staff publishing for chapter ${chapterNumber}...`],
      progress: 0
    };

    res.json({ taskId, message: "Publishing started" });

    // Processing in background
    setTimeout(async () => {
      try {
        const task = activeTasks[taskId];
        task.status = 'running';
        let imageUrls: string[] = [];

        if (req.file) {
          task.logs.push(`[SYSTEM]: Extracting ZIP file...`);
          task.progress = 20;
          
          const extractPath = path.join(uploadsDir, 'manhwas', manhwaId, 'chapters', chapterNumber);
          if (!fs.existsSync(extractPath)) fs.mkdirSync(extractPath, { recursive: true });
          
          const zip = new AdmZip(req.file.path);
          zip.extractAllTo(extractPath, true);
          fs.unlinkSync(req.file.path); // cleanup
          
          task.progress = 50;
          task.logs.push(`[SYSTEM]: Sorting and preparing images...`);
          
          const files = fs.readdirSync(extractPath);
          const imageFiles = files
            .filter(f => f.match(/\.(jpg|jpeg|png|webp|gif)$/i))
            .sort((a, b) => {
              const numA = parseInt(a.replace(/[^0-9]/g, '') || '0');
              const numB = parseInt(b.replace(/[^0-9]/g, '') || '0');
              return numA - numB;
            });
            
          imageUrls = imageFiles.map(f => `/uploads/manhwas/${manhwaId}/chapters/${chapterNumber}/${f}`);
        } else if (driveLink) {
           task.progress = 10;
           task.logs.push(`[SYSTEM]: Downloading images from Google Drive...`);
           const extractPath = path.join(uploadsDir, 'manhwas', manhwaId, 'chapters', chapterNumber);
           const savedFiles = await downloadDriveFolder(driveLink, extractPath);
           task.progress = 70;
           task.logs.push(`[SYSTEM]: Downloaded ${savedFiles.length} images from Drive.`);
           imageUrls = savedFiles.map(f => `/uploads/manhwas/${manhwaId}/chapters/${chapterNumber}/${f}`);
        }

        task.logs.push(`[SYSTEM]: Initiating Orchestrator database update...`);
        task.progress = 80;
        
        await orchestrator.finalizeStaffChapter(manhwaId, chapterNumber, imageUrls, task);
        
        task.progress = 100;
        task.status = 'done';
        task.logs.push(`[SYSTEM]: Successfully published Chapter ${chapterNumber}!`);

      } catch (err: any) {
        console.error("Staff Publish Error:", err);
        activeTasks[taskId].status = 'error';
        activeTasks[taskId].logs.push(`[ERROR]: ${err.message}`);
      }
    }, 100);
  });

  // Delete user (Firebase Auth) - admin only
  app.delete("/api/users/:uid", async (req, res) => {
    try {
      const { uid } = req.params;
      if (!uid) return res.status(400).json({ error: "uid is required" });
      const { getAuth: getAdminAuth } = await import("firebase-admin/auth");
      const { getApps, initializeApp: initAdminApp } = await import("firebase-admin/app");
      if (!getApps().length) {
        const firebaseConfig = (await import("./firebase-applet-config.json", { with: { type: "json" } })).default;
        initAdminApp({ projectId: firebaseConfig.projectId });
      }
      await getAdminAuth().deleteUser(uid);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Delete user error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // In production, serve the built frontend from 'dist'
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use((_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`API Server running on http://localhost:${PORT}`);
  });
}

startServer();
