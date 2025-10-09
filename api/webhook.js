// api/webhook.js
import mongoose from "mongoose";
import * as line from "@line/bot-sdk";
import { config, handleEvent, client } from "../services/lineBot.js";
import Attendance from "../models/Attendance.js";
import Group from "../models/Group.js";

let isConnected = false;

// MongoDB 只連一次
async function connectDB() {
  if (isConnected) return;
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");
    isConnected = true;
  } catch (err) {
    console.error("MongoDB connection error:", err);
    throw err;
  }
}

// Webhook handler
export default async function handler(req, res) {
  // 僅接受 POST
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  try {
    await connectDB();

    // LINE middleware 驗證簽名
    await new Promise((resolve, reject) => {
      line.middleware(config)(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const events = req.body.events || [];
    if (!events.length) {
      console.log("No events in request body");
      return res.status(200).send("No events");
    }

    // 處理所有事件
    for (const event of events) {
      try {
        await handleEvent(event);
      } catch (err) {
        console.error("handleEvent error:", err);
      }
    }

    // 立即回應 LINE 避免 webhook 超時
    res.status(200).send("OK");
  } catch (err) {
    console.error("Webhook handler error:", err);
    res.status(500).send("Server error");
  }
}

// Cron Job 提醒功能
export async function attendanceReminder() {
  try {
    await connectDB();

    const today = new Date().toISOString().split("T")[0];
    const records = await Attendance.find({ date: today });
    const reportedGroups = records.map(r => r.groupId);

    const allGroups = await Group.find();
    const unreported = allGroups.filter(g => !reportedGroups.includes(g.groupId));

    for (const g of unreported) {
      try {
        const targets = [g.leaderId, g.viceLeaderId].filter(Boolean);
        if (targets.length === 0) continue;

        await client.pushMessage(targets, {
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
