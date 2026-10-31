"use client";
import { useEffect, useState } from "react";
import { Check, Trash2 } from "lucide-react";
import type { Experience, ExperienceStatus } from "@/lib/domain/types";
import { useAppStore } from "@/lib/store/useAppStore";
import InterviewPanel from "@/components/interview/InterviewPanel";
import StarPanel from "@/components/draft/StarPanel";
import KeywordPanel from "@/components/draft/KeywordPanel";
import MatchPanel from "@/components/matching/MatchPanel";
import StoryPanel from "@/components/story/StoryPanel";

export type Step = "interview" | "star" | "keyword" | "match" | "story";

const STEPS: { id: Step; label: string; short: string }[] = [
  { id: "interview", label: "질문", short: "질문" },
  { id: "star", label: "STAR 원고", short: "원고" },
  { id: "keyword", label: "역량 키워드", short: "키워드" },
  { id: "match", label: "역량 연결", short: "역량" },
  { id: "story", label: "스토리", short: "스토리" },
];

const STATUS_STEP: Record<ExperienceStatus, Step> = {
  interviewing: "interview",
  drafting: "star",
  keyword: "keyword",
  matching: "match",
  done: "match",
};

export default function ExperienceWorkspace({ experience, initialStep }: { experience: Experience; initialStep?: Step }) {
  const deleteExperience = useAppStore((s) => s.deleteExperience);
  const reached = STEPS.findIndex((s) => s.id === STATUS_STEP[experience.status]);
  // 스토리는 STAR 원고만 있으면 언제든 열 수 있다
  const isEnabled = (s: Step, i: number) => i <= reached || (s === "story" && !!experience.star);
  const [step, setStep] = useState<Step>(
    initialStep && isEnabled(initialStep, STEPS.findIndex((s) => s.id === initialStep)) ? initialStep : STATUS_STEP[experience.status],
  );
  const goTo = (s: Step) => {
    setStep(s);
    window.scrollTo({ top: 0 });
  };

  // 다음 단계로 넘어가면 화면도 따라간다 (처음 열 때는 제외).
  // 상태가 바뀌어도 보여 줄 단계가 같으면(역량 연결 → 완성) 위로 올리지 않는다
  const [lastStatus, setLastStatus] = useState(experience.status);
  useEffect(() => {
    if (experience.status === lastStatus) return;
    setLastStatus(experience.status);
    const target = STATUS_STEP[experience.status];
    if (target !== step) goTo(target);
  }, [experience.status, lastStatus, step]);

  const remove = () => {
    if (window.confirm(`'${experience.basic.title}' 경험을 삭제할까요? 되돌릴 수 없어요.`)) deleteExperience(experience.id);
  };

  const { basic } = experience;
  return (
    <article aria-labelledby="exp-title">
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 id="exp-title" className="text-xl font-bold tracking-tight break-keep sm:text-2xl">
            {basic.title}
          </h1>
          {(basic.period || basic.role) && (
            <p className="mt-1 text-sm text-ink-soft">{[basic.period, basic.role].filter(Boolean).join(" · ")}</p>
          )}
        </div>
        <button
          type="button"
          onClick={remove}
          aria-label="이 경험 삭제"
          className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink-faint hover:bg-danger-soft hover:text-danger"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </header>

      <nav aria-label="진행 단계" className="mt-5 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ol className="flex min-w-max gap-1 border-b border-line">
          {STEPS.map((s, i) => {
            const enabled = isEnabled(s.id, i);
            const current = s.id === step;
            const done = s.id === "story" ? experience.stories.some((x) => x.body) : i < reached || (i === reached && experience.status === "done");
            // 경험을 완성했는데 스토리가 아직 없으면 다음 할 일로 작은 점을 단다
            const nudge = s.id === "story" && experience.status === "done" && !done && !current;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={!enabled}
                  onClick={() => goTo(s.id)}
                  aria-current={current ? "step" : undefined}
                  className={`-mb-px flex min-h-11 cursor-pointer items-center gap-1.5 rounded-t-lg border-b-2 px-2.5 focus-visible:-outline-offset-2 sm:px-3 text-[15px] transition-colors duration-150 disabled:cursor-not-allowed ${
                    current ? "border-primary font-semibold text-primary-text" : "border-transparent text-ink-soft hover:text-ink disabled:text-placeholder"
                  }`}
                >
                  {done && <Check className="size-4" aria-hidden />}
                  <span className="text-xs tabular-nums opacity-70">{i + 1}</span>
                  <span className="sm:hidden">{s.short}</span>
                  <span className="hidden sm:inline">{s.label}</span>
                  {nudge && (
                    <>
                      <span aria-hidden className="-mt-2 size-1.5 rounded-full bg-primary" />
                      <span className="sr-only">(다음 할 일)</span>
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="mt-6">
        {step === "interview" && <InterviewPanel experience={experience} />}
        {step === "star" && <StarPanel experience={experience} onStory={() => goTo("story")} />}
        {step === "keyword" && <KeywordPanel experience={experience} />}
        {step === "match" && <MatchPanel experience={experience} onStory={() => goTo("story")} />}
        {step === "story" && <StoryPanel experience={experience} onContinue={() => goTo(STATUS_STEP[experience.status])} />}
      </div>
    </article>
  );
}
