"use client";
// /ut/work: 실제 작업 화면(실제 AI) + 위쪽 UT 띠. 단계별 시간·AI 실패 횟수를 기록하고,
// "경험 완성하기"(상태 done) 또는 [테스트 그만하기]로 사후 질문(/ut)으로 넘어간다.
import { useEffect, useRef } from "react";
import { FlaskConical, Square } from "lucide-react";
import AppShell from "@/components/AppShell";
import { confirmAction } from "@/components/ui/ConfirmDialog";
import { AI_FAIL_EVENT } from "@/lib/mode";
import { useAppStore } from "@/lib/store/useAppStore";
import { countFollowups, moveStage, readUt, stageLabel, stageOf, writeUt } from "./state";

/** UT 대상 경험: 테스트를 시작한 뒤 처음 만든 경험 */
function trackedExperience() {
  const s = useAppStore.getState();
  const ut = readUt();
  const id = ut.experienceId ?? s.activeExperienceId;
  const exp = id ? s.experiences[id] : undefined;
  if (!exp || (ut.startedAt && exp.createdAt < ut.startedAt)) return undefined;
  return exp;
}

function finish(outcome: "완료" | "중단") {
  const exp = trackedExperience();
  writeUt((s) => {
    const stoppedAt = outcome === "중단" ? stageLabel(s.stage) : "";
    moveStage(s, "done");
    return { ...s, step: "post", outcome, stoppedAt, endedAt: new Date().toISOString(), followups: countFollowups(exp), experienceId: exp?.id ?? s.experienceId };
  });
  window.location.assign("/ut");
}

function UtBar() {
  const barRef = useRef<HTMLDivElement>(null);
  // 띠 높이를 --top-offset으로 알려 상단바·사이드바가 비켜 서게 한다 (시연 띠와 같은 방식)
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const root = document.documentElement;
    const ro = new ResizeObserver(() => root.style.setProperty("--top-offset", `${el.offsetHeight}px`));
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--top-offset");
    };
  }, []);
  const stop = async () => {
    const ok = await confirmAction({ title: "테스트를 그만할까요?", body: "지금까지 한 내용으로 마치고 마지막 질문으로 넘어가요.", confirmLabel: "그만하기", tone: "danger" });
    if (ok) finish("중단");
  };
  return (
    <div ref={barRef} role="region" aria-label="사용성 테스트" className="sticky top-0 z-40 bg-ink text-bg">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-1.5 sm:px-6">
        <p className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
          <FlaskConical className="size-4 shrink-0" aria-hidden />
          <b className="font-semibold">테스트 진행 중</b>
        </p>
        <button type="button" onClick={stop} className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-semibold hover:bg-bg/15 sm:min-h-9">
          <Square className="size-3.5" aria-hidden />
          테스트 그만하기
        </button>
      </div>
    </div>
  );
}

export default function UtWork() {
  // 사전 질문을 안 했거나 이미 끝난 참가자는 /ut로
  const ok = readUt().step === "work";
  useEffect(() => {
    if (!ok) window.location.replace("/ut");
  }, [ok]);

  // 단계가 바뀔 때마다 머문 시간을 더한다. 완성(done)되면 사후 질문으로
  useEffect(() => {
    if (!ok) return;
    const check = () => {
      if (readUt().step !== "work") return;
      const exp = trackedExperience();
      const next = stageOf(exp);
      if (exp && !readUt().experienceId) writeUt((s) => ({ ...s, experienceId: exp.id }));
      if (next === "done") return finish("완료");
      if (next !== readUt().stage) writeUt((s) => moveStage(s, next));
    };
    check();
    return useAppStore.subscribe(check);
  }, [ok]);

  // AI 요청 실패 횟수
  useEffect(() => {
    const onFail = () => writeUt((s) => ({ ...s, aiFailures: s.aiFailures + 1 }));
    window.addEventListener(AI_FAIL_EVENT, onFail);
    return () => window.removeEventListener(AI_FAIL_EVENT, onFail);
  }, []);

  if (!ok) return <div className="min-h-dvh" aria-busy="true" />;
  return (
    <>
      <UtBar />
      <AppShell />
    </>
  );
}
