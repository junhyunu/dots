"use client";
// /ut: 안내·동의 → 사전 질문 → (작업 화면 /ut/work) → 사후 질문 → 감사. 진행 상태(dots:ut)를 보고 이어서 보여 준다.
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Copy, RefreshCw, Send } from "lucide-react";
import { DotsWordmark } from "@/components/brand/DotsLogo";
import Button from "@/components/ui/Button";
import { copyText } from "@/lib/domain/text";
import { Card, Choice, Likert, TextField } from "./fields";
import { DEVICES, EXTRA_ITEMS, LIKERT_ITEMS, PRE_LIKERT_GUIDE, PREV_TIME_LABEL, PREV_TIMES, SERVICE_INTRO, SITUATIONS, STUCK_STEPS, TASK_GUIDE } from "./questions";
import { readUt, rowText, sheetRow, useUt, writeUt } from "./state";

const goWork = () => window.location.assign("/ut/work?new=1");

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-xl items-center gap-2 px-4">
          <DotsWordmark />
          <span className="text-sm text-ink-faint">· 사용성 테스트</span>
        </div>
      </header>
      <main className="mx-auto max-w-xl space-y-4 px-4 py-6 sm:py-10">{children}</main>
    </div>
  );
}

function Intro() {
  const [agree, setAgree] = useState(false);
  return (
    <Card title="Dots 사용성 테스트에 오신 걸 환영해요">
      <ul className="list-disc space-y-2 pl-5 text-[15px] leading-relaxed break-keep text-ink-soft">
        <li>
          <b className="text-ink">서비스의 문제를 찾는 테스트예요.</b> 불편하거나 헷갈린 점을 솔직하게 말씀해 주시는 게 가장 큰 도움이 돼요.
        </li>
        <li>
          입력한 내용은 AI(Claude)로 전달돼요. <b className="text-ink">실명, 연락처, 회사 내부 정보는 넣지 말아 주세요.</b>
        </li>
        <li>작성한 경험 내용은 이 브라우저에만 저장돼요. 진행자에게는 설문 응답과 소요 시간만 전달돼요.</li>
        <li>45분 안에 해 주세요. 끝내지 못하면 화면 위 [테스트 그만하기]를 누르면 돼요.</li>
      </ul>
      <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px] font-medium">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="size-5 accent-primary" />
        위 내용을 읽었고 테스트에 참여할게요
      </label>
      <div className="flex justify-end">
        <Button disabled={!agree} onClick={() => writeUt((s) => ({ ...s, step: "pre" }))}>
          시작하기
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </div>
    </Card>
  );
}

function Pre() {
  const ut = useUt();
  const set = (patch: Partial<typeof ut.pre>) => writeUt((s) => ({ ...s, pre: { ...s.pre, ...patch } }));
  const p = ut.pre;
  const ready = ut.nickname.trim() && p.situation && (p.situation !== "기타" || p.situationOther.trim()) && p.prevTime && p.likert.every((v) => v !== null);
  return (
    <>
      <Card title="시작 전 질문">
        <p className="text-[15px] leading-relaxed break-keep text-ink-soft">{SERVICE_INTRO}</p>
        <TextField id="ut-nick" label="닉네임" value={ut.nickname} onChange={(v) => writeUt((s) => ({ ...s, nickname: v }))} placeholder="실명 말고 별명으로 적어 주세요" />
        <Choice name="situation" label="지금 상황" options={SITUATIONS} value={p.situation} onChange={(v) => set({ situation: v })} />
        {p.situation === "기타" && <TextField id="ut-sit" label="기타 상황" value={p.situationOther} onChange={(v) => set({ situationOther: v })} />}
        <Choice name="prevTime" label={PREV_TIME_LABEL} options={PREV_TIMES} value={p.prevTime} onChange={(v) => set({ prevTime: v })} />
      </Card>
      <Card title="평소 경험을 정리할 때를 떠올리며 답해 주세요">
        <div className="space-y-1 text-[15px] leading-relaxed break-keep text-ink-soft">
          {PRE_LIKERT_GUIDE.map((t) => (
            <p key={t}>{t}</p>
          ))}
        </div>
        {LIKERT_ITEMS.map((q, i) => (
          <Likert key={q} name={`pre-${i}`} label={`${i + 1}. ${q}`} value={p.likert[i]} onChange={(v) => set({ likert: p.likert.map((x, j) => (j === i ? v : x)) })} />
        ))}
      </Card>
      <Card title="이제 할 일">
        <p className="text-[15px] leading-relaxed break-keep">{TASK_GUIDE}</p>
        <div className="flex flex-col items-end gap-2">
          {!ready && <p className="text-sm text-ink-faint">모든 질문에 답하면 시작할 수 있어요.</p>}
          <Button
            disabled={!ready}
            onClick={() => {
              const now = new Date().toISOString();
              writeUt((s) => ({ ...s, step: "work", startedAt: s.startedAt ?? now, stage: "input", stageSince: Date.now() }));
              goWork();
            }}
          >
            경험 정리 시작하기
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
      </Card>
    </>
  );
}

