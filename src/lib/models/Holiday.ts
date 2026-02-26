import mongoose, { Schema, Document, Model } from "mongoose";

export interface IHoliday extends Document {
  school: mongoose.Types.ObjectId;
  date: string;
  name: string;
  type: "national" | "regional" | "school" | "exam" | "event";
  holiday_type: string;
  description: string;
  created_by: mongoose.Types.ObjectId;
  createdAt: Date;
}

const HolidaySchema = new Schema<IHoliday>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    date: { type: String, required: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["national", "regional", "school", "exam", "event"],
      default: "school",
    },
    holiday_type: { type: String, default: "" },
    description: { type: String, default: "" },
    created_by: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

HolidaySchema.index({ school: 1, date: 1 });

const Holiday: Model<IHoliday> =
  mongoose.models.Holiday || mongoose.model<IHoliday>("Holiday", HolidaySchema);

export default Holiday;
