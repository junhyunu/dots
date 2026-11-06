"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Pencil, Sparkles } from "lucide-react";
import type { StageId } from "@/lib/domain/types";
import { useAppStore } from "@/lib/store/useAppStore";
import AutoTextarea from "@/components/ui/AutoTextarea";
import Button from "@/components/ui/Button";

/** 단계가 끝날 때 보여주는 "AI가 이해한 내용". 사용자가 고치면 사실 교정으로 원고에 반영된다. */
export default function SummaryCard({ experienceId, stage, summary, edited, commitRef }: {
  experienceId: string;
  stage: StageId;
  summary: string;
  edited: boolean;
  /** 고치는 중에 다음 단계로 넘어가도 고친 글을 잃지 않게, 부모가 저장을 부를 수 있다 */
  commitRef?: RefObject<(() => void) | null>;
}) {
  const editStageSummary = useAppStore((s) => s.editStageSummary);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(summary);

  const save = () => {
    if (draft.trim() && draft !== summary) editStageSummary(experienceId, stage, draft.trim());
    setEditing(false);
  };

  useEffect(() => {
    if (!commitRef) return;
    commitRef.current = editing ? save : null;
    return () => {
      commitRef.current = null;
    };
  });

  // 고치기를 열면 글 상자로, 닫으면 [수정] 버튼으로 키보드 위치를 옮긴다
  const moved = useRef(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    (editing ? boxRef.current?.querySelector("textarea") : editRef.current)?.focus({ preventScroll: true });
  }, [editing]);
  const setMode = (next: boolean) => {
    moved.current = true;
    setEditing(next);
  };

  return (
    <div className="rounded-xl border border-primary-soft-line bg-primary-soft px-4 py-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary-text" aria-hidden />
        <p className="font-semibold text-primary-text">AI가 이해한 내용</p>
        {edited && <span className="rounded-md bg-surface px-1.5 py-0.5 text-xs text-ink-soft">직접 수정함</span>}
      </div>
      {editing ? (
        <div ref={boxRef} className="mt-3 space-y-2">
          <AutoTextarea value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="AI가 이해한 내용 수정" minRows={3} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setDraft(summary); setMode(false); }}>
              취소
            </Button>
            <Button size="sm" onClick={() => { moved.current = true; save(); }}>저장</Button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 whitespace-pre-wrap leading-relaxed text-ink">{summary}</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-sm text-ink-soft">틀린 곳이 있으면 고쳐 주세요. 고친 내용이 원고에 반영돼요.</p>
            <Button ref={editRef} variant="ghost" size="sm" onClick={() => { setDraft(summary); setMode(true); }}>
              <Pencil className="size-3.5" aria-hidden />
              수정
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
