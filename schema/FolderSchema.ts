import mongoose, { Schema, Document, Types } from "mongoose";

export interface IFolder extends Document {
  _id: Types.ObjectId;
  userId: string;
  name: string;
  isParentRoot: boolean;
  parentFolder: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const FolderSchema = new Schema<IFolder>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    isParentRoot: {
      type: Boolean,
      required: true,
      default: false,
    },
    parentFolder: {
      type: Schema.Types.ObjectId,
      ref: "Folder",
      default: null,
      index: true,
      required: function (this: IFolder) {
        return !this.isParentRoot;
      },
    },
  },
  { timestamps: true }
);

const Folder = mongoose.model<IFolder>("Folder", FolderSchema);
export default Folder;
