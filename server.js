// server.local.js
import express from "express";
import mongoose from "mongoose";
import * as line from "@line/bot-sdk";
import dotenv from "dotenv";

import { config, handleEvent, client } from "./services/lineBot.js";
import Attendance from "./models/Attendance.js";
import Group from "./models/Group.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------
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

// ---------------------------
// LINE Webhook
app.use(express.json());
app.post("/webhook", line.middleware(config), async (req, res) => {
  // 先快速回應 LINE，避免 webhook timeout
  res.status(200).send("OK");

  try {
    await connectDB();
    const events = req.body.events;
    events.forEach(async (event) => {
      try {
        await handleEvent(event);
      } catch (err) {
        console.error("handleEvent error:", err);
      }
    });
  } catch (err) {
    console.error("Webhook handler error:", err);
  }
});

// ---------------------------
// 出勤提醒功能（可用 Render Scheduled Task 呼叫）
export async function attendanceReminder() {
  await connectDB();
  const today = new Date().toISOString().split("T")[0];
  const records = await Attendance.find({ date: today });
  const reportedGroups = records.map(r => r.groupId);

  const allGroups = await Group.find();
  const unreported = allGroups.filter(g => !reportedGroups.includes(g.groupId));

  for (let g of unreported) {
    try {
      await client.pushMessage([g.leaderId, g.viceLeaderId], {
        type: "text",
        text: `⚠️ ${g.name} 今天還沒回報出勤，請盡快輸入 /點名 [人數]`
      });
    } catch (err) {
      console.error("PushMessage error:", err);
    }
  }
}

// ---------------------------
// 啟動 Express Server
app.listen(PORT, async () => {
  await connectDB();
  console.log(`🚀 Server running on port ${PORT}`);
});
