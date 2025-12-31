import express from "express"
import fetch from "node-fetch"
import cheerio from "cheerio"

const app = express()
app.use(express.json())

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
      throw new Error("Shopee bloqueou o acesso")
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    let videoUrl = null
    let thumbnail = null
    let title = "Shopee Video"

    $("script").each((_, el) => {
      const content = $(el).html()
      if (!content) return

      if (content.includes("videoInfo")) {
        try {
          const jsonMatch = content.match(/{.*}/s)
          if (!jsonMatch) return

          const data = JSON.parse(jsonMatch[0])

          videoUrl =
            data?.videoInfo?.videoUrl ||
            data?.videoInfo?.playUrl ||
            data?.videoInfo?.video?.url

          thumbnail = data?.videoInfo?.cover
          title = data?.videoInfo?.title || title
        } catch {}
      }
    })

    if (!videoUrl) {
      return res.status(404).json({
        error: "Vídeo não encontrado. A Shopee pode exigir o app."
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
      error: err.message || "Erro interno"
    })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log("🚀 Servidor rodando na porta", PORT)
})
