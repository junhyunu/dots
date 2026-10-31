"use client";
// 시연 모드 띠: 실제 데이터와 분리돼 있음을 알리고, 구성 바꾸기·초기화·나가기를 제공한다.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FlaskConical, LogOut, PenLine, RotateCcw, Shuffle, WifiOff } from "lucide-react";
import { DEFAULT_SEED } from "@/content/demo/build";
import { FAIL_EVENT, isFailArmed, setFailArmed } from "@/content/demo/failSwitch";
import { href } from "@/lib/mode";
import { currentSeed, loadDemo } from "./demoState";

// 모바일은 위에 고정된 띠가 화면을 덜 가리도록 아이콘만 (이름은 화면 읽기 프로그램에 그대로 읽힘)
const btn = "press inline-flex min-h-11 min-w-11 justify-center sm:min-h-9 sm:min-w-0 cursor-pointer items-center gap-1 rounded-lg border border-bg/25 px-2.5 text-sm font-semibold";
const label = "sr-only sm:not-sr-only";

export default function DemoBar() {
  const [seed, setSeed] = useState(currentSeed);
  // [오류 흉내]: 다음 AI 요청 한 번 실패. 실패가 일어나면 대본 쪽에서 꺼지므로 그 알림을 받아 버튼도 맞춘다
  const [failArmed, setFailState] = useState(isFailArmed);
  useEffect(() => {
    const sync = () => setFailState(isFailArmed());
    window.addEventListener(FAIL_EVENT, sync);
    return () => window.removeEventListener(FAIL_EVENT, sync);
  }, []);
  // 띠를 위에 고정하고, 그 높이를 --top-offset으로 알려 상단바·사이드바가 비켜 서게 한다
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const root = document.documentElement;
    const ro = new ResizeObserver(() => root.style.setProperty("--top-offset", `${el.offsetHeight}px`));
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--top-offset");
    };
  }, []);
  const apply = (next: number, ask: string) => {
    if (!window.confirm(ask)) return;
    loadDemo(next);
    setSeed(next);
  };

  return (
    <div ref={barRef} role="region" aria-label="시연 모드" className="sticky top-0 z-40 bg-ink text-bg">
      <div className="mx-auto flex max-w-6xl items-center gap-x-3 gap-y-2 px-4 py-1.5 sm:flex-wrap sm:px-6 sm:py-2">
        <p className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
          <FlaskConical className="size-4 shrink-0" aria-hidden />
          <b className="font-semibold">시연 모드</b>
          <span className="hidden opacity-80 sm:inline">· 가상 데이터예요. 실제 경험과 따로 저장돼요</span>
          <span className="opacity-60 tabular-nums">· 구성 #{seed}</span>
        </p>
        <div className="flex shrink-0 gap-1.5 sm:flex-wrap">
          <Link href={href("/work?new=1")} className={btn}>
            <PenLine className="size-3.5" aria-hidden />
            <span className={label}>새 경험 시연</span>
          </Link>
          <button type="button" className={btn} onClick={() => apply(Math.floor(Math.random() * 9998) + 2, "역량별 경험 수를 새로 섞을까요? 시연 중 만든 경험도 사라져요.")}>
            <Shuffle className="size-3.5" aria-hidden />
            <span className={label}>다시 섞기</span>
          </button>
          <button type="button" className={btn} onClick={() => apply(DEFAULT_SEED, "처음 구성(#1)으로 되돌릴까요? 시연 중 만든 경험도 사라져요.")}>
            <RotateCcw className="size-3.5" aria-hidden />
            <span className={label}>처음 상태로</span>
          </button>
          <button
            type="button"
            aria-pressed={failArmed}
            title="켜면 다음 AI 요청 한 번이 연결 실패로 끝나요. 다시 시도하면 정상으로 이어져요."
            onClick={() => setFailArmed(!failArmed)}
            className={`${btn} ${failArmed ? "border-transparent bg-bg text-danger" : ""}`}
          >
            <WifiOff className="size-3.5" aria-hidden />
            <span className={label}>{failArmed ? "다음 요청 실패 예정" : "오류 흉내"}</span>
          </button>
          {/* 페이지를 새로 불러와야 실제 모드(실제 저장 공간)로 돌아간다 */}
          <a href="/" className={btn}>
            <LogOut className="size-3.5" aria-hidden />
            <span className={label}>나가기</span>
          </a>
        </div>
      </div>
    </div>
  );
}
