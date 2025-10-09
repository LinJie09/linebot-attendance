import express from "express";
import dotenv from "dotenv";
import webhookRouter from "./api/webhook.js";

dotenv.config();
const app = express();
app.use(express.json());

// 將 webhook route 掛上去
app.use(webhookRouter);

// 測試首頁
app.get("/", (req, res) => res.send("✅ Line Bot Server is running"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
