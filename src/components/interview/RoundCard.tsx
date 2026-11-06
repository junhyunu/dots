"use client";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Info, Wand2 } from "lucide-react";
import { DEMO } from "@/lib/mode";
import type { QARound } from "@/lib/domain/types";
import { useAppStore } from "@/lib/store/useAppStore";
import AutoTextarea from "@/components/ui/AutoTextarea";

interface Props {
  experienceId: string;
  round: QARound;
  /** 질문 번호를 이어서 매기기 위한 시작 번호 */
  startNumber?: number;
  label?: string;
  /** 제출한 묶음: 접어서 요약으로 보여 주고, 펼치면 고칠 수 있다 */
  collapsible?: boolean;
}

/** 질문 묶음 하나. 답변은 입력 즉시 저장된다. */
export default function RoundCard({ experienceId, round, startNumber = 1, label, collapsible = false }: Props) {
  const updateAnswer = useAppStore((s) => s.updateAnswer);
  const toggleSkip = useAppStore((s) => s.toggleSkip);
  const [expanded, setExpanded] = useState(false);

  // 펼치기·접기 버튼이 서로 바뀌며 사라지므로 키보드로 눌렀을 때만 위치를 옮긴다.
  // 마우스·터치에는 하지 않는다 (휴대폰에서 답변 칸에 초점이 가면 키보드가 뜰 수 있어서)
  const moved = useRef(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const expandRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    const body = bodyRef.current;
    (expanded ? (body?.querySelector("textarea") ?? body?.querySelector("button")) : expandRef.current)?.focus({ preventScroll: true });
  }, [expanded]);
  const toggle = (e: MouseEvent, next: boolean) => {
    moved.current = e.detail === 0;
    setExpanded(next);
  };

  if (collapsible && !expanded) {
    const answered = round.items.filter((i) => !i.skipped && i.answer.trim()).length;
    const skipped = round.items.filter((i) => i.skipped).length;
    return (
      <div className="rounded-xl border border-line bg-subtle p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="flex items-center gap-1.5 font-semibold">
            <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden />
            {label ? `${label} · ` : ""}답변 {answered}개 제출함
            {skipped > 0 && <span className="ml-1 font-normal text-ink-soft">· 기억 안 남 {skipped}개</span>}
          </p>
          <button
            ref={expandRef}
            type="button"
            onClick={(e) => toggle(e, true)}
            aria-expanded={false}
            className="press -my-2 inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 text-sm font-medium text-ink-soft sm:min-h-9"
          >
            펼쳐서 고치기
            <ChevronDown className="size-4" aria-hidden />
          </button>
        </div>
        <ol className="mt-3 space-y-2 text-[15px]">
          {round.items.map((item, i) => (
            <li key={item.id} className="min-w-0">
              <p className="truncate text-ink-soft">
                <span className="mr-1 tabular-nums">Q{startNumber + i}.</span>
                {item.question}
              </p>
              <p className="line-clamp-2 text-ink">{item.skipped ? <span className="text-ink-soft">기억 안 남</span> : item.answer.trim() || <span className="text-ink-soft">답변 없음</span>}</p>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div ref={bodyRef} className="space-y-6">
      {collapsible && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={(e) => toggle(e, false)}
            aria-expanded
            className="press inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-lg px-2 text-sm font-medium text-ink-soft sm:min-h-9"
          >
            접기
            <ChevronUp className="size-4" aria-hidden />
          </button>
        </div>
      )}
      {(label || (DEMO && !round.submittedAt)) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {label ? <p className="text-sm font-semibold text-primary-text">{label}</p> : <span />}
          {/* 시연 모드: 빈 답에 대본의 예시 답변을 채운다 */}
          {DEMO && !round.submittedAt && (
            <button
              type="button"
              onClick={async () => {
                const { demoAnswer } = await import("@/content/demo/script");
                for (const item of round.items) if (!item.skipped && !item.answer.trim()) updateAnswer(experienceId, round.id, item.id, demoAnswer(item.question));
              }}
              className="press inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-lg border border-dashed border-primary px-3 text-sm font-semibold text-primary-text sm:min-h-9"
            >
              <Wand2 className="size-4" aria-hidden />
              예시 답변 넣기
            </button>
          )}
        </div>
      )}
      {round.items.map((item, i) => {
        const fieldId = `a-${item.id}`;
        return (
          <div key={item.id}>
            <label htmlFor={fieldId} className="block font-medium leading-relaxed break-keep sm:text-lg sm:font-semibold">
              <span className="mr-1.5 text-primary-text tabular-nums">Q{startNumber + i}.</span>
              {item.question}
            </label>
            {item.reason && (
              <p id={`${fieldId}-why`} className="mt-1 flex items-start gap-1.5 text-sm text-ink-soft">
                <Info className="mt-0.5 size-3.5 shrink-0 text-ink-faint" aria-hidden />
                {item.reason}
              </p>
            )}
            <div className="mt-2">
              {item.skipped ? (
                <div className="rounded-lg border border-dashed border-line-strong bg-subtle px-3 py-3 text-ink-soft">
                  기억 안 남 — 이 질문은 다시 묻지 않아요.
                </div>
              ) : (
                <AutoTextarea
                  id={fieldId}
                  aria-describedby={item.reason ? `${fieldId}-why` : undefined}
                  value={item.answer}
                  onChange={(e) => updateAnswer(experienceId, round.id, item.id, e.target.value)}
                  placeholder="편하게 적어 주세요. 짧게, 반말로 써도 괜찮아요."
                  minRows={3}
                />
              )}
            </div>
            <div className="mt-1.5 flex justify-end">
              <button
                type="button"
                onClick={() => toggleSkip(experienceId, round.id, item.id)}
                // "기억 안 남" ↔ "답변 다시 쓰기"는 같은 글자 버튼 (상태는 위 점선 칸이 보여 줌, 파랑 = 선택 표시라 쓰지 않음)
                className="min-h-11 cursor-pointer rounded-lg px-3 text-sm text-ink-soft transition-colors duration-150 hover:bg-subtle hover:text-ink sm:min-h-9"
              >
                {item.skipped ? "답변 다시 쓰기" : "기억 안 남"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
