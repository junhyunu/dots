"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Lock, Trash2 } from "lucide-react";
import { storyWritten } from "@/lib/domain/text";
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

/** 잠긴 스토리 탭 위 말풍선: 탭 줄(옆으로 넘기는 상자) 밖에 띄워 잘리지 않게 하고, 화면 밖으로 나가지 않게 당긴다.
 *  3초 뒤·다른 곳 누르기·Esc·화면 스크롤에 닫힌다. 색은 무채색 반전(잉크 바탕) — 파랑은 '선택됨' 표시라 쓰지 않음 */
function LockBubble({ anchor, onClose }: { anchor: HTMLElement; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; arrow: number } | null>(null);
  const place = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const r = anchor.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const left = Math.min(Math.max(16, cx - el.offsetWidth / 2), window.innerWidth - 16 - el.offsetWidth);
    setPos({ left, top: r.top - el.offsetHeight - 8, arrow: cx - left });
  }, [anchor]);
  useLayoutEffect(place, [place]);
  useEffect(() => {
    // 화면 스크롤이면 닫고, 탭 줄을 옆으로 넘기면(누른 탭이 화면 안으로 들어올 때 포함) 따라간다
    const scroll = (e: Event) => (e.target === document ? onClose() : place());
    const timer = window.setTimeout(onClose, 3000);
    const away = (e: PointerEvent) => !anchor.contains(e.target as Node) && onClose();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", scroll, { passive: true, capture: true });
    window.addEventListener("resize", onClose);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", scroll, { capture: true });
      window.removeEventListener("resize", onClose);
    };
  }, [anchor, onClose, place]);
  return createPortal(
    <div
      ref={ref}
      id="story-lock-note"
      role="status"
      style={pos ? { left: pos.left, top: pos.top } : { left: 0, top: 0, visibility: "hidden" }}
      className="fixed z-50 w-max max-w-[calc(100vw-32px)] rounded-[8px] bg-ink px-3 py-2 text-[13px] leading-[1.385] font-medium tracking-[0.0194em] whitespace-nowrap text-bg shadow-[0_4px_12px_-4px_rgb(0_0_0/0.3)] sm:text-sm sm:leading-[1.429] sm:tracking-[0.0145em]"
    >
      <span className="sm:hidden">경험을 완성하면 쓸 수 있어요</span>
      <span className="hidden sm:inline">경험을 완성하면 스토리를 쓸 수 있어요</span>
      {pos && <span aria-hidden className="absolute -bottom-1 size-2 -translate-x-1/2 rotate-45 bg-ink" style={{ left: pos.arrow }} />}
    </div>,
    document.body,
  );
}

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
  const [lockAnchor, setLockAnchor] = useState<HTMLElement | null>(null);
  const [step, setStep] = useState<Step>(
    initialStep && isEnabled(initialStep, STEPS.findIndex((s) => s.id === initialStep)) ? initialStep : STATUS_STEP[experience.status],
  );
  const closeLock = useCallback(() => setLockAnchor(null), []);
  const goTo = (s: Step) => {
    setLockAnchor(null);
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

  // 탭이 넘치는 폭(휴대폰)에서는 지금 단계 탭을 탭 줄 가운데로 데려온다: 다음 탭(스토리의 파란 점)도 함께 보이게.
  // 페이지는 움직이지 않게 탭 줄만 옆으로 넘긴다
  const navRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const nav = navRef.current;
    const tab = nav?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!nav || !tab || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollLeft = tab.offsetLeft - (nav.clientWidth - tab.offsetWidth) / 2;
  }, [step]);

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
          <h1 id="exp-title" className="text-xl font-bold tracking-tight break-keep sm:text-[28px]">
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

      {/* relative: 탭 안의 화면 읽기용 글자(sr-only, 절대 위치)가 탭 줄 밖으로 페이지를 넓히지 않게 이 줄 안에 가둔다 */}
      <nav ref={navRef} aria-label="진행 단계" className="relative mt-5 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ol className="flex min-w-max gap-1 border-b border-line">
          {STEPS.map((s, i) => {
            const enabled = isEnabled(s.id, i);
            const locked = s.id === "story" && storyLocked;
            const current = s.id === step;
            // 잠긴 탭에는 체크를 달지 않는다 (완성 전에 써 둔 스토리가 있어도 '다 함'과 '잠김'이 함께 보이지 않게)
            const done = s.id === "story" ? !locked && experience.stories.some(storyWritten) : i < reached || (i === reached && experience.status === "done");
            // 경험을 완성했는데 스토리가 아직 없으면 다음 할 일로 작은 점을 단다
            const nudge = s.id === "story" && experience.status === "done" && !done && !current;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={!enabled && !locked}
                  aria-disabled={locked || undefined}
                  aria-describedby={locked && lockAnchor ? "story-lock-note" : undefined}
                  onClick={(e) => (locked ? setLockAnchor(e.currentTarget) : goTo(s.id))}
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
                  <span className="text-xs tabular-nums">{i + 1}</span>
                  <span className="sm:hidden">{s.short}</span>
                  <span className="hidden sm:inline">{s.label}</span>
                  {done && <span className="sr-only">(완료)</span>}
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
      {lockAnchor && <LockBubble anchor={lockAnchor} onClose={closeLock} />}

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
