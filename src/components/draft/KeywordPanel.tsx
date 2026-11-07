"use client";
// 역량 키워드: 역량 연결에서 정한 역량마다 키워드 1개. 키워드 버튼을 누르면 그 키워드의 한 문장이 보인다.
// 대표 키워드 = 대표 역량의 키워드 (여기서는 바꾸지 않고 역량 연결에서 바꾼다, 사용자 결정 2026-11-01).
// 마지막 단계라 [경험 완성하기]와 완성 안내가 여기에 있다.
import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Home, Pencil, PenLine, Plus, RefreshCw, Star } from "lucide-react";
import Link from "next/link";
import { generate } from "@/lib/api";
import { competencyName } from "@/lib/domain/competencies";
import { starBody } from "@/lib/domain/context";
import { missingKeywordComps } from "@/lib/domain/keywords";
import type { CompetencyId, Experience, KeywordCandidate } from "@/lib/domain/types";
import { getStore, useAppStore } from "@/lib/store/useAppStore";
import { runTask, useAutoTask, useTask } from "@/lib/store/useTaskRunner";
import AutoTextarea from "@/components/ui/AutoTextarea";
import Button from "@/components/ui/Button";
import TaskState from "@/components/ui/TaskState";
import { confirmAction } from "@/components/ui/ConfirmDialog";
import { href } from "@/lib/mode";

/** only = 이 역량들의 키워드만 새로 받는다 (없으면 키워드가 없는 역량 전부) */
async function draftKeywords(id: string, only?: CompetencyId[]) {
  const exp = getStore().experiences[id];
  if (!exp.star || !exp.matches?.length) return;
  const targets = only ?? missingKeywordComps(exp.keyword, exp.matches);
  const links = exp.matches.filter((m) => targets.includes(m.competencyId)).map(({ competencyId, role, scene }) => ({ competencyId, role, scene }));
  if (!links.length) return;
  const r = await generate("keyword", { basic: exp.basic, star: starBody(exp.star), links });
  // 역량마다 1개만, 요청한 역량만 받는다 (AI가 순서만 맞추고 id를 틀려도 순서대로 붙인다)
  const got = links.map((l, i) => {
    const c = r.candidates.find((x) => x.competencyId === l.competencyId) ?? r.candidates[i];
    return c ? { competencyId: l.competencyId, keyword: c.keyword.trim(), sentence: c.sentence.trim() } : null;
  });
  getStore().setKeywords(id, got.filter((c) => c !== null));
}

type KeywordText = Pick<KeywordCandidate, "keyword" | "sentence">;

/** 키워드 수정 칸. [저장] 없이 다른 키워드·다른 단계로 가도 고친 글을 잃지 않게, 닫힐 때 저장한다
 *  (비었거나 그대로면 저장하지 않음, STAR 원고 블록과 같은 규칙) */
function KeywordEditor({ candidate, onSave, onClose }: { candidate: KeywordCandidate; onSave: (t: KeywordText) => void; onClose: () => void }) {
  const [draft, setDraft] = useState({ keyword: candidate.keyword, sentence: candidate.sentence });
  const next = { keyword: draft.keyword.trim(), sentence: draft.sentence.trim() };
  const empty = !next.keyword || !next.sentence;
  const changed = next.keyword !== candidate.keyword || next.sentence !== candidate.sentence;

  const pending = useRef<KeywordText | null>(null);
  pending.current = !empty && changed ? next : null;
  const saveRef = useRef(onSave);
  saveRef.current = onSave;
  useEffect(() => () => {
    if (pending.current) saveRef.current(pending.current);
  }, []);

  // 열면 키워드 칸으로 키보드 위치를 옮긴다
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus({ preventScroll: true }), []);

  const finish = (save: boolean) => {
    if (save && pending.current) onSave(pending.current);
    pending.current = null;
    onClose();
  };

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="kw-k" className="mb-1 block text-sm font-medium">키워드</label>
        <input
          ref={inputRef}
          id="kw-k"
          value={draft.keyword}
          onChange={(e) => setDraft((d) => ({ ...d, keyword: e.target.value }))}
          className="min-h-11 w-full rounded-lg border border-line-strong px-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <div>
        <label htmlFor="kw-s" className="mb-1 block text-sm font-medium">한 문장</label>
        <AutoTextarea id="kw-s" value={draft.sentence} onChange={(e) => setDraft((d) => ({ ...d, sentence: e.target.value }))} minRows={2} />
      </div>
      {empty && (
        <p id="kw-empty" role="alert" className="text-sm text-danger-text">
          키워드와 한 문장을 모두 적어야 저장할 수 있어요. 그대로 두려면 [취소]를 눌러 주세요.
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => finish(false)}>취소</Button>
        <Button size="sm" disabled={empty} aria-describedby={empty ? "kw-empty" : undefined} onClick={() => finish(true)}>
          저장
        </Button>
      </div>
    </div>
  );
}

