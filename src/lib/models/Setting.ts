import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISetting extends Document {
  school: mongoose.Types.ObjectId;
  key: string;
  value: string;
}

const SettingSchema = new Schema<ISetting>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    key: { type: String, required: true },
    value: { type: String, default: "" },
  },
  { timestamps: true },
);

SettingSchema.index({ school: 1, key: 1 }, { unique: true });

const Setting: Model<ISetting> =
  mongoose.models.Setting || mongoose.model<ISetting>("Setting", SettingSchema);

export default Setting;
