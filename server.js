import express from "express"
import cors from "cors"

const app = express()

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}))
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
   FUNÇÃO AUXILIAR
================================ */

function extractVideoCode(url) {
  const match = url.match(/share-video\/([^?]+)/)
  return match ? match[1] : null
}

/* ===============================
   ROTA PRINCIPAL (SEM WATERMARK)
================================ */

app.post("/download", async (req, res) => {
  try {
    const { url } = req.body

    if (!url) {
      return res.status(400).json({ error: "URL é obrigatória" })
    }

    const videoCode = extractVideoCode(url)

    if (!videoCode) {
      return res.status(400).json({ error: "Link inválido da Shopee Video" })
    }

    const apiUrl =
      `https://sv.shopee.com.br/api/v4/video/get?video_code=${videoCode}`

    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Mobile Safari/537.36",
        "Accept": "application/json",
        "Accept-Language": "pt-BR,pt;q=0.9"
      }
    })

    if (!response.ok) {
      return res.status(403).json({
        error: "A Shopee bloqueou o acesso à API"
      })
    }

    const json = await response.json()
    const video = json?.data?.video

    if (!video?.play_url) {
      return res.status(404).json({
        error: "Vídeo não encontrado na API da Shopee"
      })
    }

    return res.json({
      videoUrl: video.play_url,
      thumbnail: video.cover,
      title: video.title || "Shopee Video",
      author: video.author?.username || "Shopee",
      duration: video.duration,
      source: "Shopee API"
    })

  } catch (err) {
    console.error(err)
    return res.status(500).json({
      error: "Erro interno ao processar o vídeo"
    })
  }
})

/* ===============================
   START SERVER
================================ */

const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
  console.log("🚀 Servidor rodando na porta", PORT)
})
