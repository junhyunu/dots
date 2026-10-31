import type { Metadata } from "next";
import DemoClient from "@/components/demo/DemoClient";

export const metadata: Metadata = { title: "시연 — Dots 닷츠", robots: { index: false } };

export default function DemoHomePage() {
  return <DemoClient screen="home" />;
}
