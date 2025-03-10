import mongoose, { Schema } from "mongoose";

// Mongoose Schemas
// User Schema
export interface IUser extends Document {
  userId: string;
  username: string;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    userId: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    refreshToken: { type: String },
  },
  { timestamps: true }
);
const User = mongoose.model("User", UserSchema);

export default User;
