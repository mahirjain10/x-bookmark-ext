import mongoose, { Schema, Document, Types } from "mongoose";

const BookmarkSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, required: true },
  url: { type: String, required: true },
  folder: { type: mongoose.Schema.Types.ObjectId, ref: "Folder" },
  createdAt: { type: Date, default: Date.now },
});

const Bookmark = mongoose.model("Bookmark", BookmarkSchema);

export default Bookmark;
