import type { Metadata } from "next";
import "./globals.css";
import { wedding } from "@/config/wedding";

export const metadata: Metadata = {
  title: `Lista de Presentes | ${wedding.siteName}`,
  description: `Lista de presentes do casamento de ${wedding.brideName} e ${wedding.groomName}.`,
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
