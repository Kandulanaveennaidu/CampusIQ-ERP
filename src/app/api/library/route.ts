import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import { LibraryBook, BookIssue } from "@/lib/models/Library";
import User from "@/lib/models/User";
import {
  libraryBookSchema,
  bookIssueSchema,
  bookReturnSchema,
  updateLibraryBookSchema,
  validationError,
} from "@/lib/validators";
import { logRequest, logError } from "@/lib/logger";
import { escapeRegex } from "@/lib/utils";
import { createAuditLog, buildChanges } from "@/lib/audit";
import { notifyLibraryBookIssue } from "@/lib/twilio-notifications";
import { emitActivity } from "@/lib/socket-io";

export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("library:read");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "books";
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const borrowerId = searchParams.get("borrower_id");

    await connectDB();
    const schoolId = session!.user.school_id;
    logRequest("GET", "/api/library", session!.user.id, schoolId);

    if (type === "books") {
      const query: Record<string, unknown> = { school: schoolId };
      if (category) query.category = category;
      if (status) query.status = status;
      if (search) {
        const safe = escapeRegex(search);
        query.$or = [
          { title: { $regex: safe, $options: "i" } },
          { author: { $regex: safe, $options: "i" } },
          { isbn: { $regex: safe, $options: "i" } },
        ];
      }

      const books = await LibraryBook.find(query).sort({ title: 1 });
      return NextResponse.json({ success: true, data: books });
    }

    if (type === "issues") {
      const query: Record<string, unknown> = { school: schoolId };
      if (borrowerId) query.borrower = borrowerId;
      if (status) query.status = status;

      const issues = await BookIssue.find(query)
        .populate("book", "title author isbn")
        .populate("borrower", "name email")
        .sort({ issueDate: -1 });

      return NextResponse.json({ success: true, data: issues });
    }

    if (type === "overdue") {
      const today = new Date();
      const overdueIssues = await BookIssue.find({
        school: schoolId,
        status: "issued",
        dueDate: { $lt: today },
      })
        .populate("book", "title author")
        .populate("borrower", "name email");

      // Update status to overdue
      for (const issue of overdueIssues) {
        issue.status = "overdue";
        await issue.save();
      }

      return NextResponse.json({ success: true, data: overdueIssues });
    }

    if (type === "summary") {
      const totalBooks = await LibraryBook.countDocuments({ school: schoolId });
      const totalCopies = await LibraryBook.aggregate([
        { $match: { school: schoolId } },
        {
          $group: {
            _id: null,
            total: { $sum: "$copies" },
            available: { $sum: "$availableCopies" },
          },
        },
      ]);
      const activeIssues = await BookIssue.countDocuments({
        school: schoolId,
        status: "issued",
      });
      const overdueCount = await BookIssue.countDocuments({
        school: schoolId,
        status: { $in: ["issued", "overdue"] },
        dueDate: { $lt: new Date() },
      });

      return NextResponse.json({
        success: true,
        data: {
          total_books: totalBooks,
          total_copies: totalCopies[0]?.total || 0,
          available_copies: totalCopies[0]?.available || 0,
          active_issues: activeIssues,
          overdue: overdueCount,
        },
      });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err) {
    logError("GET", "/api/library", err);
    return NextResponse.json(
      { error: "Failed to fetch library data" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("library:write");
    if (error) return error;

    const body = await request.json();
    const action = body.action || "add_book";

    await connectDB();
    const schoolId = session!.user.school_id;
    logRequest("POST", "/api/library", session!.user.id, schoolId);

    if (action === "add_book") {
      const parsed = libraryBookSchema.safeParse(body);
      if (!parsed.success) {
        return validationError(parsed.error);
      }

      const book = await LibraryBook.create({
        school: schoolId,
        title: parsed.data.title,
        author: parsed.data.author,
        isbn: parsed.data.isbn,
        category: parsed.data.category,
        publisher: parsed.data.publisher,
        publishYear: parsed.data.publish_year,
        edition: parsed.data.edition,
        copies: parsed.data.copies,
        availableCopies: parsed.data.copies,
        location: parsed.data.location,
      });

      emitActivity({
        type: "library:book_added",
        title: "New Book Added",
        message: `"${parsed.data.title}" by ${parsed.data.author} added to library (${parsed.data.copies} copies)`,
        module: "library",
        entityId: book._id.toString(),
        actionUrl: "/library",
        session: session!,
      });

      return NextResponse.json({ success: true, data: book }, { status: 201 });
    }

    if (action === "issue_book") {
      const parsed = bookIssueSchema.safeParse(body);
      if (!parsed.success) {
        return validationError(parsed.error);
      }

      const book = await LibraryBook.findOne({
        _id: parsed.data.book_id,
        school: schoolId,
      });
      if (!book)
        return NextResponse.json({ error: "Book not found" }, { status: 404 });

      const borrower = await User.findOne({
        _id: parsed.data.borrower_id,
        school: schoolId,
      });
      if (!borrower)
        return NextResponse.json(
          { error: "Borrower not found" },
          { status: 404 },
        );

      // Atomic decrement to prevent race condition on concurrent issues
      const updatedBook = await LibraryBook.findOneAndUpdate(
        {
          _id: parsed.data.book_id,
          school: schoolId,
          availableCopies: { $gt: 0 },
        },
        {
          $inc: { availableCopies: -1 },
        },
        { new: true },
      );
      if (!updatedBook) {
        return NextResponse.json(
          { error: "No copies available" },
          { status: 400 },
        );
      }

      if (updatedBook.availableCopies <= 0) {
        updatedBook.status = "all-issued";
        await updatedBook.save();
      }

      const issue = await BookIssue.create({
        school: schoolId,
        book: book._id,
        bookTitle: book.title,
        borrower: borrower._id,
        borrowerName: borrower.name,
        borrowerType: parsed.data.borrower_type,
        issueDate: new Date(),
        dueDate: new Date(parsed.data.due_date),
        issuedBy: session!.user.id,
      });

      // Notify borrower about book issue
      if (borrower.phone) {
        const dueDateStr = new Date(parsed.data.due_date).toLocaleDateString(
          "en-IN",
        );
        notifyLibraryBookIssue(
          borrower.phone,
          borrower.name,
          book.title,
          dueDateStr,
        ).catch(() => {});
      }

      emitActivity({
        type: "library:book_issued",
        title: "Book Issued",
        message: `"${book.title}" issued to ${borrower.name}`,
        module: "library",
        entityId: issue._id.toString(),
        actionUrl: "/library",
        session: session!,
      });

      return NextResponse.json({ success: true, data: issue }, { status: 201 });
    }

    if (action === "return_book") {
      const parsed = bookReturnSchema.safeParse(body);
      if (!parsed.success) {
        return validationError(parsed.error);
      }

      const issue = await BookIssue.findOne({
        _id: parsed.data.issue_id,
        school: schoolId,
      });
      if (!issue)
        return NextResponse.json(
          { error: "Issue record not found" },
          { status: 404 },
        );

      issue.returnDate = new Date();
      issue.fine = parsed.data.fine;
      issue.status = "returned";
      await issue.save();

      const book = await LibraryBook.findById(issue.book);
      if (book) {
        book.availableCopies += 1;
        if (book.status === "all-issued") book.status = "available";
        await book.save();
      }

      emitActivity({
        type: "library:book_returned",
        title: "Book Returned",
        message: `"${issue.bookTitle}" has been returned${parsed.data.fine ? ` (Fine: ₹${parsed.data.fine})` : ""}`,
        module: "library",
        entityId: issue._id.toString(),
        actionUrl: "/library",
        session: session!,
      });

      return NextResponse.json({ success: true, data: issue });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    logError("POST", "/api/library", err);
    return NextResponse.json(
      { error: "Failed to process library request" },
      { status: 500 },
    );
  }
}

// PUT - Update book details
export async function PUT(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("library:write");
    if (error) return error;

    const body = await request.json();
    const parsed = updateLibraryBookSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    await connectDB();
    const schoolId = session!.user.school_id;

    const book = await LibraryBook.findOne({
      _id: parsed.data.book_id,
      school: schoolId,
    });
    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const oldObj = book.toObject();

    if (parsed.data.title !== undefined) book.title = parsed.data.title;
    if (parsed.data.author !== undefined) book.author = parsed.data.author;
    if (parsed.data.isbn !== undefined) book.isbn = parsed.data.isbn;
    if (parsed.data.category !== undefined)
      book.category = parsed.data.category;
    if (parsed.data.publisher !== undefined)
      book.publisher = parsed.data.publisher;
    if (parsed.data.publish_year !== undefined)
      book.publishYear = parsed.data.publish_year;
    if (parsed.data.edition !== undefined) book.edition = parsed.data.edition;
    if (parsed.data.copies !== undefined) {
      const diff = parsed.data.copies - oldObj.copies;
      book.copies = parsed.data.copies;
      book.availableCopies = Math.max(0, book.availableCopies + diff);
    }
    if (parsed.data.location !== undefined)
      book.location = parsed.data.location;
    if (parsed.data.status !== undefined) book.status = parsed.data.status;

    await book.save();

    const changes = buildChanges(oldObj, book.toObject(), [
      "title",
      "author",
      "copies",
      "status",
    ]);

    createAuditLog({
      school: schoolId,
      action: "update",
      entity: "library_book",
      entityId: parsed.data.book_id,
      userId: session!.user.id,
      userName: session!.user.name,
      userRole: session!.user.role,
      changes,
    });

    emitActivity({
      type: "library:book_updated",
      title: "Book Updated",
      message: `"${book.title}" details have been updated`,
      module: "library",
      entityId: parsed.data.book_id,
      actionUrl: "/library",
      session: session!,
    });

    logRequest("PUT", "/api/library", session!.user.id, schoolId);
    return NextResponse.json({ success: true, data: book });
  } catch (err) {
    logError("PUT", "/api/library", err);
    return NextResponse.json(
      { error: "Failed to update book" },
      { status: 500 },
    );
  }
}

// DELETE - Remove book from library
export async function DELETE(request: NextRequest) {
  try {
    const { error, session } = await requireAuth("library:manage");
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("book_id");
    if (!bookId) {
      return NextResponse.json(
        { error: "book_id is required" },
        { status: 400 },
      );
    }

    await connectDB();
    const schoolId = session!.user.school_id;

    const book = await LibraryBook.findOne({
      _id: bookId,
      school: schoolId,
    });
    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // Check for active issues
    const activeIssues = await BookIssue.countDocuments({
      book: bookId,
      school: schoolId,
      status: { $in: ["issued", "overdue"] },
    });

    if (activeIssues > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete book with ${activeIssues} active issue(s). Return all copies first.`,
        },
        { status: 400 },
      );
    }

    await LibraryBook.deleteOne({ _id: bookId, school: schoolId });

    createAuditLog({
      school: schoolId,
      action: "delete",
      entity: "library_book",
      entityId: bookId,
      userId: session!.user.id,
      userName: session!.user.name,
      userRole: session!.user.role,
      metadata: { title: book.title },
    });

    emitActivity({
      type: "library:book_deleted",
      title: "Book Removed",
      message: `"${book.title}" has been removed from the library`,
      module: "library",
      entityId: bookId,
      actionUrl: "/library",
      session: session!,
    });

    logRequest("DELETE", "/api/library", session!.user.id, schoolId);
    return NextResponse.json({
      success: true,
      message: "Book deleted successfully",
    });
  } catch (err) {
    logError("DELETE", "/api/library", err);
    return NextResponse.json(
      { error: "Failed to delete book" },
      { status: 500 },
    );
  }
}
