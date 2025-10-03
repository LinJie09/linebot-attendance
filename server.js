// server.js
import express from "express";
import dotenv from "dotenv";
import webhookHandler from "./api/webhook.js";

dotenv.config();

const app = express();
app.use(express.json());

// 測試首頁
app.get("/", (req, res) => {
  res.send("✅ Line Bot Server is running");
});

// LINE Webhook 路徑
app.post("/webhook", webhookHandler);

// Render 或本地端 PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
