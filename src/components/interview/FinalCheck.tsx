"use client";
// 5단계가 끝난 뒤 한 번만 하는 전체 점검. 물을 것이 없으면 바로 원고 단계로 넘어간다.
import { CheckCircle2, FileText } from "lucide-react";
import { generate } from "@/lib/api";
import { toContext } from "@/lib/domain/context";
import { MAX_FINAL_CHECK_QUESTIONS } from "@/lib/domain/stages";
import type { Experience } from "@/lib/domain/types";
import { getStore, useAppStore } from "@/lib/store/useAppStore";
import { useAutoTask } from "@/lib/store/useTaskRunner";
import Button from "@/components/ui/Button";
import TaskState from "@/components/ui/TaskState";
import RoundCard from "./RoundCard";

export default function FinalCheck({ experience }: { experience: Experience }) {
  const { id, interview } = experience;
  const submitRound = useAppStore((s) => s.submitRound);
  const finishFinalCheck = useAppStore((s) => s.finishFinalCheck);
  const active = interview.currentStage === "final_check";
  const round = interview.finalCheck?.[0];

  const status = useAutoTask(`${id}:final_check`, active && interview.finalCheck === null, async () => {
    const exp = getStore().experiences[id];
    const r = await generate("final_check", { context: toContext(exp) });
    const qs = r.questions.slice(0, MAX_FINAL_CHECK_QUESTIONS);
    if (qs.length === 0) getStore().markFinalCheckEmpty(id);
    else getStore().addRound(id, "final_check", "final_check", qs);
  });

  const finish = (closedByUser: boolean) => {
    if (round) submitRound(id, round.id, closedByUser);
    finishFinalCheck(id);
  };

  return (
    <section aria-labelledby="final-check" className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
      <header className="mb-5">
        <p className="text-sm font-semibold text-primary-text">전체 점검</p>
        <h2 id="final-check" className="mt-0.5 text-lg font-bold sm:text-xl">
          원고를 쓰기 전에 마지막으로 확인할게요
        </h2>
      </header>

      <TaskState status={status} loadingText="단계 사이에 빠진 연결이 없는지 살펴보고 있어요" />

      {round && (
        <>
          <RoundCard experienceId={id} round={round} label="단계를 넘나드는 빈틈만 여쭤요" />
          {active && (
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => finish(true)}>
                건너뛰고 원고 만들기
              </Button>
              <Button onClick={() => finish(false)}>
                <FileText className="size-4" aria-hidden />
                답변 제출하고 원고 만들기
              </Button>
            </div>
          )}
        </>
      )}

      {interview.currentStage === "complete" && (
        <p className="mt-4 flex items-center gap-2 text-ink-soft">
          <CheckCircle2 className="size-4 text-ok" aria-hidden />
          {round ? "점검을 마쳤어요." : "더 여쭤볼 빈틈이 없었어요."} 원고는 ‘STAR 원고’ 탭에서 볼 수 있어요.
        </p>
      )}
    </section>
  );
}
