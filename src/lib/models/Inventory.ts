import mongoose, { Schema, models, type Document } from "mongoose";

export interface IInventory extends Document {
  school: mongoose.Types.ObjectId;
  name: string;
  category:
    | "lab_equipment"
    | "sports"
    | "furniture"
    | "electronics"
    | "stationery"
    | "library"
    | "other";
  serialNumber?: string;
  quantity: number;
  availableQuantity: number;
  location: string;
  condition: "new" | "good" | "fair" | "poor" | "damaged";
  purchaseDate?: Date;
  purchasePrice?: number;
  vendor?: string;
  warrantyExpiry?: Date;
  assignedTo?: mongoose.Types.ObjectId;
  checkoutHistory: {
    user: mongoose.Types.ObjectId;
    checkoutDate: Date;
    returnDate?: Date;
    notes?: string;
  }[];
  maintenanceLog: {
    date: Date;
    description: string;
    cost?: number;
    performedBy: string;
  }[];
  imageUrl?: string;
  status: "available" | "checked_out" | "maintenance" | "retired";
  createdAt: Date;
  updatedAt: Date;
}

const inventorySchema = new Schema<IInventory>(
  {
    school: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    category: {
      type: String,
      enum: [
        "lab_equipment",
        "sports",
        "furniture",
        "electronics",
        "stationery",
        "library",
        "other",
      ],
      required: true,
    },
    serialNumber: { type: String },
    quantity: { type: Number, required: true, min: 0 },
    availableQuantity: { type: Number, required: true, min: 0 },
    location: { type: String, required: true },
    condition: {
      type: String,
      enum: ["new", "good", "fair", "poor", "damaged"],
      default: "good",
    },
    purchaseDate: { type: Date },
    purchasePrice: { type: Number },
    vendor: { type: String },
    warrantyExpiry: { type: Date },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    checkoutHistory: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        checkoutDate: { type: Date, required: true },
        returnDate: { type: Date },
        notes: { type: String },
      },
    ],
    maintenanceLog: [
      {
        date: { type: Date, required: true },
        description: { type: String, required: true },
        cost: { type: Number },
        performedBy: { type: String, required: true },
      },
    ],
    imageUrl: { type: String },
    status: {
      type: String,
      enum: ["available", "checked_out", "maintenance", "retired"],
      default: "available",
    },
  },
  { timestamps: true },
);

inventorySchema.index({ school: 1, category: 1 });
inventorySchema.index({ school: 1, status: 1 });
inventorySchema.index({ school: 1, name: "text" });

const Inventory =
  models.Inventory || mongoose.model<IInventory>("Inventory", inventorySchema);
export default Inventory;
