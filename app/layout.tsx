import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSchool } from "../src/lib/school";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "School Management System",
  description: "Reusable school management platform",
};

const DEFAULT_THEME = {
  primary: "#2563eb",
  secondary: "#0f172a",
  accent: "#16a34a",
  font: "system",
};

const FONT_STACKS: Record<string, string> = {
  system: "Arial, Helvetica, sans-serif",
  inter: "Inter, Arial, Helvetica, sans-serif",
  poppins: "Poppins, Arial, Helvetica, sans-serif",
  roboto: "Roboto, Arial, Helvetica, sans-serif",
};

function validColor(value: string | null | undefined, fallback: string) {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const school = await getSchool();
  const primary = validColor(school?.primaryColor, DEFAULT_THEME.primary);
  const secondary = validColor(school?.secondaryColor, DEFAULT_THEME.secondary);
  const accent = validColor(school?.accentColor, DEFAULT_THEME.accent);
  const fontKey = school?.fontFamily && school.fontFamily in FONT_STACKS
    ? school.fontFamily
    : DEFAULT_THEME.font;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col"
        data-school-theme={school ? "custom" : "default"}
        style={
          {
            "--school-primary": primary,
            "--school-secondary": secondary,
            "--school-accent": accent,
            "--school-font": FONT_STACKS[fontKey],
          } as React.CSSProperties
        }
      >
        {children}
      </body>
    </html>
  );
}