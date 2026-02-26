import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISubmissionAttachment {
  name: string;
  url: string;
}

export interface IAssignmentAttachment {
  name: string;
  url: string;
  type: string;
}

export interface ISubmission {
  student: mongoose.Types.ObjectId;
  submittedAt: Date;
  content: string;
  attachments: ISubmissionAttachment[];
  grade?: number;
  feedback?: string;
  gradedAt?: Date;
  gradedBy?: mongoose.Types.ObjectId;
}

export interface IAssignment extends Document {
  school: mongoose.Types.ObjectId;
  title: string;
  description: string;
  subject: string;
  class_name: string;
  section: string;
  teacher: mongoose.Types.ObjectId;
  dueDate: Date;
  attachments: IAssignmentAttachment[];
  submissions: ISubmission[];
  status: "active" | "closed";
  maxMarks: number;
  createdAt: Date;
  updatedAt: Date;
}

const SubmissionAttachmentSchema = new Schema<ISubmissionAttachment>(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
  },
  { _id: false },
);

const AssignmentAttachmentSchema = new Schema<IAssignmentAttachment>(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, default: "" },
  },
  { _id: false },
);

const SubmissionSchema = new Schema<ISubmission>(
  {
    student: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    submittedAt: { type: Date, default: Date.now },
    content: { type: String, default: "" },
    attachments: { type: [SubmissionAttachmentSchema], default: [] },
    grade: { type: Number, default: undefined },
    feedback: { type: String, default: "" },
    gradedAt: { type: Date, default: undefined },
    gradedBy: { type: Schema.Types.ObjectId, ref: "User", default: undefined },
  },
  { _id: false },
);

const AssignmentSchema = new Schema<IAssignment>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    subject: { type: String, required: true },
    class_name: { type: String, required: true },
    section: { type: String, default: "" },
    teacher: { type: Schema.Types.ObjectId, ref: "User", required: true },
    dueDate: { type: Date, required: true },
    attachments: { type: [AssignmentAttachmentSchema], default: [] },
    submissions: { type: [SubmissionSchema], default: [] },
    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
    },
    maxMarks: { type: Number, default: 100 },
  },
  { timestamps: true },
);

AssignmentSchema.index({ school: 1, class_name: 1, subject: 1 });
AssignmentSchema.index({ school: 1, teacher: 1 });
AssignmentSchema.index({ dueDate: 1 });

const Assignment: Model<IAssignment> =
  mongoose.models.Assignment ||
  mongoose.model<IAssignment>("Assignment", AssignmentSchema);

export default Assignment;
