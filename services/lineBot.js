import dotenv from "dotenv";
import * as line from "@line/bot-sdk";
import Attendance from "../models/Attendance.js";
import Group from "../models/Group.js";


dotenv.config();
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);

async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") return;

  const userId = event.source.userId;
  const text = event.message.text.trim();
  const today = new Date().toISOString().split("T")[0];

  // 點名
  if (text.startsWith("/點名")) {
    const count = parseInt(text.split(" ")[1], 10);
    if (isNaN(count)) {
      return client.replyMessage(event.replyToken, { type: "text", text: "請輸入人數，例如：/點名 10" });
    }

    const group = await Group.findOne({ $or: [{ leaderId: userId }, { viceLeaderId: userId }] });
    if (!group) {
      return client.replyMessage(event.replyToken, { type: "text", text: "⚠️ 你不是組長或副組長，無法回報。" });
    }

    await Attendance.create({ date: today, groupId: group.groupId, userId, count });

    await client.replyMessage(event.replyToken, { type: "text", text: `✅ ${group.name} 已登記 ${count} 人` });

    const responsibleId = process.env.RESPONSIBLE_PERSON_ID;
    return client.pushMessage(responsibleId, { type: "text", text: `📌 ${group.name} 今天 ${count} 人` });
  }

  // 查詢已點名
  if (text.startsWith("/已點名")) {
    const date = text.split(" ")[1] || today;
    const records = await Attendance.find({ date });
    const result = records.map(r => `${r.groupId}: ${r.count}人`).join("\n") || "當天尚無點名紀錄";
    return client.replyMessage(event.replyToken, { type: "text", text: result });
  }

  // 查詢未點名
  if (text.startsWith("/未點名")) {
    const records = await Attendance.find({ date: today });
    const reportedGroups = records.map(r => r.groupId);
    const allGroups = (await Group.find()).map(g => g.groupId);
    const unreported = allGroups.filter(g => !reportedGroups.includes(g));
    return client.replyMessage(event.replyToken, { type: "text", text: unreported.length ? `未點名: ${unreported.join(", ")}` : "全部已點名 ✅" });
  }
}


console.log("LINE_CHANNEL_ACCESS_TOKEN:", process.env.LINE_CHANNEL_ACCESS_TOKEN);
console.log("LINE_CHANNEL_SECRET:", process.env.LINE_CHANNEL_SECRET);

export { config, client, handleEvent };
