import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "知海｜记录学习，按时重逢",
  description: "以月历记录学习轨迹，用动态复习计划让知识沉淀为长期记忆。",
  openGraph: {
    title: "知海｜记录学习，按时重逢",
    description: "记录今天学了什么，在即将遗忘时按时重逢。",
    images: [{ url: "/og.png", width: 1728, height: 920, alt: "知海学习月历与动态复习计划" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
