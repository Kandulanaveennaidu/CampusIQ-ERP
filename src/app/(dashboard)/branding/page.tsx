"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { usePermissions } from "@/hooks/use-permissions";
import {
  Palette,
  Save,
  RotateCcw,
  Eye,
  Upload,
  Monitor,
  Layout,
  Type,
  Image,
  Globe,
  Check,
  Loader2,
} from "lucide-react";
import Swal from "sweetalert2";

interface BrandingData {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  schoolMotto?: string;
  customDomain?: string;
  subdomain?: string;
  logoUrl?: string;
  faviconUrl?: string;
  loginBgUrl?: string;
  sidebarStyle: string;
  headerStyle: string;
  emailFooter?: string;
  reportHeader?: string;
  watermarkUrl?: string;
  showPoweredBy: boolean;
}

const FONTS = [
  "Inter",
  "Poppins",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Nunito",
  "Playfair Display",
];

const PRESET_THEMES = [
  {
    name: "Indigo Classic",
    primary: "#6366f1",
    secondary: "#8b5cf6",
    accent: "#f59e0b",
  },
  {
    name: "Ocean Blue",
    primary: "#0ea5e9",
    secondary: "#06b6d4",
    accent: "#f97316",
  },
  {
    name: "Forest Green",
    primary: "#16a34a",
    secondary: "#22c55e",
    accent: "#eab308",
  },
  {
    name: "Royal Purple",
    primary: "#7c3aed",
    secondary: "#a855f7",
    accent: "#ec4899",
  },
  {
    name: "Sunset Orange",
    primary: "#ea580c",
    secondary: "#f97316",
    accent: "#6366f1",
  },
  {
    name: "Crimson Red",
    primary: "#dc2626",
    secondary: "#ef4444",
    accent: "#3b82f6",
  },
  {
    name: "Slate Modern",
    primary: "#475569",
    secondary: "#64748b",
    accent: "#0ea5e9",
  },
  {
    name: "Teal Fresh",
    primary: "#0d9488",
    secondary: "#14b8a6",
    accent: "#f59e0b",
  },
];

