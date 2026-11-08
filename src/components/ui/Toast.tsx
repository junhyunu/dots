"use client";
// 짧은 알림(토스트): "복사했어요"처럼 한 일을 화면 아래 가운데에 잠깐 보인다 (design.md "Toast").
// 화면 읽기 프로그램에도 읽히게 알림 영역(role="status")은 늘 있고, 글만 바뀐다.
// 쓰는 법: showToast("복사했어요"). 부품(ToastHost)은 app/layout.tsx에 한 번만 둔다.
import { useEffect, useRef, useState } from "react";

const SHOW_MS = 2000;

let push: ((message: string) => void) | null = null;

export function showToast(message: string) {
  push?.(message);
}

export default function ToastHost() {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    push = (next) => {
      clearTimeout(timer.current);
      // 같은 글을 다시 보여도 다시 읽히게 한 번 비웠다가 넣는다
      setMessage("");
      timer.current = setTimeout(() => {
        setMessage(next);
        setVisible(true);
        timer.current = setTimeout(() => setVisible(false), SHOW_MS);
      }, 30);
    };
    return () => {
      push = null;
      clearTimeout(timer.current);
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      // 홈 아래 역량 탭 막대에 가리지 않게 화면 아래에서 조금 띄운다
      className={`pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+96px)] z-[60] flex justify-center px-4 transition-[opacity,translate] duration-200 ease-out ${
        visible && message ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      {message && (
        <p className="max-w-full rounded-[8px] bg-ink px-4 py-2.5 text-sm font-medium text-bg shadow-[0_4px_12px_-4px_rgb(0_0_0/0.3)]">{message}</p>
      )}
    </div>
  );
}
