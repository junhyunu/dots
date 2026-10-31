import type { Metadata } from "next";
import DemoClient from "@/components/demo/DemoClient";

export const metadata: Metadata = { title: "시연: 경험 정리 — Dots 닷츠", robots: { index: false } };

export default function DemoWorkPage() {
  return <DemoClient screen="work" />;
}
