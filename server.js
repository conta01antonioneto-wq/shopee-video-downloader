import express from "express"
import cors from "cors"
import puppeteer from "puppeteer-core"

const app = express()

/* ===============================
   CONFIG BÁSICA
================================ */

app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}))

app.use(express.json())

/* ===============================
   ROTAS DE STATUS
================================ */

app.get("/", (req, res) => {
  res.send("🚀 Shopee Video Downloader API (Puppeteer) is running")
})

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", engine: "puppeteer" })
})

/* ===============================
   ROTA PRINCIPAL (SEM WATERMARK)
================================ */

app.post("/download", async (req, res) => {
  const { url } = req.body

  if (!url) {
    return res.status(400).json({ error: "URL é obrigatória" })
  }

  let browser = null

  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu"
      ],
      executablePath: process.env.CHROME_PATH || undefined
    })

    const page = await browser.newPage()

    await page.setUserAgent(
      "Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36"
    )

    let videoUrl = null

    page.on("request", (req) => {
      const rurl = req.url()

      if (
        rurl.includes(".mp4") ||
        rurl.includes(".m3u8")
      ) {
        if (!videoUrl) {
          videoUrl = rurl
        }
      }
    })

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000
    })

    // espera o player carregar
    await page.waitForTimeout(8000)

    if (!videoUrl) {
      throw new Error("Não foi possível capturar o vídeo original")
    }

    return res.json({
      videoUrl,
      source: "Shopee (original)",
      watermark: false
    })

  } catch (err) {
    return res.status(500).json({
      error: err.message || "Erro ao processar vídeo"
    })
  } finally {
    if (browser) await browser.close()
  }
})

/* ===============================
   START SERVER
================================ */

const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
  console.log("🚀 Servidor Puppeteer rodando na porta", PORT)
})
