import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SYSTEM_PROMPT = `You are a World-Class Audio Mixing Engineer and Suno AI Prompt Expert. 
Your goal is to transform basic user notes into a highly technical, professional Suno v5.5 script.

DIRECTIONS:
1. STYLE PROMPT (Max 1000 chars): 
   - Expand the user's 'Global Style' into a detailed technical production prompt.
2. SCRIPT PROMPT (Target ~4900-5000 chars):
   - Expand the script to reach approximately 5000 characters.
   - Structure using tags: [Intro], [Verse], [Chorus], [Bridge], [Outro], [Instrumental Break], [Vocal FX].

OUTPUT FORMAT:
Print sections clearly:
---STYLE---
(content)
---SCRIPT---
(content)`;

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // Gemini Optimization Route
  app.post("/api/optimize", async (req, res) => {
    try {
      const { inputs } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY no configurada en el servidor." });
      }

      const ai = new GoogleGenAI(apiKey);
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

      const promptText = `User Inputs:
- Global Style: ${inputs.globalStyle}
- Vocal FX: ${inputs.vocalProcessing}
- Atmospherics: ${inputs.atmospherics}
- Instruments: ${inputs.instrumental}
- Lyrics:
${inputs.lyrics}

Expand these into a long, technical Suno prompt (~5000 chars).`;

      const result = await model.generateContentStream([SYSTEM_PROMPT, promptText]);
      
      res.setHeader('Content-Type', 'text/plain');
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        res.write(chunkText);
      }
      res.end();

    } catch (error: any) {
      console.error("Server AI Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Routes (if needed in future)
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", port: PORT });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        host: '0.0.0.0',
        port: Number(PORT)
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve static files from dist
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`>>> SUNO MASTER SERVER ACTIVE`);
    console.log(`>>> PORT: ${PORT}`);
    console.log(`>>> NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer();
