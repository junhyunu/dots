import type { Metadata } from "next";
import ClientApp from "@/components/ClientApp";

export const metadata: Metadata = { title: "경험 정리 — Dots 닷츠" };

export default function WorkPage() {
  return <ClientApp />;
}
