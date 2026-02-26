import mongoose, { Schema, models, type Document } from "mongoose";

export interface IAlumni extends Document {
  school: mongoose.Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  graduationYear: number;
  class_name: string;
  currentOccupation?: string;
  company?: string;
  city?: string;
  linkedIn?: string;
  photoUrl?: string;
  achievements: string[];
  isVerified: boolean;
  registeredBy?: mongoose.Types.ObjectId;
  events: {
    eventName: string;
    date: Date;
    attended: boolean;
  }[];
  donations: {
    amount: number;
    date: Date;
    purpose: string;
    transactionId?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const alumniSchema = new Schema<IAlumni>(
  {
    school: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    graduationYear: { type: Number, required: true, index: true },
    class_name: { type: String, required: true },
    currentOccupation: { type: String },
    company: { type: String },
    city: { type: String },
    linkedIn: { type: String },
    photoUrl: { type: String },
    achievements: [{ type: String }],
    isVerified: { type: Boolean, default: false },
    registeredBy: { type: Schema.Types.ObjectId, ref: "User" },
    events: [
      {
        eventName: { type: String, required: true },
        date: { type: Date, required: true },
        attended: { type: Boolean, default: false },
      },
    ],
    donations: [
      {
        amount: { type: Number, required: true },
        date: { type: Date, required: true },
        purpose: { type: String, required: true },
        transactionId: { type: String },
      },
    ],
  },
  { timestamps: true },
);

alumniSchema.index({ school: 1, graduationYear: -1 });
alumniSchema.index({ school: 1, name: "text", company: "text" });

const Alumni = models.Alumni || mongoose.model<IAlumni>("Alumni", alumniSchema);
export default Alumni;
