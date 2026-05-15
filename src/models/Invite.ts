import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IInvite extends Document {
  email: string;
  invitedBy: Types.ObjectId;
  usedAt: Date | null;
  createdAt: Date;
}

const InviteSchema = new Schema<IInvite>({
  email: { type: String, required: true, unique: true, lowercase: true },
  invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  usedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

export const Invite =
  mongoose.models.Invite || mongoose.model<IInvite>("Invite", InviteSchema);
