"use client";
// 단순한 입력 부품: 하나 고르기, 글 입력. Dots 디자인 토큰만 쓴다. (UT 설문용으로 만든 것을 의견 남기기에 이어 씀)
import AutoTextarea from "@/components/ui/AutoTextarea";

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
