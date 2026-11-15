import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Hikma — an AI assistant that knows your business", template: "%s · Hikma" },
  description: "Add an AI assistant to your website in 2 minutes. It answers your customers from your own information — in any language.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full antialiased ${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
