import mongoose, { Schema, Document, Model } from "mongoose";

export interface IQRToken extends Document {
  school: mongoose.Types.ObjectId;
  class_name: string;
  date: string;
  token: string;
  expires_at: Date;
  created_by: string;
  createdAt: Date;
}

const QRTokenSchema = new Schema<IQRToken>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    class_name: { type: String, required: true },
    date: { type: String, required: true },
    token: { type: String, required: true, unique: true },
    expires_at: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
    created_by: { type: String, default: "" },
  },
  { timestamps: true },
);

QRTokenSchema.index({ school: 1, class_name: 1, date: 1 });
QRTokenSchema.index({ token: 1 });

const QRToken: Model<IQRToken> =
  mongoose.models.QRToken || mongoose.model<IQRToken>("QRToken", QRTokenSchema);

export default QRToken;
