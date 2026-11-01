import type { Metadata } from "next";
import UtClient from "@/ut/UtClient";

export const metadata: Metadata = { title: "사용성 테스트 — Dots 닷츠", robots: { index: false } };

export default function UtPage() {
  return <UtClient screen="flow" />;
}
