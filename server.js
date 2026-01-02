import express from "express"
import cors from "cors"
import puppeteer from "puppeteer"

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
   ROTA DE DOWNLOAD (PUPPETEER)
================================ */

app.post("/download", async (req, res) => {
  const { url } = req.body

  if (!url) {
    return res.status(400).json({ error: "URL é obrigatória" })
  }

  let browser

  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process"
      ]
    })

    const page = await browser.newPage()

    // Simula celular (Shopee libera vídeo limpo assim)
    await page.setUserAgent(
      "Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36"
    )

    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 })

    // Captura requisições de vídeo
    const videoUrl = await page.evaluate(() => {
      const videos = Array.from(document.querySelectorAll("video"))
      if (videos.length > 0 && videos[0].src) {
        return videos[0].src
      }
      return null
    })

    if (!videoUrl) {
      throw new Error("Vídeo sem marca d'água não encontrado")
    }

    return res.json({
      videoUrl,
      source: "Shopee CDN"
    })

  } catch (err) {
    return res.status(500).json({
      error: err.message
    })
  } finally {
    if (browser) await browser.close()
  }
})

/* ===============================
   START SERVER (OBRIGATÓRIO)
================================ */

const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
  console.log("🚀 Servidor Puppeteer rodando na porta", PORT)
})
