import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITimetable extends Document {
  school: mongoose.Types.ObjectId;
  class_name: string;
  day: string;
  period: number;
  start_time: string;
  end_time: string;
  subject: string;
  teacher_id: string;
  teacher_name: string;
  room: string;
  createdAt: Date;
}

const TimetableSchema = new Schema<ITimetable>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    class_name: { type: String, required: true },
    day: { type: String, required: true },
    period: { type: Number, required: true },
    start_time: { type: String, required: true },
    end_time: { type: String, required: true },
    subject: { type: String, required: true },
    teacher_id: { type: String, default: "" },
    teacher_name: { type: String, default: "" },
    room: { type: String, default: "" },
  },
  { timestamps: true },
);

TimetableSchema.index({ school: 1, class_name: 1, day: 1 });
TimetableSchema.index(
  { school: 1, class_name: 1, day: 1, period: 1 },
  { unique: true },
);

const Timetable: Model<ITimetable> =
  mongoose.models.Timetable ||
  mongoose.model<ITimetable>("Timetable", TimetableSchema);

export default Timetable;
