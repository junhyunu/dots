"use client";
// UT 설문용 단순한 입력 부품: 5점 척도, 하나 고르기, 글 입력. Dots 디자인 토큰만 쓴다.
import type { ReactNode } from "react";
import AutoTextarea from "@/components/ui/AutoTextarea";
import { SCALE_LABELS } from "./questions";

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="space-y-5 rounded-2xl border border-line bg-surface p-4 sm:p-6">
      {title && <h2 className="text-lg font-bold break-keep">{title}</h2>}
      {children}
    </section>
  );
}

/** 5점 척도: 1 전혀 아니다 ~ 5 매우 그렇다 */
export function Likert({ name, label, value, onChange }: { name: string; label: string; value: number | null; onChange: (v: number) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 font-medium leading-relaxed break-keep">{label}</legend>
      <div className="grid grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-line-strong bg-surface text-[15px] font-semibold transition-colors duration-150 has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:checked]:text-primary-text has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary"
          >
            <input type="radio" name={name} value={n} checked={value === n} onChange={() => onChange(n)} className="sr-only" />
            {n}
          </label>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-ink-faint">
        <span>1 {SCALE_LABELS[0]}</span>
        <span>5 {SCALE_LABELS[1]}</span>
      </div>
    </fieldset>
  );
}

/** 하나 고르기 (보기 목록) */
export function Choice({ name, label, options, value, onChange }: { name: string; label: string; options: readonly string[]; value: string; onChange: (v: string) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 font-medium leading-relaxed break-keep">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o}
            className="flex min-h-11 cursor-pointer items-center rounded-lg border border-line-strong bg-surface px-4 text-[15px] transition-colors duration-150 has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:checked]:font-semibold has-[:checked]:text-primary-text has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary"
          >
            <input type="radio" name={name} value={o} checked={value === o} onChange={() => onChange(o)} className="sr-only" />
            {o}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function TextField({ id, label, value, onChange, optional, multiline, placeholder }: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  optional?: boolean;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-medium leading-relaxed break-keep">
        {label}
        {optional && <span className="ml-1 text-sm font-normal text-ink-faint">선택</span>}
      </label>
      {multiline ? (
        <AutoTextarea id={id} value={value} onChange={(e) => onChange(e.target.value)} minRows={3} placeholder={placeholder} />
      ) : (
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-11 w-full rounded-lg border border-line-strong bg-surface px-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      )}
    </div>
  );
}
