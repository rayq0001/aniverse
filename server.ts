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
async function downloadDriveFolder(driveLink: string, destDir: string, options: {startChapter?: string; endChapter?: string; maxImages?: string} = {}): Promise<string[]> {
  const startIdx = parseInt(options.startChapter || '1') - 1 || 0;
  const endIdx = parseInt(options.endChapter || '999') || 999;
  const maxImages = parseInt(options.maxImages || '0') || Infinity;

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

  // Try Google Drive API first (full pagination support)
  try {
    const { GoogleSyncService } = await import('./services/automation/googleSync');
    const gs = new GoogleSyncService();
    if (await gs.isReady()) {
      console.log(`🌐 Using Drive API pagination for ${folderId} (range: ${startIdx}-${endIdx}, max: ${maxImages})`);
      const downloaded = await gs.downloadFolderFiles(folderId, destDir, {
        skipFiles: startIdx,
        maxFiles: Math.min(maxImages, 1000), // Safety limit
      });
      console.log(`✅ API success: ${downloaded.length} images downloaded`);
      return downloaded;
    }
  } catch (apiErr: any) {
    console.warn(`⚠️ Drive API unavailable (${apiErr.message}) - using HTML fallback (limited)`);
  }


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
  // Apply range limits to files array (HTML fallback limited anyway)
  const limitedFiles = files.slice(startIdx, endIdx).slice(0, maxImages);

  const savedPaths: string[] = [];
  for (let i = 0; i < limitedFiles.length; i++) {
    const file = limitedFiles[i];
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
    
    if (!dlRes.ok) {
      dlRes = await fetch(`https://lh3.googleusercontent.com/d/${file.id}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        redirect: 'follow',
      });
    }
    
    if (!dlRes.ok) {
      dlRes = await fetch(`https://drive.google.com/uc?export=download&id=${file.id}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        redirect: 'follow',
      });
    }
    
    if (!dlRes.ok) {
      console.error(`Failed ${file.name}: ${dlRes.status}`);
      continue;
    }

    fs.writeFileSync(destPath, Buffer.from(await dlRes.arrayBuffer()));
    savedPaths.push(newName);
  }

  console.log(`📥 HTML fallback: ${savedPaths.length}/${limitedFiles.length} images (range ${startIdx + 1}-${Math.min(startIdx + limitedFiles.length, endIdx + 1)})`);
  if (savedPaths.length === 0) throw new Error('No images downloaded from fallback');
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
if (!req.file.mimetype?.startsWith('image/')) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Invalid image file type' });
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

  function getGeminiKey() {
    try {
      const envPath = path.join(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/GEMINI_API_KEY=(.*)/);
        if (match && match[1]) return match[1].trim();
      }
    } catch(e) {}
    return process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "";
  }

  // Initialize Google GenAI dynamically to support hot-swapping keys
  const getAI = () => {
    const apiKey = getGeminiKey();
    if (!apiKey) console.warn("WARNING: GEMINI_API_KEY is not set.");
    return new GoogleGenAI({ apiKey: apiKey || "DUMMY_KEY" });
  };

  // Setup simple persistent caching for AI responses
  const aiCachePath = path.join(process.cwd(), '.ai_cache.json');
  let aiCache: Record<string, string> = {};
  if (fs.existsSync(aiCachePath)) {
    try { aiCache = JSON.parse(fs.readFileSync(aiCachePath, 'utf8')); } catch (e) {}
  }
  const saveAiCache = () => {
    try { fs.writeFileSync(aiCachePath, JSON.stringify(aiCache)); } catch (e) {}
  };
  const getCacheKey = (prefix: string, payload: any) => {
    return prefix + "_" + crypto.createHash('md5').update(JSON.stringify(payload)).digest('hex');
  };

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
              enum: ["home", "bookmarks", "details", "explore"],
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

  // Google Cloud Vision Web Detection (Google Lens backend)
  app.post('/api/search-manga', upload.single('mangaImage'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "الرجاء رفع صورة اللقطة." });
      }

      // Read the uploaded file from disk and convert to base64
      const fileBuffer = fs.readFileSync(req.file.path);
      const base64Image = fileBuffer.toString('base64');

      // Clean up temp file immediately
      try { fs.unlinkSync(req.file.path); } catch {}

      // Call Google Cloud Vision API via REST
      let visionResponse;
      const keyFilePath = path.join(process.cwd(), 'aniverse-leans.json');
      
      if (fs.existsSync(keyFilePath)) {
        const { GoogleAuth } = await import('google-auth-library');
        const auth = new GoogleAuth({
          keyFile: keyFilePath,
          scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/cloud-vision'],
        });
        const client = await auth.getClient();
        const tokenInfo = await client.getAccessToken() as any;
        const accessToken = tokenInfo.token || tokenInfo;
        
        const visionUrl = `https://vision.googleapis.com/v1/images:annotate`;
        visionResponse = await fetch(visionUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}` 
          },
          body: JSON.stringify({
            requests: [{
              image: { content: base64Image },
              features: [{ type: 'WEB_DETECTION', maxResults: 10 }]
            }]
          })
        });
      } else {
        const visionApiKey = getGeminiKey(); // Fallback to API Key
        const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${visionApiKey}`;

        visionResponse = await fetch(visionUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [{
              image: { content: base64Image },
              features: [{ type: 'WEB_DETECTION', maxResults: 10 }]
            }]
          })
        });
      }

      if (!visionResponse.ok) {
        const errText = await visionResponse.text();
        console.error("Vision API HTTP Error:", visionResponse.status, errText);
        throw new Error(`Vision API Error: ${visionResponse.status}`);
      }

      const visionData = await visionResponse.json();
      const webDetection = visionData.responses?.[0]?.webDetection;

      if (!webDetection) {
        return res.status(404).json({ message: "لم يتمكن جوجل من تحليل الصورة." });
      }

      const entities = webDetection.webEntities || [];
      const matchingPages = webDetection.pagesWithMatchingImages || [];
      const visuallySimilar = webDetection.visuallySimilarImages || [];
      const bestGuessLabels = webDetection.bestGuessLabels || [];

      console.log(`🔍 Vision Web Detection: ${entities.length} entities, ${matchingPages.length} pages, bestGuess: ${bestGuessLabels.map((l: any) => l.label).join(', ')}`);

      if (entities.length === 0 && matchingPages.length === 0 && bestGuessLabels.length === 0) {
        return res.status(404).json({ message: "لم يتم العثور على أي نتائج متطابقة." });
      }

      // Extract best title from entities or bestGuessLabels
      let detectedTitle = '';
      if (bestGuessLabels.length > 0) {
        detectedTitle = bestGuessLabels[0].label || '';
      }
      if (!detectedTitle && entities.length > 0) {
        detectedTitle = entities[0].description || '';
      }

      // Extract chapter number from matching pages using regex
      let detectedChapter = '';
      const chapterRegex = /(?:chapter|ch\.?|الفصل|فصل)\s*(\d+)/i;
      for (const page of matchingPages) {
        const match = (page.pageTitle || '').match(chapterRegex);
        if (match) {
          detectedChapter = match[1];
          break;
        }
      }

      // Build results for frontend (compatible with existing modal)
      const allEntities = entities
        .filter((e: any) => e.description && e.score > 0.3)
        .slice(0, 8)
        .map((e: any) => ({
          title: e.description,
          similarity: Math.round((e.score || 0) * 100),
          thumbnail: '',
          chapter: '',
        }));

      const suggestedPages = matchingPages.slice(0, 5).map((p: any) => ({
        pageTitle: p.pageTitle || '',
        url: p.url || '',
      }));

      // Build similarity score from best entity
      const topScore = entities[0]?.score ? Math.round(entities[0].score * 100) : 
                       (matchingPages.length > 0 ? 85 : 50);

      res.json({
        success: true,
        similarity: topScore,
        mangaTitle: detectedTitle,
        chapter: detectedChapter,
        author: '',
        thumbnail: visuallySimilar[0]?.url || '',
        extUrls: suggestedPages.slice(0, 3).map((p: any) => p.url).filter(Boolean),
        allResults: allEntities,
        suggestedPages: suggestedPages,
        bestGuessLabels: bestGuessLabels.map((l: any) => l.label),
      });
    } catch (error: any) {
      console.error("Google Vision API Error:", error.message);
      if (req.file?.path) try { fs.unlinkSync(req.file.path); } catch {}
      res.status(500).json({ error: "حدث خطأ أثناء تحليل الصورة بواسطة Google Vision." });
    }
  });

  app.post("/api/translate", async (req, res) => {
    try {
      const { text, targetLanguage = "Arabic" } = req.body;
      const ai = getAI();
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

      const ai = getAI();
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
      const ai = getAI();
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
      
      const cacheKey = getCacheKey('manhwa', { title, description, language });
      if (aiCache[cacheKey]) {
        console.log(`⚡ Serving cached analysis for manhwa: ${title}`);
        return res.json({ text: aiCache[cacheKey] });
      }

      const prompt = language === "ar"
        ? `تحليل عميق لمانهوا "${title}":\nالوصف: ${description}`
        : `Deep analysis of "${title}":\nDescription: ${description}`;

      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const responseText = response.text || (language === "ar" ? "حدث خطأ" : "Error");
      if (response.text) {
        aiCache[cacheKey] = response.text;
        saveAiCache();
      }
      
      res.json({ text: responseText });
    } catch (err: any) {
      console.error("Analyze Manhwa error:", err.message);
      res.status(500).json({ text: req.body.language === "ar" ? "حدث خطأ" : "Error" });
    }
  });

  app.post("/api/analyze-chapter", async (req, res) => {
    try {
      const { title, chapterNumber, language = "ar" } = req.body;
      
      const cacheKey = getCacheKey('chapter', { title, chapterNumber, language });
      if (aiCache[cacheKey]) {
        console.log(`⚡ Serving cached summary for chapter ${chapterNumber} of ${title}`);
        return res.json({ text: aiCache[cacheKey] });
      }

      const prompt = language === "ar"
        ? `ملخص الفصل ${chapterNumber} من "${title}" بدون حرق`
        : `Chapter ${chapterNumber} summary of "${title}"`;

      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const responseText = response.text || "حدث خطأ";
      if (response.text) {
        aiCache[cacheKey] = response.text;
        saveAiCache();
      }

      res.json({ text: responseText });
    } catch (err: any) {
      console.error("Analyze Chapter error:", err.message);
      res.status(500).json({ text: "حدث خطأ" });
    }
  });

  app.post("/api/explain-page", async (req, res) => {
    try {
      const { imageBase64, language = "ar" } = req.body;
      
      // Hash the base64 string to avoid massive cache keys
      const imageHash = crypto.createHash('md5').update(imageBase64 || '').digest('hex');
      const cacheKey = getCacheKey('page', { imageHash, language });
      if (aiCache[cacheKey]) {
        console.log(`⚡ Serving cached page explanation`);
        return res.json({ text: aiCache[cacheKey] });
      }

      const imagePart = {
        inlineData: { mimeType: "image/jpeg", data: imageBase64 },
      };
      const textPart = {
        text: language === "ar" ? "اشرح هذه الصفحة" : "Explain this page",
      };

      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: [imagePart, textPart] },
      });

      const responseText = response.text || "حدث خطأ";
      if (response.text) {
        aiCache[cacheKey] = response.text;
        saveAiCache();
      }

      res.json({ text: responseText });
    } catch (err: any) {
      console.error("Explain Page error:", err.message);
      res.status(500).json({ text: "حدث خطأ" });
    }
  });

  app.post("/api/find-matching", async (req, res) => {
    try {
      const { base64, mimeType, list = [] } = req.body;
      const ai = getAI();
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

  // --- AUTH MIDDLEWARE ---
  async function verifyAdminMiddleware(req: any, res: any, next: any) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Missing token' });
      }
      const token = authHeader.split(' ')[1];

      const { getAuth: getAdminAuth } = await import("firebase-admin/auth");
      const { getApps, initializeApp: initAdminApp } = await import("firebase-admin/app");

      if (!getApps().length) {
        const firebaseConfig = (await import("./firebase-applet-config.json", { with: { type: "json" } })).default;
        initAdminApp({ projectId: firebaseConfig.projectId });
      }

      const decodedToken = await getAdminAuth().verifyIdToken(token);
      
      // Allow me.rayq0001@gmail.com by default
      if (decodedToken.email === 'me.rayq0001@gmail.com') {
        req.user = decodedToken;
        return next();
      }

      // Otherwise, check Firestore for user role
      const { getFirestore } = await import('firebase-admin/firestore');
      const db = getFirestore();
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();
      
      if (!userDoc.exists) {
        return res.status(403).json({ success: false, error: 'Forbidden: User document not found' });
      }

      const userData = userDoc.data();
      const allowedRoles = ['founder', 'admin', 'staff', 'staff_plus', 'moderator', 'analyst'];
      if (userData && allowedRoles.includes(userData.role)) {
        req.user = decodedToken;
        return next();
      }

      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient privileges' });
    } catch (err: any) {
      return res.status(403).json({ success: false, error: `Forbidden: Auth verification failed - ${err.message}` });
    }
  }

  // --- AUTOMATION ROUTES ---

  // Bulk scrape: download chapters only (no AI), save to uploads + Firestore
  app.post("/api/automation/bulk-scrape", verifyAdminMiddleware, async (req, res) => {
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

  app.post("/api/automation/start", verifyAdminMiddleware, async (req, res) => {
    const { type, url, source, name, chapter, contentId, startChapter, endChapter, options } = req.body;
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
      orchestrator.runFullPipeline(taskId, { url, source, name, chapter, contentId, startChapter, endChapter, options }, activeTasks);
    } else {
      // Individual tool run (fallback for existing UI)
      // For now, we point them to the orchestrator as well or keep the spawn
      orchestrator.runFullPipeline(taskId, { url, source, name, chapter, contentId, startChapter, endChapter, options }, activeTasks);
    }

    res.json({ taskId, message: "Task started" });
  });

  app.get("/api/automation/tasks", verifyAdminMiddleware, (_req, res) => {
    const tasks = Object.values(activeTasks).map((task: any) => ({
      id: task.id,
      status: task.status,
      progress: task.progress,
      logs: task.logs.slice(-50),
      chapterLabel: task.chapterLabel,
      driveLinks: task.driveLinks,
      hasRawPath: !!task.rawPath,
      hasTranslatedPath: !!task.translatedPath,
      images: (task.imagePaths || []).map((p: string) => `/api/automation/image?path=${encodeURIComponent(p)}`),
    }));
    res.json({ tasks });
  });

  app.get("/api/automation/download/:taskId/:type", verifyAdminMiddleware, (req, res) => {
    const { taskId, type } = req.params;
    const task = activeTasks[taskId];
    if (!task) return res.status(404).send('Task not found');
    
    const dirPath = type === 'raw' ? task.rawPath : task.translatedPath;
    if (!dirPath || !fs.existsSync(dirPath)) return res.status(404).send('Directory not found');
    
    try {
      const AdmZip = require('adm-zip');
      const zip = new AdmZip();
      zip.addLocalFolder(dirPath);
      
      const zipBuffer = zip.toBuffer();
      res.set('Content-Type', 'application/zip');
      res.set('Content-Disposition', `attachment; filename=${task.chapterLabel || 'chapter'}-${type}.zip`);
      res.send(zipBuffer);
    } catch (err: any) {
      console.error("Failed to create ZIP:", err);
      res.status(500).send("Failed to create ZIP");
    }
  });

  app.get("/api/automation/readiness", verifyAdminMiddleware, (_req, res) => {
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

  app.post("/api/automation/quick-chapter-upload", verifyAdminMiddleware, upload.fields([
    { name: 'zipFile', maxCount: 1 },
    { name: 'imageFiles', maxCount: 500 }
  ]), async (req, res) => {
const { manhwaId, chapterNumber: rawChapterNumber, startChapter, endChapter, chapterTitle, driveLink, skipStitch } = req.body;
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

// Enhanced Firestore chapter update/overwrite
      try {
        console.log(`📁 Saving chapter ${chapterNumber} with ${imageUrls.length} images for manhwa ${manhwaId}`);
        
        // Check if chapter exists (Firestore)
        const admin = await import('firebase-admin');
        if (!admin.apps.length) {
          const firebaseConfig = (await import('./firebase-applet-config.json')).default;
          admin.initializeApp({ projectId: firebaseConfig.projectId });
        }
        const db = admin.firestore();
        const chapterRef = db.collection(`manhwas/${manhwaId}/chapters`).doc(chapterNumber);
        const chapterSnap = await chapterRef.get();
        
        const chapterData: any = {
          number: parseFloat(chapterNumber),
          images: imageUrls,
          views: chapterSnap.exists ? (chapterSnap.data()?.views || 0) : 0, // Preserve views
          releaseDate: new Date().toISOString(),
          createdAt: chapterSnap.exists ? (chapterSnap.data()?.createdAt || new Date().toISOString()) : new Date().toISOString()
        };
        if (chapterTitle) chapterData.title = chapterTitle;
        if (chapterSnap.exists) chapterData.updatedAt = new Date().toISOString();
        
        await chapterRef.set(chapterData); // Overwrite/update
        
        console.log(`✅ Chapter ${chapterNumber} saved/overwritten successfully`);
      } catch (dbErr: any) {
        console.error("Firestore save failed:", dbErr.message);
        console.warn("Chapter uploaded to filesystem but DB save failed:", dbErr.message);
        // Don't fail the upload - filesystem images are there
      }

      res.json({ success: true, pages: imageUrls.length, images: imageUrls });
    } catch (err: any) {
      console.error("Quick upload error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Merge chapters endpoint
  app.post("/api/automation/merge-chapters", verifyAdminMiddleware, express.json(), async (req, res) => {
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
  app.post("/api/automation/stitch-chapter", verifyAdminMiddleware, express.json(), async (req, res) => {
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

  // Save typesetting canvas page
  app.post("/api/automation/save-typeset-page", verifyAdminMiddleware, express.json({ limit: '50mb' }), async (req, res) => {
    const { manhwaId, chapterNumber, pageName, imageData } = req.body;
    if (!manhwaId || !chapterNumber || !pageName || !imageData) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    try {
      // Decode Base64 image
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');

      // The path to save the file
      const targetDir = path.join(uploadsDir, 'manhwas', manhwaId, 'chapters', String(chapterNumber));
      if (!fs.existsSync(targetDir)) {
        return res.status(404).json({ success: false, error: 'Chapter directory not found' });
      }

      const filePath = path.join(targetDir, pageName);
      fs.writeFileSync(filePath, buffer);

      console.log(`[Typesetting]: Saved edited page: ${filePath}`);
      res.json({ success: true, message: 'Page saved successfully' });
    } catch (err: any) {
      console.error("[Typesetting Error]:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Detect and translate text boxes on a page using Gemini
  app.post("/api/automation/detect-text-boxes", verifyAdminMiddleware, express.json(), async (req, res) => {
    const { manhwaId, chapterNumber, pageName } = req.body;
    if (!manhwaId || !chapterNumber || !pageName) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    try {
      const filePath = path.join(uploadsDir, 'manhwas', manhwaId, 'chapters', String(chapterNumber), pageName);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, error: 'Page file not found' });
      }

      const mimeType = filePath.endsWith('.png') ? 'image/png' : filePath.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
      const base64Data = fs.readFileSync(filePath).toString('base64');

      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            inlineData: {
              mimeType,
              data: base64Data
            }
          },
          'Detect all dialogue speech bubbles and text blocks in this comic/manhwa page. Provide coordinates as normalized integers from 0 to 1000 (where 0 is top/left, 1000 is bottom/right), extract the original text, and translate it to clean Arabic.'
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              boxes: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    yMin: { type: 'INTEGER' },
                    xMin: { type: 'INTEGER' },
                    yMax: { type: 'INTEGER' },
                    xMax: { type: 'INTEGER' },
                    text: { type: 'STRING' },
                    translation: { type: 'STRING' }
                  },
                  required: ['yMin', 'xMin', 'yMax', 'xMax', 'text', 'translation']
                }
              }
            },
            required: ['boxes']
          }
        }
      });

      const resultText = response.text;
      if (!resultText) {
        return res.status(500).json({ success: false, error: 'Empty response from Gemini' });
      }

      const data = JSON.parse(resultText);
      res.json({ success: true, boxes: data.boxes || [] });
    } catch (err: any) {
      console.error("[Typeset Detect Error]:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/automation/staff-publish", verifyAdminMiddleware, upload.single("zipFile"), async (req, res) => {
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
  app.delete("/api/users/:uid", verifyAdminMiddleware, async (req, res) => {
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
