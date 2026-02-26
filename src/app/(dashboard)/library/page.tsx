"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Search, BookOpen, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { showSuccess, showError } from "@/lib/alerts";
import { Spinner } from "@/components/ui/spinner";
import { usePermissions } from "@/hooks/use-permissions";

interface Book {
  _id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  copies: number;
  availableCopies: number;
  status: string;
}

interface Issue {
  _id: string;
  book: { title: string; author: string };
  borrower: { name: string; email: string };
  bookTitle: string;
  borrowerName: string;
  issueDate: string;
  dueDate: string;
  returnDate: string | null;
  fine: number;
  status: string;
}

export default function LibraryPage() {
  const { canAdd, canEdit } = usePermissions("library");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"books" | "issues">("books");
  const [books, setBooks] = useState<Book[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [summary, setSummary] = useState({
    total_books: 0,
    total_copies: 0,
    available_copies: 0,
    active_issues: 0,
    overdue: 0,
  });
  const [search, setSearch] = useState("");
  const [showAddBook, setShowAddBook] = useState(false);
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [bookForm, setBookForm] = useState({
    title: "",
    author: "",
    isbn: "",
    category: "textbook",
    copies: 1,
    location: "",
    publisher: "",
  });
  const [issueForm, setIssueForm] = useState({
    book_id: "",
    borrower_id: "",
    borrower_type: "student",
    due_date: "",
  });
  const [users, setUsers] = useState<Array<{ _id: string; name: string }>>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);

      const [bRes, iRes, sRes] = await Promise.all([
        fetch(`/api/library?type=books&${params}`),
        fetch("/api/library?type=issues"),
        fetch("/api/library?type=summary"),
      ]);

      if (bRes.ok) {
        const d = await bRes.json();
        setBooks(d.data || []);
      }
      if (iRes.ok) {
        const d = await iRes.json();
        setIssues(d.data || []);
      }
      if (sRes.ok) {
        const d = await sRes.json();
        setSummary(d.data || {});
      }
    } catch {
      showError("Error", "Failed to fetch library data");
    } finally {
      setLoading(false);
    }
  }, [search]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/students");
      if (res.ok) {
        const d = await res.json();
        setUsers(
          d.data?.map((s: { _id: string; name: string }) => ({
            _id: s._id,
            name: s.name,
          })) || [],
        );
      }
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchUsers();
  }, [fetchData, fetchUsers]);

  const addBook = async () => {
    try {
      setSubmitting(true);
      const res = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_book", ...bookForm }),
      });
      if (res.ok) {
        showSuccess("Success", "Book added");
        setShowAddBook(false);
        setBookForm({
          title: "",
          author: "",
          isbn: "",
          category: "textbook",
          copies: 1,
          location: "",
          publisher: "",
        });
        fetchData();
      } else {
        const err = await res.json();
        showError("Error", err.error);
      }
    } catch {
      showError("Error", "Failed to add book");
    } finally {
      setSubmitting(false);
    }
  };

  const issueBook = async () => {
    try {
      setSubmitting(true);
      const res = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "issue_book", ...issueForm }),
      });
      if (res.ok) {
        showSuccess("Success", "Book issued");
        setShowIssueDialog(false);
        fetchData();
      } else {
        const err = await res.json();
        showError("Error", err.error);
      }
    } catch {
      showError("Error", "Failed to issue book");
    } finally {
      setSubmitting(false);
    }
  };

  const returnBook = async (issueId: string) => {
    try {
      const res = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "return_book",
          issue_id: issueId,
          fine: 0,
        }),
      });
      if (res.ok) {
        showSuccess("Success", "Book returned");
        fetchData();
      } else {
        const err = await res.json();
        showError("Error", err.error);
      }
    } catch {
      showError("Error", "Failed to return book");
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Library</h1>
          <p className="text-muted-foreground">Manage books, issues and returns</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search books..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-48"
            />
          </div>
          {canAdd && (
            <Button onClick={() => setShowAddBook(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Book
            </Button>
          )}
          {canAdd && (
            <Button variant="outline" onClick={() => setShowIssueDialog(true)}>
              <BookOpen className="mr-2 h-4 w-4" />
              Issue Book
            </Button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-5">
        {[
          {
            label: "Total Books",
            value: summary.total_books,
            color: "text-blue-600",
          },
          {
            label: "Total Copies",
            value: summary.total_copies,
            color: "text-purple-600",
          },
          {
            label: "Available",
            value: summary.available_copies,
            color: "text-green-600",
          },
          {
            label: "Issued",
            value: summary.active_issues,
            color: "text-amber-600",
          },
          { label: "Overdue", value: summary.overdue, color: "text-red-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(["books", "issues"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 capitalize ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-muted-foreground"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "books" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>ISBN</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Copies</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {books.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground"
                    >
                      No books found
                    </TableCell>
                  </TableRow>
                ) : (
                  books.map((b) => (
                    <TableRow key={b._id}>
                      <TableCell className="font-medium">{b.title}</TableCell>
                      <TableCell>{b.author}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {b.isbn}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{b.category}</Badge>
                      </TableCell>
                      <TableCell>{b.copies}</TableCell>
                      <TableCell>{b.availableCopies}</TableCell>
                      <TableCell>
                        <Badge
                          variant={b.availableCopies > 0 ? "present" : "absent"}
                        >
                          {b.availableCopies > 0 ? "Available" : "All Issued"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === "issues" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Book</TableHead>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Return Date</TableHead>
                  <TableHead>Fine</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center text-muted-foreground"
                    >
                      No issue records
                    </TableCell>
                  </TableRow>
                ) : (
                  issues.map((i) => (
                    <TableRow key={i._id}>
                      <TableCell className="font-medium">
                        {i.bookTitle || i.book?.title}
                      </TableCell>
                      <TableCell>
                        {i.borrowerName || i.borrower?.name}
                      </TableCell>
                      <TableCell>
                        {i.issueDate
                          ? new Date(i.issueDate).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {i.dueDate
                          ? new Date(i.dueDate).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {i.returnDate
                          ? new Date(i.returnDate).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell>{i.fine > 0 ? `₹${i.fine}` : "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            i.status === "returned"
                              ? "present"
                              : i.status === "overdue"
                                ? "absent"
                                : "late"
                          }
                        >
                          {i.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {i.status !== "returned" && canEdit && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => returnBook(i._id)}
                          >
                            <RotateCcw className="mr-1 h-3 w-3" />
                            Return
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add Book Dialog */}
      <Dialog open={showAddBook} onOpenChange={setShowAddBook}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Book</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div>
              <Label>Title</Label>
              <Input
                value={bookForm.title}
                onChange={(e) =>
                  setBookForm({ ...bookForm, title: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Author</Label>
              <Input
                value={bookForm.author}
                onChange={(e) =>
                  setBookForm({ ...bookForm, author: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>ISBN</Label>
                <Input
                  value={bookForm.isbn}
                  onChange={(e) =>
                    setBookForm({ ...bookForm, isbn: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Copies</Label>
                <Input
                  type="number"
                  value={bookForm.copies}
                  onChange={(e) =>
                    setBookForm({ ...bookForm, copies: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={bookForm.category}
                onValueChange={(v) => setBookForm({ ...bookForm, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "textbook",
                    "reference",
                    "fiction",
                    "non-fiction",
                    "journal",
                    "magazine",
                    "other",
                  ].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Location</Label>
              <Input
                value={bookForm.location}
                onChange={(e) =>
                  setBookForm({ ...bookForm, location: e.target.value })
                }
                placeholder="Shelf A-3"
              />
            </div>
            <Button onClick={addBook} disabled={submitting} className="w-full">
              {submitting ? "Adding..." : "Add Book"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Issue Book Dialog */}
      <Dialog open={showIssueDialog} onOpenChange={setShowIssueDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Book</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div>
              <Label>Book</Label>
              <Select
                value={issueForm.book_id || undefined}
                onValueChange={(v) =>
                  setIssueForm({ ...issueForm, book_id: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select book" />
                </SelectTrigger>
                <SelectContent>
                  {books
                    .filter((b) => b.availableCopies > 0)
                    .map((b) => (
                      <SelectItem key={b._id} value={b._id}>
                        {b.title} ({b.availableCopies} avail)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Borrower</Label>
              <Select
                value={issueForm.borrower_id || undefined}
                onValueChange={(v) =>
                  setIssueForm({ ...issueForm, borrower_id: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select borrower" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u._id} value={u._id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={issueForm.due_date}
                onChange={(e) =>
                  setIssueForm({ ...issueForm, due_date: e.target.value })
                }
              />
            </div>
            <Button
              onClick={issueBook}
              disabled={submitting}
              className="w-full"
            >
              {submitting ? "Issuing..." : "Issue Book"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
