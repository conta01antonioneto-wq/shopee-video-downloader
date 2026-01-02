import express from "express"
import cors from "cors"
import chromium from "@sparticuz/chromium"
import puppeteer from "puppeteer-core"

const app = express()
app.use(cors())
app.use(express.json())

app.get("/", (req, res) => {
  res.send("🚀 Shopee Video Downloader API is running")
})

app.post("/download", async (req, res) => {
  const { url } = req.body
  if (!url) {
    return res.status(400).json({ error: "URL é obrigatória" })
  }

  let browser

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless
    })

    const page = await browser.newPage()

    await page.setUserAgent(
      "Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36"
    )

    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 })

    const videoUrl = await page.evaluate(() => {
      const video = document.querySelector("video")
      return video ? video.src : null
    })

    if (!videoUrl) {
      throw new Error("Vídeo sem marca d'água não encontrado")
    }

    res.json({
      videoUrl,
      source: "Shopee CDN (clean)"
    })

  } catch (err) {
    res.status(500).json({ error: err.message })
  } finally {
    if (browser) await browser.close()
  }
})

const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
  console.log("🚀 Servidor rodando com Chromium na porta", PORT)
})
