// models/Attendance.js
import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  date: { type: String, required: true },     // 出勤日期 (YYYY-MM-DD)
  groupName: { type: String, required: true },  // 小組代號
  attendees: { type: [String], default: [] }, // 出席成員的 LINE userId
  absentees: { type: [String], default: [] }, // 缺席成員的 LINE userId (可選)
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Attendance", attendanceSchema);
