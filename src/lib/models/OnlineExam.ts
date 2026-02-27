import mongoose, { Schema, Document, Model } from "mongoose";

export interface IExamQuestion {
  question: string;
  options: string[];
  correctOption: number; // 0-3
  marks: number;
  explanation: string;
}

export interface IAttemptAnswer {
  questionIndex: number;
  selectedOption: number;
}

export interface IExamAttempt {
  student: mongoose.Types.ObjectId;
  answers: IAttemptAnswer[];
  score: number;
  totalCorrect: number;
  totalWrong: number;
  totalUnanswered: number;
  startedAt: Date;
  submittedAt?: Date;
  status: "started" | "submitted" | "timed-out";
}

export interface IOnlineExamSettings {
  shuffleQuestions: boolean;
  showResults: boolean;
  allowReview: boolean;
  maxAttempts: number;
}

export interface IOnlineExam extends Document {
  school: mongoose.Types.ObjectId;
  title: string;
  description: string;
  subject: string;
  class_name: string;
  section: string;
  teacher: mongoose.Types.ObjectId;
  duration: number; // minutes
  totalMarks: number;
  passingMarks: number;
  questions: IExamQuestion[];
  startTime: Date;
  endTime: Date;
  status: "draft" | "published" | "active" | "completed";
  attempts: IExamAttempt[];
  settings: IOnlineExamSettings;
  createdAt: Date;
  updatedAt: Date;
}

const ExamQuestionSchema = new Schema<IExamQuestion>(
  {
    question: { type: String, required: true },
    options: {
      type: [String],
      required: true,
      validate: [
        (v: string[]) => v.length === 4,
        "Must have exactly 4 options",
      ],
    },
    correctOption: { type: Number, required: true, min: 0, max: 3 },
    marks: { type: Number, default: 1 },
    explanation: { type: String, default: "" },
  },
  { _id: false },
);

const AttemptAnswerSchema = new Schema<IAttemptAnswer>(
  {
    questionIndex: { type: Number, required: true },
    selectedOption: { type: Number, required: true },
  },
  { _id: false },
);

const ExamAttemptSchema = new Schema<IExamAttempt>(
  {
    student: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    answers: { type: [AttemptAnswerSchema], default: [] },
    score: { type: Number, default: 0 },
    totalCorrect: { type: Number, default: 0 },
    totalWrong: { type: Number, default: 0 },
    totalUnanswered: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date, default: undefined },
    status: {
      type: String,
      enum: ["started", "submitted", "timed-out"],
      default: "started",
    },
  },
  { _id: false },
);

const OnlineExamSettingsSchema = new Schema<IOnlineExamSettings>(
  {
    shuffleQuestions: { type: Boolean, default: false },
    showResults: { type: Boolean, default: true },
    allowReview: { type: Boolean, default: false },
    maxAttempts: { type: Number, default: 1 },
  },
  { _id: false },
);

const OnlineExamSchema = new Schema<IOnlineExam>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    subject: { type: String, required: true },
    class_name: { type: String, required: true },
    section: { type: String, default: "" },
    teacher: { type: Schema.Types.ObjectId, ref: "User", required: true },
    duration: { type: Number, required: true }, // minutes
    totalMarks: { type: Number, required: true },
    passingMarks: { type: Number, default: 0 },
    questions: { type: [ExamQuestionSchema], default: [] },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: {
      type: String,
      enum: ["draft", "published", "active", "completed"],
      default: "draft",
    },
    attempts: { type: [ExamAttemptSchema], default: [] },
    settings: {
      type: OnlineExamSettingsSchema,
      default: () => ({
        shuffleQuestions: false,
        showResults: true,
        allowReview: false,
        maxAttempts: 1,
      }),
    },
  },
  { timestamps: true },
);

OnlineExamSchema.index({ school: 1, class_name: 1, subject: 1 });
OnlineExamSchema.index({ school: 1, teacher: 1 });
OnlineExamSchema.index({ startTime: 1 });

const OnlineExam: Model<IOnlineExam> =
  mongoose.models.OnlineExam ||
  mongoose.model<IOnlineExam>("OnlineExam", OnlineExamSchema);

export default OnlineExam;
