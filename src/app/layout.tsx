import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ConditionalShell } from "@/components/layout/conditional-shell";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EDA CRM",
  description: "以客户为主线的销售机会与阶段文件管理",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className={`${geist.variable} h-full`}>
      <body className="min-h-full antialiased">
        <ConditionalShell>{children}</ConditionalShell>
      </body>
    </html>
  );
}
