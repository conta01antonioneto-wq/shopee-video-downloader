import express from "express"
import fetch from "node-fetch"
import * as cheerio from "cheerio"

const app = express()
app.use(express.json())

/* ===============================
   ROTAS BÁSICAS (OBRIGATÓRIAS)
================================ */

app.get("/", (req, res) => {
  res.send("🚀 Shopee Video Downloader API is running")
})

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "shopee-video-downloader" })
})

/* ===============================
   ROTA PRINCIPAL DE DOWNLOAD
================================ */

app.post("/download", async (req, res) => {
  try {
    const { url } = req.body

    if (!url) {
      return res.status(400).json({ error: "URL é obrigatória" })
    }

    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9"
      }
    })

    if (!response.ok) {
      return res.status(403).json({
        error: "A Shopee bloqueou o acesso ou o link é inválido"
      })
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    let videoUrl = null
    let thumbnail = null
    let title = "Shopee Video"

    /* ===============================
       EXTRAÇÃO VIA <script>
    ================================ */

    $("script").each((_, el) => {
      const content = $(el).html()
      if (!content) return

      // tentativa 1: JSON embutido
      if (content.includes("video")) {
        const mp4Match = content.match(/https?:\/\/[^"'\\]+\.mp4[^"'\\]*/i)
        if (mp4Match && !videoUrl) {
          videoUrl = mp4Match[0]
        }
      }
    })

    /* ===============================
       FALLBACK: META TAGS
    ================================ */

    const ogImage = $('meta[property="og:image"]').attr("content")
    if (ogImage) thumbnail = ogImage

    const ogTitle = $('meta[property="og:title"]').attr("content")
    if (ogTitle) title = ogTitle

    if (!videoUrl) {
      return res.status(404).json({
        error:
          "Vídeo não encontrado. A Shopee pode exigir acesso exclusivo via app."
      })
    }

    return res.json({
      videoUrl,
      thumbnail,
      title,
      source: "Shopee"
    })

  } catch (err) {
    return res.status(500).json({
      error: err.message || "Erro interno no servidor"
    })
  }
})

/* ===============================
   START SERVER
================================ */

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log("🚀 Servidor rodando na porta", PORT)
})
