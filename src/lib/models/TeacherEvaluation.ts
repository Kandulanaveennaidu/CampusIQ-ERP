import mongoose, { Schema, models, type Document } from "mongoose";

export interface ITeacherEvaluation extends Document {
  school: mongoose.Types.ObjectId;
  teacher: mongoose.Types.ObjectId;
  evaluator: mongoose.Types.ObjectId;
  evaluatorRole: "student" | "parent" | "admin";
  semester?: string;
  ratings: {
    teaching_quality: number;
    communication: number;
    punctuality: number;
    subject_knowledge: number;
    approachability: number;
  };
  overallRating: number;
  comments?: string;
  isAnonymous: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const teacherEvaluationSchema = new Schema<ITeacherEvaluation>(
  {
    school: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    evaluator: { type: Schema.Types.ObjectId, ref: "User", required: true },
    evaluatorRole: {
      type: String,
      enum: ["student", "parent", "admin"],
      required: true,
    },
    semester: { type: String },
    ratings: {
      teaching_quality: { type: Number, min: 1, max: 5, required: true },
      communication: { type: Number, min: 1, max: 5, required: true },
      punctuality: { type: Number, min: 1, max: 5, required: true },
      subject_knowledge: { type: Number, min: 1, max: 5, required: true },
      approachability: { type: Number, min: 1, max: 5, required: true },
    },
    overallRating: { type: Number, min: 1, max: 5 },
    comments: { type: String },
    isAnonymous: { type: Boolean, default: true },
  },
  { timestamps: true },
);

teacherEvaluationSchema.index({ school: 1, teacher: 1 });
// Prevent duplicate evaluations from same evaluator per semester
teacherEvaluationSchema.index(
  { school: 1, teacher: 1, evaluator: 1, semester: 1 },
  { unique: true },
);

// Auto-compute overall rating
teacherEvaluationSchema.pre("save", function () {
  const r = this.ratings;
  this.overallRating =
    Math.round(
      ((r.teaching_quality +
        r.communication +
        r.punctuality +
        r.subject_knowledge +
        r.approachability) /
        5) *
        10,
    ) / 10;
});

const TeacherEvaluation =
  models.TeacherEvaluation ||
  mongoose.model<ITeacherEvaluation>(
    "TeacherEvaluation",
    teacherEvaluationSchema,
  );

export default TeacherEvaluation;
