import { NextResponse } from "next/server";
import { SUPPORTED_LOCALES, getTranslations } from "@/lib/i18n";
import type { SupportedLocale } from "@/lib/i18n";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const locale = (searchParams.get("locale") as SupportedLocale) || "en";

    if (!SUPPORTED_LOCALES.find((l) => l.code === locale)) {
      return NextResponse.json(
        {
          error: `Unsupported locale: ${locale}. Supported: ${SUPPORTED_LOCALES.map((l) => l.code).join(", ")}`,
        },
        { status: 400 },
      );
    }

    const translations = getTranslations(locale);

    return NextResponse.json({
      success: true,
      locale,
      supported_locales: SUPPORTED_LOCALES,
      translations,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch translations" },
      { status: 500 },
    );
  }
}
