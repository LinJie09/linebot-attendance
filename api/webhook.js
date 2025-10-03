// api/webhook.js
import mongoose from "mongoose";
import crypto from "crypto";
import { config, handleEvent, client } from "../services/lineBot.js";
import Attendance from "../models/Attendance.js";
import Group from "../models/Group.js";
import dotenv from "dotenv";
dotenv.config();

// MongoDB 連線只初始化一次
let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected");
    isConnected = true;
  } catch (err) {
    console.error("MongoDB connection error:", err);
    throw err;
  }
}

// 驗證 LINE 簽名
function verifySignature(req) {
  const signature = req.headers["x-line-signature"];
  const body = JSON.stringify(req.body);
  const hash = crypto
    .createHmac("SHA256", config.channelSecret)
    .update(body)
    .digest("base64");
  return signature === hash;
}

// Serverless Webhook Handler
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  // 立即回 200 避免 LINE webhook 超時
  res.status(200).send("OK");

  try {
    await connectDB();

    // 驗證 LINE 簽名
    if (!verifySignature(req)) {
      console.error("Invalid LINE signature");
      return;
    }

    const events = req.body.events || [];
    for (const event of events) {
      handleEvent(event).catch((err) => console.error("handleEvent error:", err));
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
  }
}

// -------------------------------
// Cron Job 提醒功能（Render Scheduled Task / Vercel Cron Job）
export async function attendanceReminder() {
  try {
    await connectDB();
    const today = new Date().toISOString().split("T")[0];
    const records = await Attendance.find({ date: today });
    const reportedGroups = records.map((r) => r.groupId);

    const allGroups = await Group.find();
    const unreported = allGroups.filter((g) => !reportedGroups.includes(g.groupId));

    for (const g of unreported) {
      try {
        await client.pushMessage([g.leaderId, g.viceLeaderId], {
          type: "text",
          text: `⚠️ ${g.name} 今天還沒回報出勤，請盡快輸入 /點名 [人數]`,
        });
      } catch (err) {
        console.error("PushMessage error:", err);
      }
    }
  } catch (err) {
    console.error("attendanceReminder error:", err);
  }
}
