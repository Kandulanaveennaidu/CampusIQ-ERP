import mongoose, { Schema, models, type Document } from "mongoose";

export interface IAcademicCalendar extends Document {
  school: mongoose.Types.ObjectId;
  academicYear: string;
  title: string;
  entries: {
    date: Date;
    endDate?: Date;
    title: string;
    type:
      | "holiday"
      | "exam"
      | "event"
      | "ptm"
      | "vacation"
      | "working_saturday"
      | "result_day"
      | "orientation"
      | "sports_day"
      | "other";
    description?: string;
    forClasses?: string[];
    color?: string;
  }[];
  isPublished: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const academicCalendarSchema = new Schema<IAcademicCalendar>(
  {
    school: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    academicYear: { type: String, required: true },
    title: { type: String, required: true },
    entries: [
      {
        date: { type: Date, required: true },
        endDate: { type: Date },
        title: { type: String, required: true },
        type: {
          type: String,
          enum: [
            "holiday",
            "exam",
            "event",
            "ptm",
            "vacation",
            "working_saturday",
            "result_day",
            "orientation",
            "sports_day",
            "other",
          ],
          required: true,
        },
        description: { type: String },
        forClasses: [{ type: String }],
        color: { type: String },
      },
    ],
    isPublished: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

academicCalendarSchema.index({ school: 1, academicYear: 1 }, { unique: true });

const AcademicCalendar =
  models.AcademicCalendar ||
  mongoose.model<IAcademicCalendar>("AcademicCalendar", academicCalendarSchema);
export default AcademicCalendar;
