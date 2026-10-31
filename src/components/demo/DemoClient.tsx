"use client";
// 시연 데이터도 브라우저에만 있으므로 브라우저에서만 그린다.
import dynamic from "next/dynamic";

const DemoRoot = dynamic(() => import("./DemoRoot"), {
  ssr: false,
  loading: () => <div className="min-h-dvh" aria-busy="true" />,
});

export default function DemoClient({ screen }: { screen: "home" | "work" }) {
  return <DemoRoot screen={screen} />;
}
