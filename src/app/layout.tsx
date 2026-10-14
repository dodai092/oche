import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Oche | Every dart counts",
  description:
    "Your local darts room. Score x01 matches, track your progress, and find your finish.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
