import mongoose, { Schema, models, type Document } from "mongoose";

export interface ISchoolBranding extends Document {
  school: mongoose.Types.ObjectId;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  schoolMotto?: string;
  customDomain?: string;
  subdomain?: string;
  loginBgUrl?: string;
  sidebarStyle: "default" | "compact" | "expanded";
  headerStyle: "default" | "centered" | "minimal";
  emailFooter?: string;
  reportHeader?: string;
  watermarkUrl?: string;
  showPoweredBy: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const schoolBrandingSchema = new Schema<ISchoolBranding>(
  {
    school: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: true,
      unique: true,
    },
    logoUrl: { type: String },
    faviconUrl: { type: String },
    primaryColor: { type: String, default: "#6366f1" },
    secondaryColor: { type: String, default: "#8b5cf6" },
    accentColor: { type: String, default: "#f59e0b" },
    fontFamily: { type: String, default: "Inter" },
    schoolMotto: { type: String },
    customDomain: { type: String },
    subdomain: { type: String },
    loginBgUrl: { type: String },
    sidebarStyle: {
      type: String,
      enum: ["default", "compact", "expanded"],
      default: "default",
    },
    headerStyle: {
      type: String,
      enum: ["default", "centered", "minimal"],
      default: "default",
    },
    emailFooter: { type: String },
    reportHeader: { type: String },
    watermarkUrl: { type: String },
    showPoweredBy: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const SchoolBranding =
  models.SchoolBranding ||
  mongoose.model<ISchoolBranding>("SchoolBranding", schoolBrandingSchema);
export default SchoolBranding;
