import mongoose, { Schema, models, type Document } from "mongoose";

export interface IStudentDocument extends Document {
  school: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  title: string;
  type:
    | "birth_certificate"
    | "aadhaar"
    | "transfer_certificate"
    | "marksheet"
    | "photo"
    | "medical"
    | "other";
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedBy: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const studentDocumentSchema = new Schema<IStudentDocument>(
  {
    school: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    type: {
      type: String,
      enum: [
        "birth_certificate",
        "aadhaar",
        "transfer_certificate",
        "marksheet",
        "photo",
        "medical",
        "other",
      ],
      required: true,
    },
    fileUrl: { type: String, required: true },
    fileType: { type: String, default: "" },
    fileSize: { type: Number, default: 0 },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    notes: { type: String },
  },
  { timestamps: true },
);

studentDocumentSchema.index({ school: 1, student: 1 });

const StudentDocument =
  models.StudentDocument ||
  mongoose.model<IStudentDocument>("StudentDocument", studentDocumentSchema);

export default StudentDocument;
