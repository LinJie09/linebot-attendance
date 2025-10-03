import express from "express";
import dotenv from "dotenv";
import webhookHandler from "./api/webhook.js";

dotenv.config();

const app = express();
app.use(express.json());

// LINE Webhook 路徑
app.post("/webhook", webhookHandler);

app.get("/", (req, res) => {
  res.send("✅ Line Bot Server is running");
});

// Render 會自動提供 PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
