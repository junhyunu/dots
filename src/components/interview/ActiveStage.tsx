"use client";
// 진행 중인 단계 하나: 첫 질문 → 답변 제출 → AI 검토(추가 질문 또는 요약) → 다음 단계
import { useEffect, useLayoutEffect, useRef } from "react";
import { ArrowRight, Send } from "lucide-react";
import { generate } from "@/lib/api";
import { toContext } from "@/lib/domain/context";
import { MAX_FOLLOWUP_ROUNDS, nextStage, stageDef } from "@/lib/domain/stages";
import type { Experience, StageId } from "@/lib/domain/types";
import { getStore, useAppStore } from "@/lib/store/useAppStore";
import { useAutoTask } from "@/lib/store/useTaskRunner";
import Button from "@/components/ui/Button";
import TaskState from "@/components/ui/TaskState";
import RoundCard from "./RoundCard";
import SummaryCard from "./SummaryCard";

const latest = (id: string) => getStore().experiences[id];

export default function ActiveStage({ experience, stage }: { experience: Experience; stage: StageId }) {
  const { id } = experience;
  const log = experience.interview.stages[stage];
  const def = stageDef(stage);
  const submitRound = useAppStore((s) => s.submitRound);
  const advanceStage = useAppStore((s) => s.advanceStage);

  const last = log.rounds.at(-1);
  const open = last && !last.submittedAt ? last : null;
  const awaitingReview = last && last.submittedAt && !last.reviewed ? last : null;
  const ready = !!last && last.reviewed && !open && !!log.summary;

  // 1) 첫 질문 자동 생성
  const questionsStatus = useAutoTask(`${id}:questions:${stage}`, log.rounds.length === 0, async () => {
    const r = await generate("questions", { context: toContext(latest(id)), stage });
    getStore().addRound(id, stage, "initial", r.questions.slice(0, 4).map((q) => ({ question: q.question })));
  });

  // 2) 제출된 라운드 검토 (새로고침으로 끊겨도 다시 이어진다)
  const reviewKey = `${id}:review:${awaitingReview?.id ?? "none"}`;
  const reviewStatus = useAutoTask(reviewKey, !!awaitingReview, async () => {
    const exp = latest(id);
    const stageLog = exp.interview.stages[stage];
    const round = stageLog.rounds.find((r) => r.id === awaitingReview!.id)!;
    const followupCount = stageLog.rounds.filter((r) => r.kind === "followup").length;
    const r = await generate("followup", {
      context: toContext(exp),
      stage,
      followupCount,
      forceComplete: round.closedByUser,
    });
    const allowMore = !round.closedByUser && !r.sufficient && followupCount < MAX_FOLLOWUP_ROUNDS;
    getStore().applyReview(id, stage, round.id, r.summary, allowMore ? r.questions.slice(0, 3) : []);
  });

  // 제출한 뒤 화면 안내: 제출 직후엔 접힌 답변과 "읽는 중"을 보여 주고,
  // 새 질문이 오면 그 묶음으로, 요약이 오면 요약으로 데려간다. (새로고침으로 다시 열 때는 움직이지 않는다)
  const follow = useRef(false);
  const reviewRef = useRef<HTMLDivElement>(null);
  const openRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const submit = (closedByUser?: boolean) => {
    if (!open) return;
    follow.current = true;
    submitRound(id, open.id, closedByUser);
  };
  // 제출 직후: 답변이 접혀 화면이 짧아지므로, 칠하기 전에 "읽는 중" 위치로 바로 맞춘다 (튀어 보이지 않게)
  useLayoutEffect(() => {
    if (!follow.current || !awaitingReview || !reviewRef.current) return;
    reviewRef.current.scrollIntoView({ block: "center" });
    reviewRef.current.focus({ preventScroll: true });
  }, [awaitingReview?.id]);
  useEffect(() => {
    if (!follow.current) return;
    const target = open ? openRef.current : ready ? summaryRef.current : null;
    if (!target) return;
    follow.current = false;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
    (target.querySelector("textarea") ?? target).focus({ preventScroll: true });
  }, [open?.id, ready]);

  const canSubmit = !!open && open.items.some((i) => i.skipped || i.answer.trim());
  const numberOffset = log.rounds.slice(0, -1).reduce((n, r) => n + r.items.length, 0);
  const next = nextStage(stage);

  return (
    <section aria-labelledby={`stage-${stage}`} className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
      <header className="mb-5">
        <p className="text-sm font-semibold text-primary-text">{def.name}</p>
        <h2 id={`stage-${stage}`} className="mt-0.5 text-lg font-bold break-keep sm:text-xl">
          {def.title}
        </h2>
        {def.hint && <p className="mt-1 text-sm text-ink-faint break-keep">{def.hint}</p>}
      </header>

      {/* 이미 답한 라운드 (이 단계 안) */}
      {log.rounds
        .filter((r) => r !== open)
        .map((r, idx) => (
          <div key={r.id} className="mb-6 border-b border-line pb-6">
            <RoundCard
              experienceId={id}
              round={r}
              startNumber={1 + log.rounds.slice(0, idx).reduce((n, x) => n + x.items.length, 0)}
              label={r.kind === "followup" ? "추가 질문" : undefined}
              collapsible
            />
          </div>
        ))}

      <TaskState status={questionsStatus} loadingText="이 경험에 맞는 질문을 만들고 있어요" />
      <div ref={reviewRef} tabIndex={-1} className="scroll-mt-[calc(var(--top-offset)+5rem)] focus:outline-none">
        <TaskState status={reviewStatus} loadingText="답변을 읽고 빈 곳을 찾고 있어요" />
      </div>

      {open && (
        <div ref={openRef} tabIndex={-1} className="scroll-mt-[calc(var(--top-offset)+5rem)] focus:outline-none lg:scroll-mt-[calc(var(--top-offset)+2rem)]">
          <RoundCard
            experienceId={id}
            round={open}
            startNumber={numberOffset + 1}
            label={open.kind === "followup" ? `추가 질문 ${open.items.length}개 — 비어 있거나 모호한 부분만 여쭤요` : undefined}
          />
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {/* 추가 질문에서만: 첫 질문은 "기억 안 남"으로 넘긴다 (첫 질문에서 넘기면 빈 단계가 생김, 사용자 결정) */}
            {open.kind === "followup" && (
              <Button
                variant="ghost"
                onClick={() => submit(true)}
                title="지금까지 답한 내용으로 이 단계를 마칩니다"
              >
                충분해요, 다음으로
              </Button>
            )}
            <Button disabled={!canSubmit} onClick={() => submit()}>
              <Send className="size-4" aria-hidden />
              답변 제출
            </Button>
          </div>
        </div>
      )}

      {ready && (
        <div ref={summaryRef} tabIndex={-1} className="scroll-mt-[calc(var(--top-offset)+5rem)] space-y-4 focus:outline-none lg:scroll-mt-[calc(var(--top-offset)+2rem)]">
          <SummaryCard experienceId={id} stage={stage} summary={log.summary!} edited={log.summaryEdited} />
          <div className="flex justify-end">
            <Button onClick={() => advanceStage(id, stage)}>
              {next ? `다음 단계: ${stageDef(next).name}` : "전체 점검으로"}
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
