import express from "express"
import cors from "cors"
import fetch from "node-fetch"
import * as cheerio from "cheerio"

const app = express()

app.use(cors())
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
   FUNÇÃO: TESTAR URL MP4
================================ */

async function testMp4(url) {
  try {
    const res = await fetch(url, { method: "HEAD" })
    return res.ok
  } catch {
    return false
  }
}

/* ===============================
   ROTA PRINCIPAL
================================ */

app.post("/download", async (req, res) => {
  try {
    const { url } = req.body

    if (!url) {
      return res.status(400).json({ error: "URL é obrigatória" })
    }

    /* ===============================
       1️⃣ BUSCAR HTML DA PÁGINA
    ================================ */

    const pageRes = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9"
      }
    })

    const html = await pageRes.text()
    const $ = cheerio.load(html)

    /* ===============================
       2️⃣ EXTRAIR MP4 COM WATERMARK
    ================================ */

    let watermarkedUrl = null

    $("script").each((_, el) => {
      const text = $(el).html()
      if (!text) return

      const match = text.match(/https:\/\/[^"'\\]+\.mp4[^"'\\]*/i)
      if (match && match[0].includes("susercontent")) {
        watermarkedUrl = match[0]
      }
    })

    if (!watermarkedUrl) {
      return res.status(404).json({
        error: "Não foi possível localizar o vídeo na página"
      })
    }

    /* ===============================
       3️⃣ EXTRAIR ID BASE DO VÍDEO
    ================================ */

    const idMatch = watermarkedUrl.match(
      /(br-\d+-[a-z0-9-]+)/i
    )

    if (!idMatch) {
      return res.status(404).json({
        error: "ID do vídeo não encontrado"
      })
    }

    const videoId = idMatch[1]

    /* ===============================
       4️⃣ TESTAR CDN SEM WATERMARK
    ================================ */

    const cleanUrl =
      `https://down-tx-br.vod.susercontent.com/api/v4/11110124/mms/${videoId}.mp4`

    const exists = await testMp4(cleanUrl)

    const finalUrl = exists ? cleanUrl : watermarkedUrl

    /* ===============================
       5️⃣ META DADOS
    ================================ */

    const thumbnail =
      $('meta[property="og:image"]').attr("content") || null

    const title =
      $('meta[property="og:title"]').attr("content") || "Shopee Video"

    /* ===============================
       6️⃣ RESPOSTA FINAL
    ================================ */

    return res.json({
      videoUrl: finalUrl,
      thumbnail,
      title,
      watermark: !exists ? true : false
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

const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
  console.log("🚀 Servidor rodando na porta", PORT)
})
