"use client";
import { useState, type FormEvent } from "react";
import { ArrowRight, Wand2 } from "lucide-react";
import { DEMO } from "@/lib/mode";
import { useAppStore } from "@/lib/store/useAppStore";
import Button from "@/components/ui/Button";

const FIELDS = [
  { key: "title", label: "경험명", placeholder: "예) 일본 여행 콘텐츠 탐색·저장 서비스 팀 프로젝트", required: true },
  { key: "period", label: "시기", placeholder: "예) 2025년 8~9월, 2개월", required: false },
  { key: "role", label: "역할", placeholder: "예) 유저 리서치, 화면 디자인, 디자인 시스템 구축", required: false },
] as const;

export default function NewExperienceForm() {
  const createExperience = useAppStore((s) => s.createExperience);
  const hasAny = useAppStore((s) => s.experienceOrder.length > 0);
  const [values, setValues] = useState({ title: "", period: "", role: "" });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!values.title.trim()) return;
    createExperience({ title: values.title.trim(), period: values.period.trim(), role: values.role.trim() });
  };

  return (
    <section aria-labelledby="new-title" className="mx-auto max-w-xl">
      <h1 id="new-title" className="text-2xl font-bold tracking-tight sm:text-[28px]">
        {hasAny ? "새 경험 정리하기" : "경험 하나부터 정리해 볼까요?"}
      </h1>
      <p className="mt-2 text-ink-soft">
        경험 하나를 적으면 상황 → 목표 → 행동 → 결과 → 배운 점 순서로 질문을 드려요. 답이 모이면 자기소개서·면접에 쓸 수 있는 STAR 원고로 정리해 드립니다.
      </p>

      {DEMO && (
        <button
          type="button"
          onClick={async () => setValues((await import("@/content/demo/script")).DEMO_BASIC)}
          className="press mt-6 inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-lg border border-dashed border-primary px-3 text-sm font-semibold text-primary-text sm:min-h-9"
        >
          <Wand2 className="size-4" aria-hidden />
          예시로 채우기
        </button>
      )}

      <form onSubmit={submit} className="mt-8 space-y-5">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label htmlFor={`f-${f.key}`} className="mb-1.5 block font-medium">
              {f.label}
              {f.required ? <span className="ml-1 text-primary-text">*</span> : <span className="ml-1.5 text-sm font-normal text-ink-faint">선택</span>}
            </label>
            <input
              id={`f-${f.key}`}
              value={values[f.key]}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              required={f.required}
              className="block min-h-12 w-full rounded-lg border border-line-strong bg-surface px-3 text-base placeholder:text-placeholder focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        ))}
        <p className="text-sm text-ink-faint">편하게 적어도 괜찮아요. 정리는 나중에 함께 합니다.</p>
        <Button type="submit" disabled={!values.title.trim()} className="w-full sm:w-auto">
          질문 시작하기
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </form>
    </section>
  );
}
