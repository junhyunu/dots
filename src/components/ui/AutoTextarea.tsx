"use client";
import { useEffect, useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";

/** 내용에 맞춰 높이가 늘어나는 입력칸. maxHeight를 주면 그 높이부터는 칸 안에서 스크롤한다 (창 안처럼 자리가 좁은 곳만) */
export default function AutoTextarea({ className = "", value, minRows = 3, maxHeight, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { minRows?: number; maxHeight?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fit = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    // 아직 화면에 보이지 않으면(예: 열리기 전의 창) 높이를 잴 수 없어 0이 나온다 → rows대로 둔다
    if (el.scrollHeight === 0) return;
    el.style.height = `${el.scrollHeight + 2}px`;
  };
  useLayoutEffect(fit, [value]);
  // 창 폭이 바뀌면(휴대폰을 돌리거나 창을 줄이면) 줄 수가 달라지므로 다시 잰다
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let width = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      fit();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <textarea
      ref={ref}
      value={value}
      rows={minRows}
      style={maxHeight ? { maxHeight, overflowY: "auto" } : undefined}
      className={`block w-full resize-none rounded-lg border border-line-strong bg-surface p-3 text-base leading-[1.625] text-ink shadow-[0_1px_2px_-1px_rgb(23_23_23/0.1)] placeholder:text-placeholder focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-subtle disabled:text-ink-soft ${className}`}
      {...rest}
    />
  );
}
