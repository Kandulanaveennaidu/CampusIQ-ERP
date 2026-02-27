"use client";

import { useState, useEffect, useCallback } from "react";
import { t, type SupportedLocale, SUPPORTED_LOCALES } from "@/lib/i18n";

const LOCALE_STORAGE_KEY = "campusiq-locale";

/**
 * Hook to manage locale and translate strings.
 * Listens to a custom 'locale-change' event for cross-component sync.
 */
export function useLocale() {
  const [locale, setLocaleState] = useState<SupportedLocale>("en");

  useEffect(() => {
    // Read stored locale on mount
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as SupportedLocale;
    if (stored && SUPPORTED_LOCALES.some((l) => l.code === stored)) {
      setLocaleState(stored);
    }

    // Listen for locale-change events from other components
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as SupportedLocale;
      if (detail) setLocaleState(detail);
    };
    window.addEventListener("locale-change", handler);
    return () => window.removeEventListener("locale-change", handler);
  }, []);

  const setLocale = useCallback((newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    window.dispatchEvent(
      new CustomEvent("locale-change", { detail: newLocale }),
    );
  }, []);

  const translate = useCallback(
    (key: string): string => {
      return t(key, locale);
    },
    [locale],
  );

  return {
    locale,
    setLocale,
    t: translate,
    locales: SUPPORTED_LOCALES,
  };
}
