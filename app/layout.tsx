import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wealth — Personal finance, made clear",
  description: "A calm, focused view of your money.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
