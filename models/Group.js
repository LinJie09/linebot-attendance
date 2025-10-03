import mongoose from "mongoose";

const groupSchema = new mongoose.Schema({
  groupId: { type: String, required: true },
  name: String,
  leaderId: String,
  viceLeaderId: String,
});

export default mongoose.model("Group", groupSchema);
