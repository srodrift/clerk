import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Unsent — Don’t send it yet.",
  description:
    "Check the reply you are about to send against the promises you already made.",
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
