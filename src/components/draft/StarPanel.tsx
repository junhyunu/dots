"use client";
import { useState } from "react";
import { ArrowRight, PenLine, Pencil, Plus, RefreshCw, X } from "lucide-react";
import { generate } from "@/lib/api";
import type { StarBlock } from "@/lib/ai/contract";
import { starBody, toContext } from "@/lib/domain/context";
import type { Experience, StarAction, StarDraft } from "@/lib/domain/types";
import { getStore, useAppStore } from "@/lib/store/useAppStore";
import { runTask, useAutoTask, useTask } from "@/lib/store/useTaskRunner";
import AutoTextarea from "@/components/ui/AutoTextarea";
import Button from "@/components/ui/Button";
import TaskState from "@/components/ui/TaskState";

const BLOCKS: { id: StarBlock; letter: string; name: string }[] = [
  { id: "situation", letter: "S", name: "상황" },
  { id: "task", letter: "T", name: "과제" },
  { id: "actions", letter: "A", name: "행동" },
  { id: "result", letter: "R", name: "결과" },
  { id: "learning", letter: "+", name: "배운 점" },
];

async function draftStar(id: string, block?: StarBlock) {
  const exp = getStore().experiences[id];
  const current = exp.star ? starBody(exp.star) : null;
  const r = await generate("star", {
    context: toContext(exp),
    regenerate: block && current ? { block, current } : undefined,
  });
  // 블록 하나만 다시 만들 때는 그 블록만 바꾼다 (나머지는 사용자가 고친 그대로)
  const latest = getStore().experiences[id].star;
  const next = block && latest ? { ...starBody(latest), [block]: r[block] } : r;
  getStore().setStar(id, next);
}

function BlockEditor({ block, star, onDone }: { block: StarBlock; star: StarDraft; onDone: (patch: Partial<StarDraft>) => void }) {
  const [text, setText] = useState(block === "actions" ? "" : (star[block] as string));
  const [actions, setActions] = useState<StarAction[]>(star.actions);

  if (block === "actions") {
    const set = (i: number, patch: Partial<StarAction>) => setActions((a) => a.map((x, j) => (j === i ? { ...x, ...patch } : x)));
    return (
      <div className="space-y-4">
        {actions.map((a, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-line p-3">
            <div className="flex items-center gap-2">
              <input
                value={a.label}
                onChange={(e) => set(i, { label: e.target.value })}
                aria-label={`행동 ${i + 1} 소제목`}
                className="min-h-11 flex-1 rounded-lg border border-line-strong px-3 font-semibold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={() => setActions((x) => x.filter((_, j) => j !== i))}
                aria-label={`행동 ${i + 1} 삭제`}
                className="flex size-11 cursor-pointer items-center justify-center rounded-lg text-ink-faint hover:bg-danger-soft hover:text-danger"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <AutoTextarea value={a.body} onChange={(e) => set(i, { body: e.target.value })} aria-label={`행동 ${i + 1} 내용`} minRows={2} />
          </div>
        ))}
        <Button variant="secondary" size="sm" onClick={() => setActions((x) => [...x, { label: "", body: "" }])}>
          <Plus className="size-4" aria-hidden />
          행동 추가
        </Button>
        <EditorButtons onCancel={() => onDone({})} onSave={() => onDone({ actions: actions.filter((a) => a.label.trim() || a.body.trim()) })} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AutoTextarea value={text} onChange={(e) => setText(e.target.value)} aria-label="내용 수정" minRows={3} />
      <EditorButtons onCancel={() => onDone({})} onSave={() => onDone({ [block]: text })} />
    </div>
  );
}

function EditorButtons({ onCancel, onSave }: { onCancel: () => void; onSave: () => void }) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" size="sm" onClick={onCancel}>취소</Button>
      <Button size="sm" onClick={onSave}>저장</Button>
    </div>
  );
}

