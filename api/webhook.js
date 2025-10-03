// api/webhook.js
import mongoose from "mongoose";
import * as line from "@line/bot-sdk";
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

// Serverless Webhook Handler
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  // 先快速回應 LINE，避免超時
  res.status(200).send("OK");

  try {
    await connectDB();

    // 使用 LINE middleware 驗證
    const middleware = line.middleware(config);
    middleware(req, res, async () => {
      const events = req.body.events || [];
      events.forEach(async (event) => {
        try {
          await handleEvent(event);
        } catch (err) {
          console.error("handleEvent error:", err);
        }
      });
    });
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

    for (let g of unreported) {
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
