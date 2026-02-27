import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILibraryBook extends Document {
  school: mongoose.Types.ObjectId;
  title: string;
  author: string;
  isbn: string;
  category: string;
  publisher: string;
  publishYear: number;
  edition: string;
  copies: number;
  availableCopies: number;
  location: string;
  status: "available" | "all-issued" | "lost" | "damaged";
  createdAt: Date;
  updatedAt: Date;
}

const LibraryBookSchema = new Schema<ILibraryBook>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    isbn: { type: String, default: "" },
    category: { type: String, default: "general" },
    publisher: { type: String, default: "" },
    publishYear: { type: Number, default: 0 },
    edition: { type: String, default: "" },
    copies: { type: Number, default: 1 },
    availableCopies: { type: Number, default: 1 },
    location: { type: String, default: "" },
    status: {
      type: String,
      enum: ["available", "all-issued", "lost", "damaged"],
      default: "available",
    },
  },
  { timestamps: true },
);

LibraryBookSchema.index({ school: 1, title: 1, author: 1 });
LibraryBookSchema.index({ school: 1, isbn: 1 });

export interface IBookIssue extends Document {
  school: mongoose.Types.ObjectId;
  book: mongoose.Types.ObjectId;
  bookTitle: string;
  borrower: mongoose.Types.ObjectId;
  borrowerName: string;
  borrowerType: "student" | "teacher" | "staff";
  issueDate: Date;
  dueDate: Date;
  returnDate: Date | null;
  fine: number;
  status: "issued" | "returned" | "overdue" | "lost";
  issuedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BookIssueSchema = new Schema<IBookIssue>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    book: { type: Schema.Types.ObjectId, ref: "LibraryBook", required: true },
    bookTitle: { type: String, required: true },
    borrower: { type: Schema.Types.ObjectId, ref: "User", required: true },
    borrowerName: { type: String, required: true },
    borrowerType: {
      type: String,
      enum: ["student", "teacher", "staff"],
      required: true,
    },
    issueDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    returnDate: { type: Date, default: null },
    fine: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["issued", "returned", "overdue", "lost"],
      default: "issued",
    },
    issuedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

BookIssueSchema.index({ school: 1, borrower: 1, status: 1 });
BookIssueSchema.index({ school: 1, book: 1, status: 1 });

const LibraryBook: Model<ILibraryBook> =
  mongoose.models.LibraryBook ||
  mongoose.model<ILibraryBook>("LibraryBook", LibraryBookSchema);

const BookIssue: Model<IBookIssue> =
  mongoose.models.BookIssue ||
  mongoose.model<IBookIssue>("BookIssue", BookIssueSchema);

export { LibraryBook, BookIssue };
export default LibraryBook;
