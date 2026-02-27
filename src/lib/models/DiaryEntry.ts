import mongoose, { Schema, models, type Document } from "mongoose";

export interface IDiaryEntry extends Document {
  school: mongoose.Types.ObjectId;
  class_name: string;
  section?: string;
  date: Date;
  subject?: string;
  title: string;
  content: string;
  homework?: string;
  attachments: string[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const diaryEntrySchema = new Schema<IDiaryEntry>(
  {
    school: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    class_name: { type: String, required: true },
    section: { type: String },
    date: { type: Date, required: true, index: true },
    subject: { type: String },
    title: { type: String, required: true },
    content: { type: String, required: true },
    homework: { type: String },
    attachments: [{ type: String }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

diaryEntrySchema.index({ school: 1, class_name: 1, date: -1 });

const DiaryEntry =
  models.DiaryEntry ||
  mongoose.model<IDiaryEntry>("DiaryEntry", diaryEntrySchema);

export default DiaryEntry;
