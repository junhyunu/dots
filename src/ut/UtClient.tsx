"use client";
// UT 화면은 브라우저 저장소를 읽으므로 브라우저에서만 그린다 (시연 모드와 같은 방식)
import dynamic from "next/dynamic";

const loading = () => <div className="min-h-dvh" aria-busy="true" />;
const UtFlow = dynamic(() => import("./UtFlow"), { ssr: false, loading });
const UtWork = dynamic(() => import("./UtWork"), { ssr: false, loading });

export default function UtClient({ screen }: { screen: "flow" | "work" }) {
  return screen === "flow" ? <UtFlow /> : <UtWork />;
}
