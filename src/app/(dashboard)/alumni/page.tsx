"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { usePermissions } from "@/hooks/use-permissions";
import {
  GraduationCap,
  Plus,
  Search,
  MapPin,
  Briefcase,
  Building2,
  Heart,
  Calendar,
  Users,
  DollarSign,
  Trophy,
  Link as LinkIcon,
  Filter,
  UserPlus,
} from "lucide-react";
import Swal from "sweetalert2";

interface AlumniItem {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  graduationYear: number;
  class_name: string;
  currentOccupation?: string;
  company?: string;
  city?: string;
  linkedIn?: string;
  photoUrl?: string;
  achievements: string[];
  isVerified: boolean;
  events: { eventName: string; date: string; attended: boolean }[];
  donations: { amount: number; date: string; purpose: string }[];
}

export default function AlumniPage() {
  const { data: session } = useSession();
  const { canAdd, canEdit, canDelete } = usePermissions("alumni");
  const [alumni, setAlumni] = useState<AlumniItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [summary, setSummary] = useState<Record<string, unknown>>({});
  const [view, setView] = useState<"grid" | "table">("grid");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    graduationYear: new Date().getFullYear(),
    class_name: "",
    currentOccupation: "",
    company: "",
    city: "",
    linkedIn: "",
  });

  const fetchAlumni = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (yearFilter) params.set("year", yearFilter);
      const res = await fetch(`/api/alumni?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAlumni(data.data || []);
        setSummary(data.summary || {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, yearFilter]);

  useEffect(() => {
    fetchAlumni();
  }, [fetchAlumni]);

  const handleAdd = async () => {
    try {
      const res = await fetch("/api/alumni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowForm(false);
        fetchAlumni();
        Swal.fire({
          icon: "success",
          title: "Alumni Registered!",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDonation = async (id: string) => {
    const { value: amount } = await Swal.fire({
      input: "number",
      title: "Donation Amount (₹)",
      inputPlaceholder: "Amount",
    });
    if (!amount) return;
    const { value: purpose } = await Swal.fire({
      input: "text",
      title: "Donation Purpose",
      inputPlaceholder: "Purpose",
    });
    await fetch("/api/alumni", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        _id: id,
        action: "add_donation",
        amount: Number(amount),
        purpose: purpose || "General",
      }),
    });
    fetchAlumni();
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "Delete alumni record?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
    });
    if (result.isConfirmed) {
      await fetch(`/api/alumni?id=${id}`, { method: "DELETE" });
      fetchAlumni();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-indigo-600" /> Alumni Network
          </h1>
          <p className="text-gray-500 mt-1">
            Connect with past students, track achievements & donations
          </p>
        </div>
        {canAdd && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" /> Register Alumni
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            <span className="text-sm text-gray-500">Total Alumni</span>
          </div>
          <p className="text-2xl font-bold mt-1">
            {((summary as Record<string, unknown>).totalAlumni as number) || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-500" />
            <span className="text-sm text-gray-500">Year Groups</span>
          </div>
          <p className="text-2xl font-bold mt-1">
            {
              Object.keys(
                (summary as Record<string, Record<string, number>>)
                  .yearGroups || {},
              ).length
            }
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-purple-500" />
            <span className="text-sm text-gray-500">Cities</span>
          </div>
          <p className="text-2xl font-bold mt-1">
            {
              Object.keys(
                (summary as Record<string, Record<string, number>>).topCities ||
                  {},
              ).length
            }
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            <span className="text-sm text-gray-500">Total Donations</span>
          </div>
          <p className="text-2xl font-bold mt-1 text-green-600">
            ₹
            {(
              ((summary as Record<string, unknown>).totalDonations as number) ||
              0
            ).toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border">
          <h3 className="font-semibold mb-4">Register New Alumni</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Full Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600"
            />
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600"
            />
            <input
              type="tel"
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600"
            />
            <input
              type="number"
              placeholder="Graduation Year *"
              value={form.graduationYear}
              onChange={(e) =>
                setForm({ ...form, graduationYear: Number(e.target.value) })
              }
              className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600"
            />
            <input
              type="text"
              placeholder="Class (e.g. 12A) *"
              value={form.class_name}
              onChange={(e) => setForm({ ...form, class_name: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600"
            />
            <input
              type="text"
              placeholder="Current Occupation"
              value={form.currentOccupation}
              onChange={(e) =>
                setForm({ ...form, currentOccupation: e.target.value })
              }
              className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600"
            />
            <input
              type="text"
              placeholder="Company"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600"
            />
            <input
              type="text"
              placeholder="City"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600"
            />
            <input
              type="url"
              placeholder="LinkedIn URL"
              value={form.linkedIn}
              onChange={(e) => setForm({ ...form, linkedIn: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleAdd}
              disabled={!form.name || !form.class_name}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
            >
              Register
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="border px-4 py-2 rounded-lg text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search alumni..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
          />
        </div>
        <input
          type="number"
          placeholder="Year"
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-24 dark:bg-gray-800 dark:border-gray-700"
        />
        <div className="flex border rounded-lg overflow-hidden">
          <button
            onClick={() => setView("grid")}
            className={`px-3 py-2 text-sm ${view === "grid" ? "bg-indigo-600 text-white" : ""}`}
          >
            Grid
          </button>
          <button
            onClick={() => setView("table")}
            className={`px-3 py-2 text-sm ${view === "table" ? "bg-indigo-600 text-white" : ""}`}
          >
            Table
          </button>
        </div>
      </div>

      {/* Alumni Grid */}
      {view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {alumni.map((a) => (
            <div
              key={a._id}
              className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{a.name}</h3>
                  <p className="text-sm text-gray-500">
                    Class of {a.graduationYear} — {a.class_name}
                  </p>
                </div>
                {a.isVerified && (
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                    Verified
                  </span>
                )}
              </div>
              {(a.currentOccupation || a.company) && (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <Briefcase className="h-4 w-4 text-gray-400" />
                  <span>
                    {a.currentOccupation}
                    {a.company ? ` at ${a.company}` : ""}
                  </span>
                </div>
              )}
              {a.city && (
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>{a.city}</span>
                </div>
              )}
              {a.achievements && a.achievements.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {a.achievements.slice(0, 3).map((ach, i) => (
                    <span
                      key={i}
                      className="bg-yellow-50 text-yellow-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                    >
                      <Trophy className="h-3 w-3" />
                      {ach}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-3 pt-3 border-t flex items-center justify-between">
                <div className="flex gap-2">
                  {a.linkedIn && (
                    <a
                      href={a.linkedIn}
                      target="_blank"
                      rel="noopener"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <LinkIcon className="h-4 w-4" />
                    </a>
                  )}
                  {a.email && (
                    <a
                      href={`mailto:${a.email}`}
                      className="text-gray-500 hover:text-gray-700 text-xs"
                    >
                      {a.email}
                    </a>
                  )}
                </div>
                <div className="flex gap-1">
                  {canEdit && (
                    <button
                      onClick={() => handleDonation(a._id)}
                      className="text-green-600 text-xs hover:underline flex items-center gap-1"
                    >
                      <DollarSign className="h-3 w-3" />
                      Donation
                    </button>
                  )}
                </div>
              </div>
              {a.donations && a.donations.length > 0 && (
                <div className="mt-2 text-xs text-green-600">
                  Total donations: ₹
                  {a.donations
                    .reduce((s, d) => s + d.amount, 0)
                    .toLocaleString("en-IN")}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="p-3 text-left font-medium">Name</th>
                <th className="p-3 text-left font-medium">Year</th>
                <th className="p-3 text-left font-medium">Occupation</th>
                <th className="p-3 text-left font-medium">Company</th>
                <th className="p-3 text-left font-medium">City</th>
                <th className="p-3 text-center font-medium">Donations</th>
                <th className="p-3 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {alumni.map((a) => (
                <tr
                  key={a._id}
                  className="border-t hover:bg-gray-50 dark:hover:bg-gray-750"
                >
                  <td className="p-3 font-medium">{a.name}</td>
                  <td className="p-3">{a.graduationYear}</td>
                  <td className="p-3">{a.currentOccupation || "—"}</td>
                  <td className="p-3">{a.company || "—"}</td>
                  <td className="p-3">{a.city || "—"}</td>
                  <td className="p-3 text-center text-green-600">
                    ₹
                    {(a.donations || [])
                      .reduce((s, d) => s + d.amount, 0)
                      .toLocaleString("en-IN")}
                  </td>
                  <td className="p-3 text-center">
                    {canEdit && (
                      <button
                        onClick={() => handleDonation(a._id)}
                        className="text-green-600 text-xs hover:underline mr-2"
                      >
                        Donate
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(a._id)}
                        className="text-red-600 text-xs hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && alumni.length === 0 && !showForm && (
        <div className="text-center py-12 text-gray-500">
          <GraduationCap className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>
            No alumni registered yet. Click &quot;Register Alumni&quot; to add
            your first one.
          </p>
        </div>
      )}
    </div>
  );
}
