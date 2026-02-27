import mongoose, { Schema, Document, Model } from "mongoose";

export interface IToken extends Document {
  user: mongoose.Types.ObjectId;
  token: string;
  type: "email_verification" | "password_reset" | "invitation";
  expires_at: Date;
}

const TokenSchema = new Schema<IToken>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    token: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: ["email_verification", "password_reset", "invitation"],
      required: true,
    },
    expires_at: { type: Date, required: true },
  },
  { timestamps: true },
);

// Auto-delete expired tokens
TokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
TokenSchema.index({ user: 1, type: 1 });

const Token: Model<IToken> =
  mongoose.models.Token || mongoose.model<IToken>("Token", TokenSchema);

export default Token;
