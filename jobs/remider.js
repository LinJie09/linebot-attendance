import cron from "node-cron";
import Attendance from "../models/Attendance.js";
import Group from "../models/Group.js";
import { client } from "../services/lineBot.js";

cron.schedule("0 21 * * *", async () => {
  const today = new Date().toISOString().split("T")[0];
  const records = await Attendance.find({ date: today });
  const reportedGroups = records.map(r => r.groupId);

  const allGroups = await Group.find();
  const unreported = allGroups.filter(g => !reportedGroups.includes(g.groupId));

  for (let g of unreported) {
    await client.pushMessage([g.leaderId, g.viceLeaderId], {
      type: "text",
      text: `⚠️ ${g.name} 今天還沒回報出勤，請盡快輸入 /點名 [人數]`
    });
  }
});
