import mongoose, { Schema, Document, Types } from "mongoose";

// Interface for Bookmark Document
export interface IBookmark extends Document {
  _id: Types.ObjectId;
  userId: string;
  title: string;
  url: string;
  folder: Types.ObjectId | null;
  createdAt: Date;
}

const BookmarkSchema = new Schema<IBookmark>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    folder: {
      type: Schema.Types.ObjectId,
      ref: "Folder",
      default: null,
      index: true,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  }
);

const Bookmark = mongoose.model<IBookmark>("Bookmark", BookmarkSchema);
export default Bookmark;
