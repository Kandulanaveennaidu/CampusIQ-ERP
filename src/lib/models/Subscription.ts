import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISubscription extends Document {
  school: mongoose.Types.ObjectId;
  plan: "starter" | "basic" | "pro" | "enterprise";
  status: "active" | "trial" | "expired" | "cancelled";
  billingCycle: "monthly" | "yearly";
  amount: number;
  currency: string;
  trialEndsAt: Date | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  paymentMethod: string;
  transactionId: string;
  invoiceNumber: string;
  cancelledAt: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    plan: {
      type: String,
      enum: ["starter", "basic", "pro", "enterprise"],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "trial", "expired", "cancelled"],
      default: "trial",
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly"],
      default: "monthly",
    },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },
    trialEndsAt: { type: Date, default: null },
    currentPeriodStart: { type: Date, required: true },
    currentPeriodEnd: { type: Date, required: true },
    paymentMethod: { type: String, default: "" },
    transactionId: { type: String, default: "" },
    invoiceNumber: { type: String, default: "" },
    cancelledAt: { type: Date, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

SubscriptionSchema.index({ school: 1 });
SubscriptionSchema.index({ school: 1, status: 1 });

const Subscription: Model<ISubscription> =
  mongoose.models.Subscription ||
  mongoose.model<ISubscription>("Subscription", SubscriptionSchema);

export default Subscription;
