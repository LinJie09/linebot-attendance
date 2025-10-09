import express from "express";
import dotenv from "dotenv";
import * as line from "@line/bot-sdk";
import { config } from "./services/lineBot.js"; // 你的 lineBot 服務
import webhookHandler from "./api/webhook.js";

dotenv.config();

const app = express();
app.use(express.json());

// ✅ 使用你自己寫的 webhookHandler 或直接在這裡處理
app.post("/webhook", line.middleware(config), webhookHandler);

// 測試用首頁
app.get("/", (req, res) => {
  res.send("✅ Line Bot Server is running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});




// import express from "express";
// import dotenv from "dotenv";
// import * as line from "@line/bot-sdk";

// dotenv.config();

// const app = express();
// app.use(express.json()); // ✅ 解析 JSON body

// // LINE SDK config
// const config = {
//   channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
//   channelSecret: process.env.LINE_CHANNEL_SECRET,
// };
// const client = new line.Client(config);

// // Webhook handler
// app.post("/webhook", async (req, res) => {
//   try {
//     console.log("收到 webhook:", req.body);

//     // 先回 200 避免 LINE timeout
//     res.status(200).send("OK");

//     const events = req.body.events || [];
//     for (let event of events) {
//       // 只處理文字訊息
//       if (event.type === "message" && event.message.type === "text") {
//         const replyText = `你剛剛說了: ${event.message.text}`;
//         await client.replyMessage(event.replyToken, {
//           type: "text",
//           text: replyText,
//         });
//       }
//     }
//   } catch (err) {
//     console.error("Webhook 處理錯誤:", err);
//   }
// });

// // 簡單測試
// app.get("/", (req, res) => {
//   res.send("✅ LINE Bot Server 正常運作");
// });

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
// });
