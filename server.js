import express from "express"
import cors from "cors"
import fetch from "node-fetch"
import * as cheerio from "cheerio"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import ffmpeg from "fluent-ffmpeg"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

app.use(cors({ origin: "*" }))
app.use(express.json())

/* ===============================
   ROTAS BÁSICAS
================================ */
app.get("/", (req, res) => {
  res.send("API ONLINE")
})

/* ===============================
   FUNÇÃO: BAIXAR ARQUIVO
================================ */
async function downloadFile(url, outputPath) {
  const res = await fetch(url)
  const fileStream = fs.createWriteStream(outputPath)
  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream)
    res.body.on("error", reject)
    fileStream.on("finish", resolve)
  })
}

/* ===============================
   DOWNLOAD + CONVERSÃO
================================ */
app.post("/download", async (req, res) => {
  try {
    const { url } = req.body
    if (!url) {
      return res.status(400).json({ error: "URL é obrigatória" })
    }

    /* ===============================
       BUSCAR MP4 NA PÁGINA
    ================================ */
    const page = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9"
      }
    })

    const html = await page.text()
    const $ = cheerio.load(html)

    let videoUrl = null

    $("script").each((_, el) => {
      const t = $(el).html()
      if (!t) return
      const m = t.match(/https:\/\/[^"'\\]+\.mp4[^"'\\]*/i)
      if (m && m[0].includes("susercontent")) {
        videoUrl = m[0]
      }
    })

    if (!videoUrl) {
      return res.status(404).json({ error: "Vídeo não encontrado" })
    }

    /* ===============================
       CAMINHOS TEMPORÁRIOS
    ================================ */
    const tempDir = path.join(__dirname, "temp")
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir)

    const originalPath = path.join(tempDir, "original.mp4")
    const convertedPath = path.join(tempDir, "converted.mp4")

    /* ===============================
       BAIXAR VÍDEO ORIGINAL
    ================================ */
    await downloadFile(videoUrl, originalPath)

    /* ===============================
       CONVERTER COM FFMPEG
    ================================ */
    await new Promise((resolve, reject) => {
      ffmpeg(originalPath)
        .outputOptions([
          "-c:v libx264",
          "-preset fast",
          "-crf 23",
          "-pix_fmt yuv420p",
          "-c:a aac",
          "-movflags +faststart"
        ])
        .save(convertedPath)
        .on("end", resolve)
        .on("error", reject)
    })

    /* ===============================
       ENVIAR AO USUÁRIO
    ================================ */
    res.download(convertedPath, "video.mp4", () => {
      fs.unlinkSync(originalPath)
      fs.unlinkSync(convertedPath)
    })

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Erro interno no servidor" })
  }
})

/* ===============================
   START
================================ */
const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
  console.log("Servidor rodando na porta", PORT)
})
