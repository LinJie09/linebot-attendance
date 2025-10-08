// models/Group.js
import mongoose from "mongoose";

const memberSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // LINE userId
  name: { type: String, required: true },   // 姓名
  role: {                                   // 身份別
    type: String,
    enum: ["組長", "副組長", "組員"],
    required: true
  }
});

const groupSchema = new mongoose.Schema({
  groupId: { type: String, required: true }, // 小組代號
  name: { type: String, required: true },    // 小組名稱
  members: [memberSchema]                    // 小組成員（含組長/副組長/組員）
});

export default mongoose.model("Group", groupSchema);
