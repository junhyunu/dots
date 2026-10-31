"use client";
// 저장 데이터가 브라우저(localStorage)에만 있으므로 화면은 브라우저에서만 그린다.
import dynamic from "next/dynamic";

const AppShell = dynamic(() => import("./AppShell"), {
  ssr: false,
  loading: () => <div className="min-h-dvh" aria-busy="true" />,
});

export default function ClientApp() {
  return <AppShell />;
}