export default function BrandingPage() {
  const { data: session } = useSession();
  const { canView: _canView } = usePermissions("settings");
  const [branding, setBranding] = useState<BrandingData>({
    primaryColor: "#6366f1",
    secondaryColor: "#8b5cf6",
    accentColor: "#f59e0b",
    fontFamily: "Inter",
    sidebarStyle: "default",
    headerStyle: "default",
    showPoweredBy: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const fetchBranding = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/branding");
      if (res.ok) {
        const data = await res.json();
        if (data.data) setBranding({ ...branding, ...data.data });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branding),
      });
      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "Branding Updated!",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (preset: (typeof PRESET_THEMES)[0]) => {
    setBranding({
      ...branding,
      primaryColor: preset.primary,
      secondaryColor: preset.secondary,
      accentColor: preset.accent,
    });
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
          <h1 className="text-2xl font-bold text-foreground dark:text-foreground flex items-center gap-2">
            <Palette className="h-7 w-7 text-indigo-600" /> White-Label Branding
          </h1>
          <p className="text-muted-foreground mt-1">
            Customize your institution&apos;s brand: colors, logo, domain & more
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="border px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-muted/50 dark:hover:bg-gray-700"
          >
            <Eye className="h-4 w-4" /> {previewMode ? "Edit" : "Preview"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}{" "}
            Save Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Color Theme */}
          <div className="bg-card rounded-xl p-6 shadow-sm border">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Palette className="h-5 w-5" /> Color Theme
            </h3>

            {/* Preset Themes */}
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">Quick Presets:</p>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_THEMES.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    className="p-2 rounded-lg border hover:shadow text-left transition-shadow"
                  >
                    <div className="flex gap-1 mb-1">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: preset.secondary }}
                      />
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: preset.accent }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">{preset.name}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Primary
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={branding.primaryColor}
                    onChange={(e) =>
                      setBranding({ ...branding, primaryColor: e.target.value })
                    }
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={branding.primaryColor}
                    onChange={(e) =>
                      setBranding({ ...branding, primaryColor: e.target.value })
                    }
                    className="flex-1 border rounded-lg px-2 py-1.5 text-sm font-mono dark:bg-card"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Secondary
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={branding.secondaryColor}
                    onChange={(e) =>
                      setBranding({
                        ...branding,
                        secondaryColor: e.target.value,
                      })
                    }
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={branding.secondaryColor}
                    onChange={(e) =>
                      setBranding({
                        ...branding,
                        secondaryColor: e.target.value,
                      })
                    }
                    className="flex-1 border rounded-lg px-2 py-1.5 text-sm font-mono dark:bg-card"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Accent</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={branding.accentColor}
                    onChange={(e) =>
                      setBranding({ ...branding, accentColor: e.target.value })
                    }
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={branding.accentColor}
                    onChange={(e) =>
                      setBranding({ ...branding, accentColor: e.target.value })
                    }
                    className="flex-1 border rounded-lg px-2 py-1.5 text-sm font-mono dark:bg-card"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Typography & Layout */}
          <div className="bg-card rounded-xl p-6 shadow-sm border">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Type className="h-5 w-5" /> Typography & Layout
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Font Family
                </label>
                <select
                  value={branding.fontFamily}
                  onChange={(e) =>
                    setBranding({ ...branding, fontFamily: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-card"
                  style={{ fontFamily: branding.fontFamily }}
                >
                  {FONTS.map((f) => (
                    <option key={f} value={f} style={{ fontFamily: f }}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Sidebar Style
                </label>
                <select
                  value={branding.sidebarStyle}
                  onChange={(e) =>
                    setBranding({ ...branding, sidebarStyle: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-card"
                >
                  <option value="default">Default</option>
                  <option value="compact">Compact</option>
                  <option value="expanded">Expanded</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Header Style
                </label>
                <select
                  value={branding.headerStyle}
                  onChange={(e) =>
                    setBranding({ ...branding, headerStyle: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-card"
                >
                  <option value="default">Default</option>
                  <option value="centered">Centered</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>
            </div>
          </div>

          {/* Branding Assets */}
          <div className="bg-card rounded-xl p-6 shadow-sm border">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Image className="h-5 w-5" /> Branding Assets
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Logo URL
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={branding.logoUrl || ""}
                  onChange={(e) =>
                    setBranding({ ...branding, logoUrl: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-card"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Favicon URL
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={branding.faviconUrl || ""}
                  onChange={(e) =>
                    setBranding({ ...branding, faviconUrl: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-card"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Login Background URL
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={branding.loginBgUrl || ""}
                  onChange={(e) =>
                    setBranding({ ...branding, loginBgUrl: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-card"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Report Watermark URL
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={branding.watermarkUrl || ""}
                  onChange={(e) =>
                    setBranding({ ...branding, watermarkUrl: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-card"
                />
              </div>
            </div>
          </div>

          {/* Domain & Identity */}
          <div className="bg-card rounded-xl p-6 shadow-sm border">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5" /> Domain & Identity
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Custom Domain
                </label>
                <input
                  type="text"
                  placeholder="erp.myinstitution.edu"
                  value={branding.customDomain || ""}
                  onChange={(e) =>
                    setBranding({ ...branding, customDomain: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-card"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Subdomain
                </label>
                <div className="flex">
                  <input
                    type="text"
                    placeholder="myinstitution"
                    value={branding.subdomain || ""}
                    onChange={(e) =>
                      setBranding({ ...branding, subdomain: e.target.value })
                    }
                    className="flex-1 border rounded-l-lg px-3 py-2 text-sm dark:bg-card"
                  />
                  <span className="bg-muted dark:bg-gray-600 border border-l-0 rounded-r-lg px-3 py-2 text-sm">
                    .campusiq.app
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Institution Motto
                </label>
                <input
                  type="text"
                  placeholder="Knowledge is Power"
                  value={branding.schoolMotto || ""}
                  onChange={(e) =>
                    setBranding({ ...branding, schoolMotto: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-card"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Email Footer
                </label>
                <input
                  type="text"
                  placeholder="Custom email footer text"
                  value={branding.emailFooter || ""}
                  onChange={(e) =>
                    setBranding({ ...branding, emailFooter: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-card"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <input
                type="checkbox"
                checked={branding.showPoweredBy}
                onChange={(e) =>
                  setBranding({ ...branding, showPoweredBy: e.target.checked })
                }
                className="rounded"
                id="powered-by"
              />
              <label htmlFor="powered-by" className="text-sm">
                Show &quot;Powered by CampusIQ&quot; in footer
              </label>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl shadow-sm border overflow-hidden sticky top-6">
            <div className="p-4 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <Monitor className="h-5 w-5" /> Live Preview
              </h3>
            </div>
            <div className="p-4">
              {/* Mini sidebar preview */}
              <div
                className="rounded-lg border overflow-hidden"
                style={{ fontFamily: branding.fontFamily }}
              >
                <div
                  className="h-12 flex items-center px-4 text-white text-sm font-semibold"
                  style={{ backgroundColor: branding.primaryColor }}
                >
                  {branding.logoUrl ? (
                    <img
                      src={branding.logoUrl}
                      alt="Logo"
                      className="h-6 w-6 mr-2 rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : null}
                  Institution Name
                </div>
                <div className="bg-muted/50 dark:bg-background p-2 space-y-1">
                  {["Dashboard", "Students", "Attendance", "Exams"].map(
                    (item, i) => (
                      <div
                        key={item}
                        className={`px-3 py-2 rounded text-xs ${i === 0 ? "text-white" : "text-muted-foreground"}`}
                        style={
                          i === 0
                            ? { backgroundColor: branding.primaryColor }
                            : {}
                        }
                      >
                        {item}
                      </div>
                    ),
                  )}
                </div>
                <div className="p-3">
                  <div
                    className="text-xs font-medium mb-2"
                    style={{ color: branding.primaryColor }}
                  >
                    Quick Stats
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div
                      className="rounded-lg p-2 text-center text-white text-xs"
                      style={{ backgroundColor: branding.primaryColor }}
                    >
                      500 Students
                    </div>
                    <div
                      className="rounded-lg p-2 text-center text-white text-xs"
                      style={{ backgroundColor: branding.secondaryColor }}
                    >
                      45 Teachers
                    </div>
                    <div
                      className="rounded-lg p-2 text-center text-white text-xs col-span-2"
                      style={{ backgroundColor: branding.accentColor }}
                    >
                      92% Attendance
                    </div>
                  </div>
                  {branding.schoolMotto && (
                    <p className="text-[10px] text-center text-muted-foreground mt-3 italic">
                      &ldquo;{branding.schoolMotto}&rdquo;
                    </p>
                  )}
                </div>
              </div>

              {/* Button preview */}
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Button Styles:
                </p>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1.5 rounded text-xs text-white"
                    style={{ backgroundColor: branding.primaryColor }}
                  >
                    Primary
                  </button>
                  <button
                    className="px-3 py-1.5 rounded text-xs text-white"
                    style={{ backgroundColor: branding.secondaryColor }}
                  >
                    Secondary
                  </button>
                  <button
                    className="px-3 py-1.5 rounded text-xs text-white"
                    style={{ backgroundColor: branding.accentColor }}
                  >
                    Accent
                  </button>
                </div>
              </div>

              {/* Font preview */}
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Font Preview:
                </p>
                <p
                  className="text-lg font-bold"
                  style={{ fontFamily: branding.fontFamily }}
                >
                  The Quick Brown Fox
                </p>
                <p
                  className="text-sm"
                  style={{ fontFamily: branding.fontFamily }}
                >
                  Jumps over the lazy dog — 1234567890
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
