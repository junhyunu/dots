"use client";
import { useState } from "react";
import { Pencil, Sparkles } from "lucide-react";
import type { StageId } from "@/lib/domain/types";
import { useAppStore } from "@/lib/store/useAppStore";
import AutoTextarea from "@/components/ui/AutoTextarea";
import Button from "@/components/ui/Button";

/** 단계가 끝날 때 보여주는 "AI가 이해한 내용". 사용자가 고치면 사실 교정으로 원고에 반영된다. */
export default function SummaryCard({ experienceId, stage, summary, edited }: { experienceId: string; stage: StageId; summary: string; edited: boolean }) {
  const editStageSummary = useAppStore((s) => s.editStageSummary);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(summary);

  const save = () => {
    if (draft.trim() && draft !== summary) editStageSummary(experienceId, stage, draft.trim());
    setEditing(false);
  };

  return (
    <div className="rounded-xl border border-primary-soft-line bg-primary-soft px-4 py-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary-text" aria-hidden />
        <p className="font-semibold text-primary-text">AI가 이해한 내용</p>
        {edited && <span className="rounded bg-surface px-1.5 py-0.5 text-xs text-ink-soft">직접 수정함</span>}
      </div>
      {editing ? (
        <div className="mt-3 space-y-2">
          <AutoTextarea value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="AI가 이해한 내용 수정" minRows={3} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setDraft(summary); setEditing(false); }}>
              취소
            </Button>
            <Button size="sm" onClick={save}>저장</Button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 whitespace-pre-wrap leading-relaxed text-ink">{summary}</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-sm text-ink-soft">틀린 곳이 있으면 고쳐 주세요. 고친 내용이 원고에 반영돼요.</p>
            <Button variant="ghost" size="sm" onClick={() => { setDraft(summary); setEditing(true); }}>
              <Pencil className="size-3.5" aria-hidden />
              수정
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
