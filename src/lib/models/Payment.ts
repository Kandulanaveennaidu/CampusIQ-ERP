import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPayment extends Document {
  school: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  orderId: string;
  paymentId: string;
  signature: string;
  amount: number;
  currency: string;
  type: "subscription" | "fee";
  plan: "starter" | "basic" | "pro" | "enterprise";
  status: "created" | "paid" | "failed" | "refunded";
  metadata: Map<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    orderId: { type: String, required: true },
    paymentId: { type: String, default: "" },
    signature: { type: String, default: "" },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    type: {
      type: String,
      enum: ["subscription", "fee"],
      required: true,
    },
    plan: {
      type: String,
      enum: ["starter", "basic", "pro", "enterprise"],
      default: "starter",
    },
    status: {
      type: String,
      enum: ["created", "paid", "failed", "refunded"],
      default: "created",
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: new Map(),
    },
  },
  { timestamps: true },
);

PaymentSchema.index({ school: 1, createdAt: -1 });
PaymentSchema.index({ school: 1, type: 1 });
PaymentSchema.index({ orderId: 1 }, { unique: true });

const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema);

export default Payment;
