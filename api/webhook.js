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

// Webhook handler
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  // 先快速回應 LINE
  res.status(200).send("OK");

  try {
    await connectDB();

    // 使用 middleware 解析 body
    line.middleware(config)(req, res, async () => {
      const events = req.body?.events || [];
      for (let event of events) {
        try {
          await handleEvent(event);
        } catch (err) {
          console.error("handleEvent error:", err);
        }
      }
    });
  } catch (err) {
    console.error("Webhook handler error:", err);
  }
}

// Cron Job 提醒功能
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
