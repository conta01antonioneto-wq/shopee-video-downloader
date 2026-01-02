import express from "express"
import fetch from "node-fetch"
import * as cheerio from "cheerio"
import cors from "cors"

const app = express()
app.use(cors({ origin: "*" }))
app.use(express.json())

/* ===============================
   ROTAS BÁSICAS
================================ */

app.get("/", (_, res) => {
  res.send("🚀 Shopee Video Downloader API is running")
})

app.get("/api/health", (_, res) => {
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

    // 1️⃣ Carrega página
    const page = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9"
      }
    })

    const html = await page.text()
    const $ = cheerio.load(html)

    let videoId = null
    let videoUrl = null
    let thumbnail = null
    let title = "Shopee Video"
    let watermark = true

    // 2️⃣ Extrai JSON interno
    $("script").each((_, el) => {
      const txt = $(el).html()
      if (!txt) return

      if (txt.includes("video_id")) {
        try {
          const match = txt.match(/"video_id":\s*"?(\d+)"?/)
          if (match) videoId = match[1]
        } catch {}
      }
    })

    // 3️⃣ Se tiver ID → tenta API interna (sem watermark)
    if (videoId) {
      try {
        const api = await fetch(
          `https://sv.shopee.com.br/api/v1/video/${videoId}`,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36"
            }
          }
        )

        if (api.ok) {
          const data = await api.json()
          videoUrl =
            data?.data?.video?.play_url ||
            data?.data?.video?.url ||
            null

          if (videoUrl) watermark = false
          thumbnail = data?.data?.video?.cover
          title = data?.data?.video?.title || title
        }
      } catch {}
    }

    // 4️⃣ Fallback: MP4 direto (com watermark)
    if (!videoUrl) {
      $("script").each((_, el) => {
        const txt = $(el).html()
        if (!txt) return

        const mp4 = txt.match(/https?:\/\/[^"'\\]+\.mp4[^"'\\]*/i)
        if (mp4 && !videoUrl) {
          videoUrl = mp4[0]
          watermark = true
        }
      })
    }

    if (!videoUrl) {
      return res.status(404).json({
        error: "Vídeo não encontrado"
      })
    }

    return res.json({
      videoUrl,
      thumbnail,
      title,
      watermark
    })

  } catch (err) {
    return res.status(500).json({
      error: err.message || "Erro interno"
    })
  }
})

/* ===============================
   START
================================ */

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log("🚀 Servidor rodando na porta", PORT)
})
