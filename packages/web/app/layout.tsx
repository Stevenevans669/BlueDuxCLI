import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bluedux",
  description: "Private Markdown-aware file cloud",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
