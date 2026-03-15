import type { Metadata } from "next";
import "./globals.css";
import AppNav from "@/components/nav/AppNav";

export const metadata: Metadata = {
  title: "SuperNova Tools",
  description: "Tournament calculator and FB Ads dashboard for SuperNova Badminton Club",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppNav />
        {children}
      </body>
    </html>
  );
}
