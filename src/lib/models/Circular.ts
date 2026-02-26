import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICircular extends Document {
  school: mongoose.Types.ObjectId;
  title: string;
  content: string;
  type: "circular" | "announcement" | "notice";
  priority: "low" | "medium" | "high" | "urgent";
  targetAudience: string[];
  attachments: { name: string; url: string; type: string }[];
  publishDate: Date;
  expiryDate: Date | null;
  isPublished: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CircularSchema = new Schema<ICircular>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    type: {
      type: String,
      enum: ["circular", "announcement", "notice"],
      default: "circular",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    targetAudience: [{ type: String }],
    attachments: [
      {
        name: { type: String },
        url: { type: String },
        type: { type: String },
      },
    ],
    publishDate: { type: Date, default: Date.now },
    expiryDate: { type: Date, default: null },
    isPublished: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

CircularSchema.index({ school: 1, publishDate: -1 });
CircularSchema.index({ school: 1, type: 1 });

const Circular: Model<ICircular> =
  mongoose.models.Circular ||
  mongoose.model<ICircular>("Circular", CircularSchema);

export default Circular;