function Post() {
  const ut = useUt();
  const p = ut.post;
  const set = (patch: Partial<typeof p>) => writeUt((s) => ({ ...s, post: { ...s.post, ...patch } }));
  // 기기 자동 감지 (참가자가 바꿀 수 있음)
  useEffect(() => {
    if (!readUt().post.device) set({ device: window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768 ? "모바일" : "PC" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const ready = p.device && p.likert.every((v) => v !== null) && p.extra.every((v) => v !== null) && p.stuck && p.error;

  const submit = async () => {
    setSending(true);
    setFailed(null);
    const submittedAt = new Date().toISOString();
    const row = sheetRow({ ...readUt(), submittedAt });
    try {
      const res = await fetch("/api/ut-submit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ row }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "응답을 보내지 못했어요.");
      writeUt((s) => ({ ...s, step: "done", submittedAt }));
    } catch (e) {
      setFailed(e instanceof Error ? e.message : "응답을 보내지 못했어요.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Card title="마지막 질문">
        <p className="text-[15px] text-ink-soft">
          {ut.outcome === "완료" ? "경험 정리를 끝까지 해 주셔서 고마워요." : "여기까지 해 주셔서 고마워요."} 방금 Dots를 쓴 경험을 떠올리며 답해 주세요.
        </p>
        <TextField id="ut-nick2" label="닉네임" value={ut.nickname} onChange={(v) => writeUt((s) => ({ ...s, nickname: v }))} />
        <Choice name="device" label="사용한 기기 (자동으로 골랐어요. 다르면 바꿔 주세요)" options={DEVICES} value={p.device} onChange={(v) => set({ device: v })} />
      </Card>
      <Card title="Dots를 쓰면서">
        {LIKERT_ITEMS.map((q, i) => (
          <Likert key={q} name={`post-${i}`} label={`${i + 1}. ${q}`} value={p.likert[i]} onChange={(v) => set({ likert: p.likert.map((x, j) => (j === i ? v : x)) })} />
        ))}
        {EXTRA_ITEMS.map((q, i) => (
          <Likert key={q} name={`extra-${i}`} label={`${LIKERT_ITEMS.length + i + 1}. ${q}`} value={p.extra[i]} onChange={(v) => set({ extra: p.extra.map((x, j) => (j === i ? v : x)) })} />
        ))}
      </Card>
      <Card>
        <Choice name="stuck" label="가장 막혔던 단계 하나를 골라 주세요" options={STUCK_STEPS} value={p.stuck} onChange={(v) => set({ stuck: v })} />
        <Choice name="error" label="쓰는 동안 오류가 있었나요?" options={["없었다", "있었다"]} value={p.error} onChange={(v) => set({ error: v as typeof p.error })} />
        {p.error === "있었다" && <TextField id="ut-err" label="어떤 문구가 나왔나요? (기억나는 만큼)" value={p.errorText} onChange={(v) => set({ errorText: v })} />}
        <TextField id="ut-moment" label="가장 막혔던 순간은 언제였나요?" value={p.stuckMoment} onChange={(v) => set({ stuckMoment: v })} optional multiline />
        <TextField id="ut-compare" label="기존 방식(ChatGPT, 메모 등)과 비교하면 어땠나요?" value={p.compare} onChange={(v) => set({ compare: v })} optional multiline />
      </Card>
      <div className="flex flex-col items-end gap-2">
        {!ready && <p className="text-sm text-ink-faint">선택이 아닌 질문에 모두 답하면 제출할 수 있어요.</p>}
        {failed ? (
          <div role="alert" className="w-full space-y-3 rounded-xl border border-danger/30 bg-danger-soft p-4">
            <p className="text-[15px] text-danger">응답을 보내지 못했어요. ({failed}) 다시 보내 보거나, 응답을 복사해 진행자에게 보내 주세요.</p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => setCopied(await copyText(rowText(sheetRow({ ...readUt(), submittedAt: new Date().toISOString() }))))}
              >
                <Copy className="size-4" aria-hidden />
                {copied ? "복사했어요" : "응답 복사하기"}
              </Button>
              <Button size="sm" loading={sending} onClick={submit}>
                {!sending && <RefreshCw className="size-4" aria-hidden />}
                다시 보내기
              </Button>
            </div>
          </div>
        ) : (
          <Button disabled={!ready} loading={sending} onClick={submit}>
            {!sending && <Send className="size-4" aria-hidden />}
            제출하기
          </Button>
        )}
      </div>
    </>
  );
}

function Thanks() {
  return (
    <Card>
      <p className="flex items-center gap-2 text-lg font-bold">
        <CheckCircle2 className="size-5 text-ok" aria-hidden />
        참여해 주셔서 감사합니다
      </p>
      <p className="text-[15px] leading-relaxed text-ink-soft">응답이 잘 전달됐어요. 이 창은 닫으셔도 돼요.</p>
    </Card>
  );
}

export default function UtFlow() {
  const ut = useUt();
  // 작업 중이던 참가자가 /ut로 오면 작업 화면으로 돌려보낸다
  useEffect(() => {
    if (ut.step === "work") window.location.replace("/ut/work");
  }, [ut.step]);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [ut.step]);
  return (
    <Frame>
      {ut.step === "intro" && <Intro />}
      {ut.step === "pre" && <Pre />}
      {ut.step === "post" && <Post />}
      {ut.step === "done" && <Thanks />}
    </Frame>
  );
}
