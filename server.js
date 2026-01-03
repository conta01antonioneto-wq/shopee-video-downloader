import express from "express"
import cors from "cors"

const app = express()

app.use(cors())
app.use(express.json())

app.get("/", (req, res) => {
  res.send("API ONLINE")
})

app.post("/download", (req, res) => {
  res.json({
    ok: true,
    message: "POST /download FUNCIONANDO",
    body: req.body
  })
})

const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
  console.log("🚀 Servidor rodando na porta", PORT)
})
