import express from "express"
import cors from "cors"
import fetch from "node-fetch"
import * as cheerio from "cheerio"

const app = express()

/* ===============================
   CORS
================================ */
app.use(cors({ origin: "*" }))
app.use(express.json())

/* ===============================
   ROTAS BÁSICAS
================================ */
app.get("/", (req, res) => {
  res.send("API ONLINE")
})

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" })
})

/* ===============================
   FUNÇÃO: TESTAR SE MP4 EXISTE
================================ */
async function mp4Exists(url) {
  try {
    const r = await fetch(url, { method: "HEAD" })
    return r.ok
  } catch {
    return false
  }
}

/* ===============================
   DOWNLOAD
================================ */
app.post("/download", async (req, res) => {
  try {
    const { url } = req.body

    if (!url) {
      return res.status(400).json({ error: "URL é obrigatória" })
    }

    const page = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9"
      }
    })

    const html = await page.text()
    const $ = cheerio.load(html)

    let watermarked = null

    $("script").each((_, el) => {
      const t = $(el).html()
      if (!t) return

      const m = t.match(/https:\/\/[^"'\\]+\.mp4[^"'\\]*/i)
      if (m && m[0].includes("susercontent")) {
        watermarked = m[0]
      }
    })

    if (!watermarked) {
      return res.status(404).json({ error: "Vídeo não encontrado" })
    }

    const idMatch = watermarked.match(/(br-\d+-[a-z0-9-]+)/i)
    if (!idMatch) {
      return res.status(404).json({ error: "ID do vídeo não encontrado" })
    }

    const videoId = idMatch[1]

    const cleanUrl =
      `https://down-tx-br.vod.susercontent.com/api/v4/11110124/mms/${videoId}.mp4`

    const cleanExists = await mp4Exists(cleanUrl)

    const thumbnail =
      $('meta[property="og:image"]').attr("content") || null

    const title =
      $('meta[property="og:title"]').attr("content") || "Shopee Video"

    return res.json({
      videoUrl: cleanExists ? cleanUrl : watermarked,
      watermark: !cleanExists,
      title,
      thumbnail
    })

  } catch (err) {
    return res.status(500).json({
      error: "Erro interno no servidor"
    })
  }
})

/* ===============================
   START
================================ */
const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
  console.log("Servidor rodando na porta", PORT)
})
