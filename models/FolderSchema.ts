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
    userId: { 
      type: String, 
      required: true, 
      index: true,
      ref: "User"
    },
    name: { 
      type: String, 
      required: true, 
      trim: true,
      validate: {
        validator: async function(name: string) {
          const existingFolder = await mongoose.model<IFolder>("Folder").findOne({
            userId: this.userId,
            parentFolder: this.parentFolder,
            name: name,
            _id: { $ne: this._id }
          });
          return !existingFolder;
        },
        message: "Folder name must be unique within the same parent folder"
      }
    },
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
      validate: {
        validator: async function(folderId: Types.ObjectId | null) {
          if (!folderId || this.isParentRoot) return true;
          const parentFolder = await mongoose.model<IFolder>("Folder").findById(folderId);
          return parentFolder?.userId === this.userId;
        },
        message: "Parent folder must belong to the same user"
      }
    },
  },
  { timestamps: true }
);

// Compound indexes for faster queries
FolderSchema.index({ userId: 1, parentFolder: 1 });
FolderSchema.index({ userId: 1, name: 1, parentFolder: 1 }, { unique: true });

const Folder = mongoose.model<IFolder>("Folder", FolderSchema);
export default Folder;
