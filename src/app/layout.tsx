import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "C.F.M.C — Can't Find My Chat",
  description:
    "C.F.M.C (Can't Find My Chat) — a secure, end-to-end encrypted chat. Messages are encrypted in your browser with ECDH + AES-GCM before they ever leave your device. Made by Macauly.",
  keywords: [
    "C.F.M.C",
    "Can't Find My Chat",
    "secure chat",
    "encrypted chat",
    "end-to-end encryption",
    "ECDH",
    "AES-GCM",
    "Macauly",
  ],
  authors: [{ name: "Macauly" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "C.F.M.C — Can't Find My Chat",
    description:
      "Secure, end-to-end encrypted chat. Made by Macauly.",
    siteName: "C.F.M.C",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "C.F.M.C — Can't Find My Chat",
    description: "Secure, end-to-end encrypted chat. Made by Macauly.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0f1f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
