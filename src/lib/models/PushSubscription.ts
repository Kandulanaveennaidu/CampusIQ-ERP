import mongoose, { Schema, models, type Document } from "mongoose";

export interface IPushSubscription extends Document {
  school: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const pushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    school: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: { type: String },
  },
  { timestamps: true },
);

pushSubscriptionSchema.index({ school: 1, user: 1 });

const PushSubscription =
  models.PushSubscription ||
  mongoose.model<IPushSubscription>("PushSubscription", pushSubscriptionSchema);

export default PushSubscription;
