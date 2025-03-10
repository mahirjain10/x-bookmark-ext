import mongoose, { Schema, Document, Types } from "mongoose";
import { IFolder } from "./FolderSchema";

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
      ref: "User",
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
      validate: {
        validator: async function(folderId: Types.ObjectId | null) {
          if (!folderId) return true;
          const folder = await mongoose.model<IFolder>("Folder").findById(folderId);
          return folder?.userId === this.userId;
        },
        message: "Folder must belong to the same user"
      }
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    }
  }
);

// Compound index for faster queries
BookmarkSchema.index({ userId: 1, folder: 1 });

const Bookmark = mongoose.model<IBookmark>("Bookmark", BookmarkSchema);
export default Bookmark;
