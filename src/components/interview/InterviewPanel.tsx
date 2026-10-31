"use client";
import { Check, ChevronDown } from "lucide-react";
import { STAGES } from "@/lib/domain/stages";
import type { Experience } from "@/lib/domain/types";
import RoundCard from "./RoundCard";
import SummaryCard from "./SummaryCard";
import ActiveStage from "./ActiveStage";
import FinalCheck from "./FinalCheck";

function Progress({ experience }: { experience: Experience }) {
  const { interview } = experience;
  const steps = [
    ...STAGES.map((s) => ({ key: s.id, name: s.name, state: interview.stages[s.id].status })),
    {
      key: "final_check",
      name: "점검",
      state: interview.currentStage === "complete" ? "done" : interview.currentStage === "final_check" ? "active" : "pending",
    },
  ];
  return (
    <ol aria-label="질문 진행" className="mb-6 flex items-center">
      {steps.map((s, i) => (
        <li key={s.key} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <span
              aria-current={s.state === "active" ? "step" : undefined}
              className={`flex size-7 items-center justify-center rounded-full border-2 text-xs font-semibold ${
                s.state === "done"
                  ? "border-primary bg-primary-fill text-on-primary"
                  : s.state === "active"
                    ? "border-primary bg-surface text-primary-text"
                    : "border-line-strong bg-surface text-ink-faint"
              }`}
            >
              {s.state === "done" ? <Check className="size-3.5" aria-hidden /> : i + 1}
            </span>
            <span className={`text-xs ${s.state === "pending" ? "text-ink-faint" : "text-ink"}`}>{s.name}</span>
          </div>
          {i < steps.length - 1 && (
            <span aria-hidden className={`mx-1 mb-5 h-0.5 flex-1 ${s.state === "done" ? "bg-primary-fill" : "bg-line"}`} />
          )}
        </li>
      ))}
    </ol>
  );
}

export default function InterviewPanel({ experience }: { experience: Experience }) {
  const { interview, id } = experience;

  return (
    <div>
      <Progress experience={experience} />

      <div className="space-y-4">
        {STAGES.map((def) => {
          const log = interview.stages[def.id];
          if (log.status === "pending") return null;
          if (log.status === "active") return <ActiveStage key={def.id} experience={experience} stage={def.id} />;

          // 끝난 단계: 접어 두고, 펼치면 답과 요약을 고칠 수 있다
          let n = 0;
          return (
            <details key={def.id} className="group rounded-2xl border border-line bg-surface">
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 sm:px-6 [&::-webkit-details-marker]:hidden">
                <Check className="size-4 shrink-0 text-primary-text" aria-hidden />
                <span className="shrink-0 font-semibold">{def.name}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">{log.summary}</span>
                <ChevronDown className="size-4 shrink-0 text-ink-faint transition-transform duration-150 group-open:rotate-180" aria-hidden />
              </summary>
              <div className="space-y-6 border-t border-line px-4 py-5 sm:px-6">
                {log.summary && <SummaryCard experienceId={id} stage={def.id} summary={log.summary} edited={log.summaryEdited} />}
                {log.rounds.map((r) => {
                  const start = n + 1;
                  n += r.items.length;
                  return (
                    <RoundCard key={r.id} experienceId={id} round={r} startNumber={start} label={r.kind === "followup" ? "추가 질문" : undefined} />
                  );
                })}
                <p className="text-sm text-ink-faint">여기서 고친 답은 원고를 다시 생성할 때 반영돼요.</p>
              </div>
            </details>
          );
        })}

        {(interview.currentStage === "final_check" || interview.currentStage === "complete") && <FinalCheck experience={experience} />}
      </div>
    </div>
  );
}
