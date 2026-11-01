"use client";
// 역량 키워드: 역량 연결에서 정한 역량마다 키워드 1개. 키워드 버튼을 누르면 그 키워드의 한 문장이 보인다.
// 대표 키워드 = 대표 역량의 키워드 (여기서는 바꾸지 않고 역량 연결에서 바꾼다, 사용자 결정 2026-11-01).
// 마지막 단계라 [경험 완성하기]와 완성 안내가 여기에 있다.
import { useState } from "react";
import { ArrowRight, CheckCircle2, Home, Pencil, PenLine, Plus, RefreshCw, Star } from "lucide-react";
import Link from "next/link";
import { generate } from "@/lib/api";
import { competencyName } from "@/lib/domain/competencies";
import { starBody } from "@/lib/domain/context";
import { missingKeywordComps } from "@/lib/domain/keywords";
import type { CompetencyId, Experience } from "@/lib/domain/types";
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
  const [draft, setDraft] = useState({ keyword: "", sentence: "" });

  const candidates = keyword?.candidates ?? [];
  const current = candidates.find((c) => c.competencyId === viewing) ?? candidates[0];
  const role = (cid: CompetencyId) => matches?.find((m) => m.competencyId === cid)?.role;
  const primaryId = matches?.find((m) => m.role === "primary")?.competencyId;
  const rewriteKey = current ? `${id}:keyword:${current.competencyId}` : `${id}:keyword:none`;
  const rewriteStatus = useTask(rewriteKey);
  const hasStory = experience.stories.some((s) => s.body);

  const startEdit = () => {
    if (!current) return;
    setDraft({ keyword: current.keyword, sentence: current.sentence });
    setEditing(true);
  };

  const rewrite = async () => {
    if (!current) return;
    const ok = await confirmAction({
      title: `'${current.keyword}' 키워드를 다시 쓸까요?`,
      body: "이 역량의 키워드와 문장을 새로 받아요. 지금 문장은 사라져요.",
      confirmLabel: "다시 쓰기",
    });
    if (!ok) return;
    setEditing(false);
    void runTask(rewriteKey, () => draftKeywords(id, [current.competencyId]));
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold sm:text-xl">역량 키워드</h2>
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
                  className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-[15px] transition-colors duration-150 ${
                    isViewing ? "border-primary bg-primary-fill text-on-primary" : "border-line-strong bg-surface text-ink hover:border-primary hover:text-primary-text"
                  }`}
                >
                  {isRep && <Star className={`size-3.5 ${isViewing ? "fill-on-primary" : "fill-primary text-primary-text"}`} aria-label="대표" />}
                  {c.keyword}
                </button>
              );
            })}
          </div>

          <section aria-live="polite" className="rounded-xl border border-line bg-surface p-4 sm:p-5">
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label htmlFor="kw-k" className="mb-1 block text-sm font-medium">키워드</label>
                  <input
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
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>취소</Button>
                  <Button
                    size="sm"
                    disabled={!draft.keyword.trim() || !draft.sentence.trim()}
                    onClick={() => {
                      editKeyword(id, current.competencyId, { keyword: draft.keyword.trim(), sentence: draft.sentence.trim() });
                      setEditing(false);
                    }}
                  >
                    저장
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="flex items-center gap-1.5 text-xs font-medium text-ink-faint">
                  {competencyName(current.competencyId)}
                  <span className={`rounded-md px-1.5 py-0.5 font-semibold ${role(current.competencyId) === "primary" ? "bg-primary-fill text-on-primary" : "bg-subtle text-ink-soft"}`}>
                    {role(current.competencyId) === "primary" ? "대표" : "보조"}
                  </span>
                </p>
                <p className="mt-1 text-lg font-bold">{current.keyword}</p>
                <p className="mt-1 text-[17px] leading-relaxed">{current.sentence}</p>
                <TaskState status={rewriteStatus} loadingText="이 역량의 키워드를 다시 쓰고 있어요" />
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={startEdit}>
                    <Pencil className="size-3.5" aria-hidden />
                    수정
                  </Button>
                  <Button variant="secondary" size="sm" loading={rewriteStatus?.state === "loading"} onClick={rewrite}>
                    {rewriteStatus?.state !== "loading" && <RefreshCw className="size-3.5" aria-hidden />}
                    다시 쓰기
                  </Button>
                </div>
              </>
            )}
          </section>

          <p className="text-sm text-ink-soft">
            <Star className="mr-1 inline size-3.5 fill-primary text-primary-text" aria-hidden />
            대표 키워드는 대표 역량({primaryId ? competencyName(primaryId) : "없음"})의 키워드예요. 바꾸려면{" "}
            <button type="button" onClick={onMatch} className="cursor-pointer font-semibold text-primary-text underline underline-offset-2">
              역량 연결
            </button>
            에서 대표 역량을 바꿔 주세요.
          </p>

          {matchesConfirmed ? (
            <div className="rounded-xl border border-ok/30 bg-ok-soft p-4">
              <p className="flex items-center gap-2 font-medium text-ok">
                <CheckCircle2 className="size-4" aria-hidden />
                경험을 완성했어요. 여기서 고치면 홈에도 바로 반영돼요.
              </p>
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
              <Button disabled={missing.length > 0} onClick={() => completeExperience(id)}>
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
