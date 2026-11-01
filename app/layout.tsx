import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Switchboard — Agent Operations",
  description:
    "An agent-operations interface with an animated relay graph, run traces, model-usage charts and evaluation comparisons. Demo data only.",
};

export const viewport: Viewport = {
  themeColor: "#06060b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
