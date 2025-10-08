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

  // 找出使用者的小組
  const userGroup = await Group.findOne({
    $or: [
      { leaderId: userId },
      { viceLeaderId: userId },
      { members: userId }, // 組員也能查詢
    ],
  });

  // 點名（僅限組長/副組長）
  if (text.startsWith("/點名")) {
    const count = parseInt(text.split(" ")[1], 10);
    if (isNaN(count)) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "請輸入人數，例如：/點名 10",
      });
    }

    if (!userGroup || (userGroup.leaderId !== userId && userGroup.viceLeaderId !== userId)) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "⚠️ 你不是組長或副組長，無法回報。",
      });
    }

    await Attendance.create({
      date: today,
      groupId: userGroup.groupId,
      userId,
      count,
    });

    await client.replyMessage(event.replyToken, {
      type: "text",
      text: `✅ ${userGroup.name} 已登記 ${count} 人`,
    });

    const responsibleId = process.env.RESPONSIBLE_PERSON_ID;
    return client.pushMessage(responsibleId, {
      type: "text",
      text: `📌 ${userGroup.name} 今天 ${count} 人`,
    });
  }

  // 查詢自己小組已點名
  if (text.startsWith("/已點名")) {
    if (!userGroup) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "⚠️ 你不屬於任何小組，無法查詢。",
      });
    }

    const date = text.split(" ")[1] || today;
    const record = await Attendance.findOne({
      date,
      groupId: userGroup.groupId,
    });

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: record
        ? `${userGroup.name} ${date} 已點名 ${record.count} 人 ✅`
        : `${userGroup.name} ${date} 尚未點名`,
    });
  }

  // 查詢自己小組未點名
  if (text.startsWith("/未點名")) {
    if (!userGroup) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "⚠️ 你不屬於任何小組，無法查詢。",
      });
    }

    const record = await Attendance.findOne({
      date: today,
      groupId: userGroup.groupId,
    });

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: record
        ? `${userGroup.name} 已完成點名 ✅`
        : `${userGroup.name} 尚未點名 ⚠️`,
    });
  }

  // 查詢自己小組成員
  if (text.startsWith("/查組員")) {
    if (!userGroup) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "⚠️ 你不屬於任何小組，無法查詢。",
      });
    }

    const members = userGroup.members || [];
    const leader = userGroup.leaderId ? `(組長)` : "";
    const viceLeader = userGroup.viceLeaderId ? `(副組長)` : "";

    const result = [
      `👥 小組名稱：${userGroup.name}`,
      `👑 組長：${userGroup.leaderId} ${leader}`,
      `🧑‍🤝‍🧑 副組長：${userGroup.viceLeaderId} ${viceLeader}`,
      `📋 成員：\n${members.length ? members.join("\n") : "（無成員）"}`,
    ].join("\n\n");

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: result,
    });
  }
}

console.log("LINE_CHANNEL_ACCESS_TOKEN:", process.env.LINE_CHANNEL_ACCESS_TOKEN);
console.log("LINE_CHANNEL_SECRET:", process.env.LINE_CHANNEL_SECRET);

export { config, client, handleEvent };
