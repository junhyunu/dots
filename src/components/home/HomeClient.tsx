"use client";
// 저장 데이터가 브라우저에만 있으므로 홈도 브라우저에서만 그린다.
import dynamic from "next/dynamic";

const HomePage = dynamic(() => import("./HomePage"), {
  ssr: false,
  loading: () => <div className="min-h-dvh" aria-busy="true" />,
});

export default function HomeClient() {
  return <HomePage />;
}
