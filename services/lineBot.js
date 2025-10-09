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
      { members: userId },
    ],
  });

  // 點名（僅限組長/副組長）
  if (text.startsWith("/點名")) {
    const membersToMark = text.split(" ").slice(1); // 取得點名成員列表
    if (!membersToMark.length) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "請輸入要點名的成員，例如：/點名 Alice Bob Charlie",
      });
    }

    if (!userGroup || (userGroup.leaderId !== userId && userGroup.viceLeaderId !== userId)) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "⚠️ 你不是組長或副組長，無法回報。",
      });
    }

    // 篩選小組內成員
    const validMembers = (userGroup.members || []).filter(m => membersToMark.includes(m));
    if (!validMembers.length) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "⚠️ 沒有有效成員可點名，請確認小組成員名稱。",
      });
    }

    // 建立點名紀錄
    await Attendance.create({
      date: today,
      groupId: userGroup.groupId,
      userId,
      count: validMembers.length,
      attendees: validMembers, // 建議在 Attendance schema 新增 attendees 欄位
    });

    // 使用 LINE Reply 回覆使用者
    await client.replyMessage(event.replyToken, {
      type: "text",
      text: `✅ ${userGroup.name} 點名成功！\n已出席成員: ${validMembers.join(", ")}\n總出席人數: ${validMembers.length}`,
    });

    // 推播給負責人
    const responsibleId = process.env.RESPONSIBLE_PERSON_ID;
    await client.pushMessage(responsibleId, {
      type: "text",
      text: `📌 ${userGroup.name} 今天已點名 ${validMembers.length} 人: ${validMembers.join(", ")}`,
    });
    return;
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
        ? `${userGroup.name} ${date} 已點名 ${record.count} 人 ✅\n成員: ${record.attendees?.join(", ") || ""}`
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
