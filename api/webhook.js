// api/webhook.js
import mongoose from "mongoose";
import * as line from "@line/bot-sdk";
import { config, handleEvent, client } from "../services/lineBot.js";
import Attendance from "../models/Attendance.js";
import Group from "../models/Group.js";

// MongoDB 連線只初始化一次
let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");
    isConnected = true;
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}

// Serverless Webhook Handler
export default async function handler(req, res) {
  // 只接受 POST
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  // 連接 MongoDB
  await connectDB();

  // 使用 Line middleware 驗證
  const middleware = line.middleware(config);
  middleware(req, res, async () => {
    try {
      const events = req.body.events;
      const results = await Promise.all(events.map(handleEvent));
      res.status(200).json(results);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  });
}

// -------------------------------
// Cron Job 提醒功能（Vercel 上線用 Vercel Cron Job）
export async function attendanceReminder() {
  await connectDB();
  const today = new Date().toISOString().split("T")[0];
  const records = await Attendance.find({ date: today });
  const reportedGroups = records.map(r => r.groupId);

  const allGroups = await Group.find();
  const unreported = allGroups.filter(g => !reportedGroups.includes(g.groupId));

  for (let g of unreported) {
    // 推播給組長和副組長
    await client.pushMessage([g.leaderId, g.viceLeaderId], {
      type: "text",
      text: `⚠️ ${g.name} 今天還沒回報出勤，請盡快輸入 /點名 [人數]`
    });
  }
}
