import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBackup extends Document {
  school: mongoose.Types.ObjectId;
  name: string;
  type: "full" | "incremental" | "manual";
  size: number;
  storageUrl: string;
  collections: string[];
  status: "in-progress" | "completed" | "failed";
  errorMessage: string;
  startedAt: Date;
  completedAt: Date | null;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const BackupSchema = new Schema<IBackup>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["full", "incremental", "manual"],
      default: "manual",
    },
    size: { type: Number, default: 0 },
    storageUrl: { type: String, default: "" },
    collections: [{ type: String }],
    status: {
      type: String,
      enum: ["in-progress", "completed", "failed"],
      default: "in-progress",
    },
    errorMessage: { type: String, default: "" },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

BackupSchema.index({ school: 1, createdAt: -1 });

const Backup: Model<IBackup> =
  mongoose.models.Backup || mongoose.model<IBackup>("Backup", BackupSchema);

export default Backup;
