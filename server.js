import express from "express"
import fetch from "node-fetch"
import * as cheerio from "cheerio"
import cors from "cors"

const app = express()

/* ===============================
   CORS — OBRIGATÓRIO PARA BROWSER
================================ */

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}))

// responde qualquer preflight
app.options("*", cors())

app.use(express.json())

/* ===============================
   ROTAS BÁSICAS
================================ */

app.get("/", (req, res) => {
  res.send("🚀 Shopee Video Downloader API is running")
})

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "shopee-video-downloader" })
})

/* ===============================
   ROTA DE DOWNLOAD
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
          "Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36",
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

    $("script").each((_, el) => {
      const content = $(el).html()
      if (!content) return

      const match = content.match(/https?:\/\/[^"'\\]+\.mp4[^"'\\]*/i)
      if (match && !videoUrl) {
        videoUrl = match[0]
      }
    })

    thumbnail = $('meta[property="og:image"]').attr("content") || null
    title = $('meta[property="og:title"]').attr("content") || title

    if (!videoUrl) {
      return res.status(404).json({
        error: "Vídeo não encontrado."
      })
    }

    res.json({
      videoUrl,
      thumbnail,
      title,
      source: "Shopee"
    })

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Erro interno no servidor" })
  }
})

/* ===============================
   START
================================ */

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log("🚀 Servidor rodando na porta", PORT)
})
