"use client";
import { useEffect, useState } from "react";
import { Check, Lock, Trash2 } from "lucide-react";
import type { Experience, ExperienceStatus } from "@/lib/domain/types";
import { useAppStore } from "@/lib/store/useAppStore";
import InterviewPanel from "@/components/interview/InterviewPanel";
import StarPanel from "@/components/draft/StarPanel";
import KeywordPanel from "@/components/draft/KeywordPanel";
import MatchPanel from "@/components/matching/MatchPanel";
import StoryPanel from "@/components/story/StoryPanel";
import { confirmAction } from "@/components/ui/ConfirmDialog";

export type Step = "interview" | "star" | "match" | "keyword" | "story";

const STEPS: { id: Step; label: string; short: string }[] = [
  { id: "interview", label: "질문", short: "질문" },
  { id: "star", label: "STAR 원고", short: "원고" },
  { id: "match", label: "역량 연결", short: "역량" },
  { id: "keyword", label: "역량 키워드", short: "키워드" },
  { id: "story", label: "스토리", short: "스토리" },
];

const STATUS_STEP: Record<ExperienceStatus, Step> = {
  interviewing: "interview",
  drafting: "star",
  matching: "match",
  keyword: "keyword",
  done: "keyword",
};

export default function ExperienceWorkspace({ experience, initialStep }: { experience: Experience; initialStep?: Step }) {
  const deleteExperience = useAppStore((s) => s.deleteExperience);
  const reached = STEPS.findIndex((s) => s.id === STATUS_STEP[experience.status]);
  // 스토리는 경험을 완성한 뒤에만 연다 (완성 전에는 잠근 탭으로 보이고, 누르면 안내만)
  const storyLocked = !experience.matchesConfirmed;
  const isEnabled = (s: Step, i: number) => (s === "story" ? !storyLocked : i <= reached);
  const [lockNote, setLockNote] = useState(false);
  const [step, setStep] = useState<Step>(
    initialStep && isEnabled(initialStep, STEPS.findIndex((s) => s.id === initialStep)) ? initialStep : STATUS_STEP[experience.status],
  );
  const goTo = (s: Step) => {
    setLockNote(false);
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

  const remove = async () => {
    const ok = await confirmAction({
      title: "이 경험을 삭제할까요?",
      body: `'${experience.basic.title}' 경험이 사라지고 되돌릴 수 없어요.`,
      confirmLabel: "삭제",
      tone: "danger",
    });
    if (ok) deleteExperience(experience.id);
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
          <Trash2 className="size-5" aria-hidden />
        </button>
      </header>

      <nav aria-label="진행 단계" className="mt-5 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ol className="flex min-w-max gap-1 border-b border-line">
          {STEPS.map((s, i) => {
            const enabled = isEnabled(s.id, i);
            const locked = s.id === "story" && storyLocked;
            const current = s.id === step;
            const done = s.id === "story" ? experience.stories.some((x) => x.body) : i < reached || (i === reached && experience.status === "done");
            // 경험을 완성했는데 스토리가 아직 없으면 다음 할 일로 작은 점을 단다
            const nudge = s.id === "story" && experience.status === "done" && !done && !current;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={!enabled && !locked}
                  aria-disabled={locked || undefined}
                  aria-describedby={locked && lockNote ? "story-lock-note" : undefined}
                  onClick={() => (locked ? setLockNote(true) : goTo(s.id))}
                  aria-current={current ? "step" : undefined}
                  className={`-mb-px flex min-h-11 cursor-pointer items-center gap-1.5 rounded-t-lg border-b-2 px-2.5 focus-visible:-outline-offset-2 sm:px-3 text-[15px] transition-colors duration-150 disabled:cursor-not-allowed ${
                    current
                      ? "border-primary font-semibold text-primary-text"
                      : locked
                        ? "border-transparent text-placeholder"
                        : "border-transparent text-ink-soft hover:text-ink disabled:text-placeholder"
                  }`}
                >
                  {done && <Check className="size-4" aria-hidden />}
                  {locked && <Lock className="size-3.5" aria-hidden />}
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
      {lockNote && (
        <p id="story-lock-note" role="status" className="mt-2 text-sm text-ink-soft">
          스토리는 역량 키워드 단계에서 경험을 완성하면 쓸 수 있어요.
        </p>
      )}

      <div className="mt-6">
        {step === "interview" && <InterviewPanel experience={experience} />}
        {step === "star" && <StarPanel experience={experience} />}
        {step === "match" && <MatchPanel experience={experience} onKeyword={() => goTo("keyword")} />}
        {step === "keyword" && <KeywordPanel experience={experience} onStory={() => goTo("story")} onMatch={() => goTo("match")} />}
        {step === "story" && <StoryPanel experience={experience} />}
      </div>
    </article>
  );
}
