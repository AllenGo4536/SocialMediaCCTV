import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/auth-provider";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ViraX - 社媒博主定向监控系统",
  description: "ViraX 内部工具，专注于 Instagram 博主数据监控、素材采集与趋势分析。",
  icons: {
    icon: '/logo.png',
  },
  openGraph: {
    title: "ViraX - 社媒博主定向监控系统",
    description: "高效采集与分析 Instagram 博主最新动态。",
    images: ['/logo.png'],
    siteName: 'ViraX Internal',
    locale: 'zh_CN',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
