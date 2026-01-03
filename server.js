import express from "express"
import cors from "cors"

const app = express()

// CORS liberado (teste)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}))

app.use(express.json())

/* ===============================
   ROTAS DE TESTE
================================ */

app.get("/", (req, res) => {
  res.send("🚀 Shopee Video Downloader API is running")
})

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" })
})

/* ===============================
   START SERVER
================================ */

const PORT = process.env.PORT || 8080

app.listen(PORT, () => {
  console.log("🚀 Servidor rodando na porta", PORT)
})
