import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jury Concept Graph",
  description: "Build a juror → concept graph from past competition jury comments",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const devBodyAttributes = process.env.NODE_ENV === "development" ? { "cz-shortcut-listen": "" } : {};

  return (
    <html lang="en">
      <body {...devBodyAttributes}>{children}</body>
    </html>
  );
}

