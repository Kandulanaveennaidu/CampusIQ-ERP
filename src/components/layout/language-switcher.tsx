"use client";

import { useState, useEffect } from "react";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/i18n";

const LOCALE_FLAGS: Record<SupportedLocale, string> = {
  en: "🇬🇧",
  hi: "🇮🇳",
  te: "🇮🇳",
  ta: "🇮🇳",
};

const STORAGE_KEY = "campusiq-locale";

export function LanguageSwitcher() {
  const [locale, setLocale] = useState<SupportedLocale>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY) as SupportedLocale | null;
    if (stored && SUPPORTED_LOCALES.some((l) => l.code === stored)) {
      setLocale(stored);
    }
  }, []);

  const handleLocaleChange = (code: SupportedLocale) => {
    setLocale(code);
    localStorage.setItem(STORAGE_KEY, code);
    // Dispatch a custom event so other components can react to locale changes
    window.dispatchEvent(new CustomEvent("locale-change", { detail: code }));
  };

  const currentLocale = SUPPORTED_LOCALES.find((l) => l.code === locale);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon">
        <Globe className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title={`Language: ${currentLocale?.name}`}
          className="relative"
        >
          <Globe className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {SUPPORTED_LOCALES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLocaleChange(lang.code)}
            className={`flex items-center justify-between ${
              locale === lang.code
                ? "bg-accent text-accent-foreground font-medium"
                : ""
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="text-base leading-none">
                {LOCALE_FLAGS[lang.code]}
              </span>
              <span>{lang.name}</span>
              <span className="text-muted-foreground text-xs">
                {lang.nativeName !== lang.name ? lang.nativeName : ""}
              </span>
            </span>
            {locale === lang.code && (
              <span className="h-2 w-2 rounded-full bg-blue-600" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
