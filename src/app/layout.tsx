import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "烛之武退秦师 MVP",
  description: "语言行动 RPG 研究 Demo 的项目骨架"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
