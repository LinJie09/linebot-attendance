import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  date: { type: String, required: true },
  groupId: { type: String, required: true },
  userId: String,
  count: Number,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Attendance", attendanceSchema);
