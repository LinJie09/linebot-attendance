// models/Attendance.js
import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  date: { type: String, required: true },     // 出勤日期
  groupId: { type: String, required: true },  // 小組代號
  userId: { type: String, required: true },   // 成員的 LINE userId
  status: { type: String, enum: ["出席", "缺席"], default: "出席" },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Attendance", attendanceSchema);