export default function KeywordPanel({ experience, onStory, onMatch }: { experience: Experience; onStory: () => void; onMatch: () => void }) {
  const { id, keyword, matches, matchesConfirmed } = experience;
  const editKeyword = useAppStore((s) => s.editKeyword);
  const completeExperience = useAppStore((s) => s.completeExperience);
  const setView = useAppStore((s) => s.setView);

  // 연결한 역량 중 키워드가 없는 것만 만든다 (처음, 또는 역량 연결을 바꾼 뒤)
  const missing = missingKeywordComps(keyword, matches);
  const key = `${id}:keyword`;
  const status = useAutoTask(key, !!experience.star && missing.length > 0, () => draftKeywords(id));

  const [viewing, setViewing] = useState<CompetencyId | null>(null);
  const [editing, setEditing] = useState(false);

  const candidates = keyword?.candidates ?? [];
  const current = candidates.find((c) => c.competencyId === viewing) ?? candidates[0];
  const role = (cid: CompetencyId) => matches?.find((m) => m.competencyId === cid)?.role;
  const primaryId = matches?.find((m) => m.role === "primary")?.competencyId;
  const rewriteKey = current ? `${id}:keyword:${current.competencyId}` : `${id}:keyword:none`;
  const rewriteStatus = useTask(rewriteKey);
  const hasStory = experience.stories.some((s) => s.body);

  // 키보드 위치: 누른 버튼이 사라지거나 꺼지면 페이지 전체로 돌아가므로 직접 옮긴다
  const titleRef = useRef<HTMLHeadingElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const rewriteRef = useRef<HTMLButtonElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const lost = () => !document.activeElement || document.activeElement === document.body;
  // [다음: 역량 키워드]로 들어오면 누른 버튼이 사라지므로 제목으로
  useEffect(() => {
    if (lost()) titleRef.current?.focus({ preventScroll: true });
  }, []);
  // 수정을 끝내면 [수정] 버튼으로 (다른 키워드를 눌러 닫혔으면 그 키워드 버튼에 그대로)
  const backToEdit = useRef(false);
  useEffect(() => {
    if (editing || !backToEdit.current) return;
    backToEdit.current = false;
    editRef.current?.focus({ preventScroll: true });
  }, [editing]);
  // [경험 완성하기]를 누르면 완성 안내가 아래에 생기므로 화면과 키보드 위치를 그리로 옮긴다
  const justCompleted = useRef(false);
  useEffect(() => {
    const box = doneRef.current;
    if (!matchesConfirmed || !justCompleted.current || !box) return;
    justCompleted.current = false;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    box.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
    box.focus({ preventScroll: true });
  }, [matchesConfirmed]);

  const rewrite = async () => {
    if (!current) return;
    const ok = await confirmAction({
      title: `'${current.keyword}' 키워드를 다시 쓸까요?`,
      body: "이 역량의 키워드와 문장을 새로 받아요. 지금 문장은 사라져요.",
      confirmLabel: "다시 쓰기",
    });
    if (ok) await runTask(rewriteKey, () => draftKeywords(id, [current.competencyId]));
    // 확인 창이 닫히고, 기다리는 동안 버튼이 꺼져 잃은 키보드 위치를 [다시 쓰기]로 돌려놓는다
    if (lost()) rewriteRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 ref={titleRef} tabIndex={-1} className="text-lg font-bold focus:outline-none sm:text-xl">역량 키워드</h2>
        <p className="mt-1 text-sm text-ink-soft">연결한 역량마다 이 경험으로 어필할 키워드를 하나씩 만들었어요. 키워드를 누르면 그 키워드를 설명하는 한 문장이 보여요.</p>
      </div>

      <TaskState status={status} loadingText="연결한 역량에 맞는 키워드를 만들고 있어요" />

      {current && (
        <>
          <div role="group" aria-label="역량 키워드" className="flex flex-wrap gap-2">
            {candidates.map((c) => {
              const isRep = c.competencyId === primaryId;
              const isViewing = c.competencyId === current.competencyId;
              return (
                <button
                  key={c.competencyId}
                  type="button"
                  aria-pressed={isViewing}
                  onClick={() => {
                    setViewing(c.competencyId);
                    setEditing(false);
                  }}
                  // 선택 표시는 스토리 화면(글자 수·글 목록)과 같은 옅은 파랑. 진한 파랑은 [경험 완성하기] 하나만
                  className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-[15px] transition-colors duration-150 ${
                    isViewing ? "border-primary bg-primary-soft font-semibold text-primary-text" : "border-line-strong bg-surface text-ink hover:bg-subtle"
                  }`}
                >
                  {isRep && <Star className="size-3.5 fill-primary text-primary-text" aria-label="대표" />}
                  {c.keyword}
                </button>
              );
            })}
          </div>

          <section aria-live="polite" className="rounded-xl border border-line bg-surface p-4 sm:p-5">
            {editing ? (
              <KeywordEditor
                key={current.competencyId}
                candidate={current}
                onSave={(t) => editKeyword(id, current.competencyId, t)}
                onClose={() => {
                  backToEdit.current = true;
                  setEditing(false);
                }}
              />
            ) : (
              <>
                <p className="flex items-center gap-1.5 text-xs font-medium text-ink-faint">
                  {competencyName(current.competencyId)}
                  <span className={`rounded-md border px-1.5 py-0.5 font-semibold ${role(current.competencyId) === "primary" ? "border-line-strong bg-surface text-primary-text" : "border-transparent bg-subtle text-ink-soft"}`}>
                    {role(current.competencyId) === "primary" ? "대표" : "보조"}
                  </span>
                </p>
                <p className="mt-1 text-lg font-semibold">{current.keyword}</p>
                <p className="mt-1 leading-relaxed">{current.sentence}</p>
                <TaskState status={rewriteStatus} loadingText="이 역량의 키워드를 다시 쓰고 있어요" />
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <Button ref={editRef} variant="ghost" size="sm" onClick={() => setEditing(true)}>
                    <Pencil className="size-3.5" aria-hidden />
                    수정
                  </Button>
                  <Button ref={rewriteRef} variant="secondary" size="sm" loading={rewriteStatus?.state === "loading"} onClick={rewrite}>
                    {rewriteStatus?.state !== "loading" && <RefreshCw className="size-3.5" aria-hidden />}
                    다시 쓰기
                  </Button>
                </div>
              </>
            )}
          </section>

          {primaryId ? (
            <p className="text-sm text-ink-soft">
              <Star className="mr-1 inline size-3.5 fill-primary text-primary-text" aria-hidden />
              대표 키워드는 대표 역량({competencyName(primaryId)})의 키워드예요. 바꾸려면{" "}
              <button type="button" onClick={onMatch} className="cursor-pointer font-semibold text-primary-text underline underline-offset-2">
                역량 연결
              </button>
              에서 대표 역량을 바꿔 주세요.
            </p>
          ) : (
            // 완성한 경험에서 대표를 뺀 경우: "(없음)의 키워드" 대신 지금 상태와 할 일을 알려 준다
            <p role="status" className="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger-text">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                대표 역량이 없어요.{" "}
                <button type="button" onClick={onMatch} className="cursor-pointer font-semibold underline underline-offset-2">
                  역량 연결
                </button>
                에서 대표 역량을 하나 골라 주세요.
              </span>
            </p>
          )}

          {matchesConfirmed ? (
            <div ref={doneRef} tabIndex={-1} className="rounded-xl border border-ok/30 bg-ok-soft p-4 focus:outline-none">
              <p className="flex items-center gap-2 font-medium text-ok">
                <CheckCircle2 className="size-4" aria-hidden />
                경험을 완성했어요. 여기서 고치면 홈에도 바로 반영돼요.
              </p>
              <p className="mt-1 pl-6 text-[15px] text-ink-soft">홈 카드에서 원고를 파일(TXT·Word·MD)로 내려받을 수 있어요.</p>
              {!hasStory && <p className="mt-1 pl-6 text-[15px] text-ink-soft">이 경험을 자기소개서 글로 다듬어 볼까요?</p>}
              {/* 주요 행동은 스토리 하나 (서비스의 마지막 결과물), 나머지는 보조 버튼 */}
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button onClick={onStory}>
                  <PenLine className="size-4" aria-hidden />
                  {hasStory ? "스토리 보기" : "스토리로 완성하기"}
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
                <Button variant="secondary" onClick={() => setView("new")}>
                  <Plus className="size-4" aria-hidden />
                  새 경험 정리하기
                </Button>
                <Link
                  href={href("/")}
                  className="press inline-flex min-h-12 items-center justify-center gap-1.5 rounded-lg border border-line-strong bg-surface px-5 font-semibold"
                >
                  <Home className="size-4" aria-hidden />
                  홈에서 보기
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-3 pt-2">
              {missing.length > 0 && status?.state !== "loading" && <p className="text-sm text-ink-faint">연결한 역량마다 키워드가 있어야 완성할 수 있어요.</p>}
              <Button
                disabled={missing.length > 0}
                onClick={() => {
                  justCompleted.current = true;
                  completeExperience(id);
                }}
              >
                <CheckCircle2 className="size-4" aria-hidden />
                경험 완성하기
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
