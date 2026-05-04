import type { Metadata } from "next";
import "./globals.css";
import { Layout } from "@/components/Layout";

export const metadata: Metadata = {
  title: "Romchi Market",
  description: "Deraza-eshik usta, sex va xizmatlar bozori",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz">
      <body>
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