function BlockCard({ experienceId, block, star }: { experienceId: string; block: (typeof BLOCKS)[number]; star: StarDraft }) {
  const editStar = useAppStore((s) => s.editStar);
  const [editing, setEditing] = useState(false);
  const key = `${experienceId}:star:${block.id}`;
  const status = useTask(key);

  return (
    <section className="rounded-xl border border-line bg-surface p-4 sm:p-5" aria-labelledby={`blk-${block.id}`}>
      <header className="mb-3 flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary-soft text-sm font-bold text-primary-text" aria-hidden>
          {block.letter}
        </span>
        <h3 id={`blk-${block.id}`} className="flex-1 font-semibold">{block.name}</h3>
        {!editing && (
          <>
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)} aria-label={`${block.name} 직접 수정`}>
              <Pencil className="size-3.5" aria-hidden />
              <span className="hidden sm:inline">수정</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              loading={status?.state === "loading"}
              onClick={() => void runTask(key, () => draftStar(experienceId, block.id))}
              aria-label={`${block.name} 다시 생성`}
            >
              {status?.state !== "loading" && <RefreshCw className="size-3.5" aria-hidden />}
              <span className="hidden sm:inline">다시 생성</span>
            </Button>
          </>
        )}
      </header>

      {status?.state === "error" && <div className="mb-3"><TaskState status={status} loadingText="" /></div>}

      {editing ? (
        <BlockEditor
          block={block.id}
          star={star}
          onDone={(patch) => {
            if (Object.keys(patch).length) editStar(experienceId, patch);
            setEditing(false);
          }}
        />
      ) : block.id === "actions" ? (
        <ul className="space-y-3">
          {star.actions.map((a, i) => (
            <li key={i} className="leading-relaxed">
              <span className="font-semibold">{a.label}</span>
              <span className="text-ink-faint"> — </span>
              {a.body}
            </li>
          ))}
        </ul>
      ) : (
        <p className="whitespace-pre-wrap leading-relaxed">{star[block.id] as string}</p>
      )}
    </section>
  );
}

export default function StarPanel({ experience, onStory }: { experience: Experience; onStory: () => void }) {
  const { id, star } = experience;
  const confirmStar = useAppStore((s) => s.confirmStar);
  const canDraft = experience.interview.currentStage === "complete";
  const key = `${id}:star`;
  const status = useAutoTask(key, canDraft && !star, () => draftStar(id));

  if (!canDraft) return <p className="text-ink-soft">질문을 모두 마치면 원고를 만들어 드려요.</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold sm:text-xl">STAR 경험 원고</h2>
          <p className="mt-1 text-sm text-ink-soft">답변에 없는 수치·성과·감정은 넣지 않았어요. 블록마다 직접 고치거나 다시 생성할 수 있어요.</p>
        </div>
        {star && (
          <Button
            variant="secondary"
            size="sm"
            loading={status?.state === "loading"}
            onClick={() => {
              if (!star.edited || window.confirm("직접 고친 내용이 사라져요. 원고 전체를 다시 생성할까요?")) void runTask(key, () => draftStar(id));
            }}
          >
            {status?.state !== "loading" && <RefreshCw className="size-4" aria-hidden />}
            전체 다시 생성
          </Button>
        )}
      </div>

      <TaskState status={status} loadingText="답변을 바탕으로 STAR 원고를 쓰고 있어요" />

      {star && (
        <>
          {BLOCKS.map((b) => (
            <BlockCard key={b.id} experienceId={id} block={b} star={star} />
          ))}
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-end">
            {experience.status !== "drafting" && (
              <p className="text-sm text-ink-faint sm:mr-auto">원고를 고쳤다면 역량 키워드·연결도 다시 생성해 보세요.</p>
            )}
            <Button variant="secondary" onClick={onStory}>
              <PenLine className="size-4" aria-hidden />
              스토리로 완성하기
            </Button>
            {experience.status === "drafting" && (
              <Button onClick={() => confirmStar(id)}>
                다음: 역량 키워드 정하기
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
