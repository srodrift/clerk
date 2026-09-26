import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Knot — Find the conflict",
  description:
    "Four sentences. Two cannot both be true. Pick the pair, then compare your judgment with Jev.",
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
