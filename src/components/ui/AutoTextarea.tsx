"use client";
import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";

/** 내용에 맞춰 높이가 늘어나는 입력칸 */
export default function AutoTextarea({ className = "", value, minRows = 3, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { minRows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      rows={minRows}
      className={`block w-full resize-none rounded-lg border border-line-strong bg-surface p-3 text-base leading-[1.625] text-ink shadow-[0_1px_2px_-1px_rgb(23_23_23/0.1)] placeholder:text-placeholder focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-subtle disabled:text-ink-soft ${className}`}
      {...rest}
    />
  );
}
