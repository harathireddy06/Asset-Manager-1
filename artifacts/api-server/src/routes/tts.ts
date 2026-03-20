import { Router } from "express";

const router = Router();

// Proxy for Google Translate TTS so the browser avoids CORS.
// GET /api/tts?text=...&lang=te
router.get("/tts", async (req, res) => {
  const text = req.query["text"];
  const lang = (req.query["lang"] as string) || "te";

  if (!text || typeof text !== "string" || !text.trim()) {
    res.status(400).json({ error: "text query param required" });
    return;
  }

  const url =
    `https://translate.google.com/translate_tts` +
    `?ie=UTF-8&tl=${encodeURIComponent(lang)}&client=tw-ob&q=${encodeURIComponent(text.trim())}`;

  try {
    const upstream = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
          "AppleWebKit/537.36 (KHTML, like Gecko) " +
          "Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://translate.google.com/",
      },
    });

    if (!upstream.ok) {
      res.status(502).json({ error: "TTS upstream error", status: upstream.status });
      return;
    }

    const contentType = upstream.headers.get("content-type") || "audio/mpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");

    const buffer = await upstream.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("[tts] proxy error:", err);
    res.status(500).json({ error: "TTS proxy failed" });
  }
});

export default router;
