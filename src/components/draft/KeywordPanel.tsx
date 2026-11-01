"use client";
// 역량 키워드: 키워드 버튼을 누르면 그 키워드의 한 문장이 보인다. 대표 1개를 고르고 나머지도 보관한다.
import { useState } from "react";
import { ArrowRight, Pencil, RefreshCw, Star } from "lucide-react";
import { generate } from "@/lib/api";
import { COMPETENCIES, competencyName } from "@/lib/domain/competencies";
import { starBody } from "@/lib/domain/context";
import type { CompetencyId, Experience } from "@/lib/domain/types";
import { getStore, useAppStore } from "@/lib/store/useAppStore";
import { runTask, useAutoTask } from "@/lib/store/useTaskRunner";
import AutoTextarea from "@/components/ui/AutoTextarea";
import Button from "@/components/ui/Button";
import TaskState from "@/components/ui/TaskState";
import { confirmAction } from "@/components/ui/ConfirmDialog";

async function draftKeywords(id: string) {
  const exp = getStore().experiences[id];
  if (!exp.star) return;
  const r = await generate("keyword", { basic: exp.basic, star: starBody(exp.star) });
  getStore().setKeywords(id, r.candidates.slice(0, 4));
}

export default function KeywordPanel({ experience }: { experience: Experience }) {
  const { id, keyword } = experience;
  const selectKeyword = useAppStore((s) => s.selectKeyword);
  const editKeyword = useAppStore((s) => s.editKeyword);
  const confirmKeyword = useAppStore((s) => s.confirmKeyword);

  const key = `${id}:keyword`;
  const status = useAutoTask(key, !!experience.star && !keyword, () => draftKeywords(id));

  const [viewing, setViewing] = useState<number>(keyword?.selectedIndex ?? 0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ keyword: "", sentence: "", competencyId: "problem_solving" as CompetencyId });

  const candidates = keyword?.candidates ?? [];
  const index = Math.min(viewing, Math.max(candidates.length - 1, 0));
  const current = candidates[index];

  const startEdit = () => {
    if (!current) return;
    setDraft({ keyword: current.keyword, sentence: current.sentence, competencyId: current.competencyId });
    setEditing(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold sm:text-xl">역량 키워드</h2>
          <p className="mt-1 text-sm text-ink-soft">키워드를 누르면 그 키워드를 설명하는 한 문장이 보여요. 자기소개서 소제목으로 쓸 대표 키워드를 골라 주세요.</p>
        </div>
        {keyword && (
          <Button
            variant="secondary"
            size="sm"
            loading={status?.state === "loading"}
            onClick={async () => {
              const ok = await confirmAction({ title: "키워드 후보를 새로 만들까요?", body: "지금 후보와 고친 내용은 사라져요.", confirmLabel: "새로 만들기" });
              if (ok) {
                setViewing(0);
                setEditing(false);
                void runTask(key, () => draftKeywords(id));
              }
            }}
          >
            {status?.state !== "loading" && <RefreshCw className="size-4" aria-hidden />}
            후보 다시 만들기
          </Button>
        )}
      </div>

      <TaskState status={status} loadingText="원고에서 어필할 역량을 찾고 있어요" />

      {current && (
        <>
          <div role="group" aria-label="키워드 후보" className="flex flex-wrap gap-2">
            {candidates.map((c, i) => {
              const isRep = keyword!.selectedIndex === i;
              const isViewing = i === index;
              return (
                <button
                  key={i}
                  type="button"
                  aria-pressed={isViewing}
                  onClick={() => {
                    setViewing(i);
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
                <div>
                  <label htmlFor="kw-c" className="mb-1 block text-sm font-medium">가까운 역량</label>
                  <select
                    id="kw-c"
                    value={draft.competencyId}
                    onChange={(e) => setDraft((d) => ({ ...d, competencyId: e.target.value as CompetencyId }))}
                    className="min-h-11 w-full rounded-lg border border-line-strong bg-surface px-3 focus:border-primary focus:outline-none"
                  >
                    {COMPETENCIES.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>취소</Button>
                  <Button
                    size="sm"
                    disabled={!draft.keyword.trim() || !draft.sentence.trim()}
                    onClick={() => {
                      editKeyword(id, index, { keyword: draft.keyword.trim(), sentence: draft.sentence.trim(), competencyId: draft.competencyId });
                      setEditing(false);
                    }}
                  >
                    저장
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs font-medium text-ink-faint">{competencyName(current.competencyId)}</p>
                <p className="mt-1 text-lg font-bold">{current.keyword}</p>
                <p className="mt-1 text-[17px] leading-relaxed">{current.sentence}</p>
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={startEdit}>
                    <Pencil className="size-3.5" aria-hidden />
                    수정
                  </Button>
                  {keyword!.selectedIndex === index ? (
                    <span className="inline-flex min-h-11 items-center gap-1.5 px-3 text-sm font-medium text-primary-text sm:min-h-9">
                      <Star className="size-3.5 fill-primary" aria-hidden />
                      대표 키워드
                    </span>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => selectKeyword(id, index)}>
                      <Star className="size-3.5" aria-hidden />
                      대표로 정하기
                    </Button>
                  )}
                </div>
              </>
            )}
          </section>

          <div className="flex justify-end pt-2">
            {experience.status === "keyword" ? (
              <Button onClick={() => confirmKeyword(id)}>
                다음: 역량 매칭
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            ) : (
              <p className="text-sm text-ink-faint">대표가 아닌 후보도 보관돼요. 문항에 따라 다른 키워드를 쓸 수 있어요.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
