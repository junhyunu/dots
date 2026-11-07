"use client";
// 스토리 완성: STAR 원고 → 소제목 + 문단의 자기소개서 글.
// 흐름: 옵션(문항·글자 수, 선택) → 부족한 생각·의도·감정이 있으면 추가 질문 → 글 생성 → 수정·다시 생성·복사
import { useState } from "react";
import { Check, CheckCircle2, Copy, Home, PenLine, Plus, RefreshCw, Star as StarIcon, Trash2 } from "lucide-react";
import Link from "next/link";
import { generate } from "@/lib/api";
import type { HistoryItem } from "@/lib/ai/contract";
import { starBody } from "@/lib/domain/context";
import { MAX_STORY_QUESTIONS } from "@/lib/domain/stages";
import { charCount, charCountNoSpace, copyText, storyText } from "@/lib/domain/text";
import type { Experience, Story } from "@/lib/domain/types";
import { getStore, useAppStore } from "@/lib/store/useAppStore";
import { runTask, useAutoTask } from "@/lib/store/useTaskRunner";
import RoundCard from "@/components/interview/RoundCard";
import AutoTextarea from "@/components/ui/AutoTextarea";
import Button from "@/components/ui/Button";
import TaskState from "@/components/ui/TaskState";
import { href } from "@/lib/mode";
import { confirmAction } from "@/components/ui/ConfirmDialog";

const LIMIT_PRESETS = [500, 700, 1000, 1500];

const answersOf = (story: Story): HistoryItem[] =>
  story.followups.flatMap((r) => r.items.map((i) => ({ question: i.question, answer: i.answer, skipped: i.skipped })));

function currentStory(id: string, storyId: string) {
  const exp = getStore().experiences[id];
  return { exp, story: exp.stories.find((s) => s.id === storyId)! };
}

async function checkStory(id: string, storyId: string) {
  const { exp, story } = currentStory(id, storyId);
  if (!exp.star) return;
  const r = await generate("story_followup", {
    basic: exp.basic,
    star: starBody(exp.star),
    keywords: exp.keyword?.candidates ?? [],
    prompt: story.prompt,
    charLimit: story.charLimit,
    previous: answersOf(story),
  });
  const qs = r.questions.slice(0, MAX_STORY_QUESTIONS);
  if (qs.length) getStore().addStoryRound(id, storyId, qs);
  getStore().markStoryChecked(id, storyId);
}

async function writeStory(id: string, storyId: string) {
  const { exp, story } = currentStory(id, storyId);
  if (!exp.star) return;
  const r = await generate("story", {
    basic: exp.basic,
    star: starBody(exp.star),
    keywords: exp.keyword?.candidates ?? [],
    selectedKeywordIndex: exp.keyword?.selectedIndex ?? null,
    prompt: story.prompt,
    charLimit: story.charLimit,
    answers: answersOf(story),
  });
  getStore().setStoryResult(id, storyId, { subtitle: r.subtitle.trim(), body: r.body.trim() });
}

// ---------- 옵션 입력 ----------

function StoryOptions({ experience, onCreated, onCancel }: { experience: Experience; onCreated: (storyId: string) => void; onCancel?: () => void }) {
  const createStory = useAppStore((s) => s.createStory);
  const [prompt, setPrompt] = useState("");
  const [limit, setLimit] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const rep = experience.keyword?.selectedIndex != null ? experience.keyword.candidates[experience.keyword.selectedIndex] : null;

  const effectiveLimit = custom ? Number(custom) : limit;
  const limitInvalid = custom !== "" && (!Number.isInteger(Number(custom)) || Number(custom) < 100 || Number(custom) > 5000);

  return (
    <div className="space-y-6 rounded-2xl border border-line bg-surface p-4 sm:p-6">
      <div>
        <label htmlFor="story-prompt" className="mb-1.5 block font-medium">
          자기소개서 문항 <span className="ml-1 text-sm font-normal text-ink-faint">선택</span>
        </label>
        <AutoTextarea
          id="story-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="예) 주도적으로 문제를 해결한 경험을 구체적으로 작성해 주세요."
          minRows={2}
        />
        <p className="mt-1.5 text-sm text-ink-faint">비워 두면 기본 형태(경험 소개 → 판단과 행동 → 결과 → 배운 점)로 써요.</p>
      </div>

      <fieldset>
        <legend className="mb-1.5 font-medium">
          글자 수 <span className="ml-1 text-sm font-normal text-ink-faint">선택 · 공백 포함</span>
        </legend>
        <div className="flex flex-wrap items-center gap-2">
          {[null, ...LIMIT_PRESETS].map((n) => {
            const active = !custom && limit === n;
            return (
              <button
                key={n ?? "none"}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setLimit(n);
                  setCustom("");
                }}
                className={`min-h-11 cursor-pointer rounded-full border px-4 text-sm transition-colors duration-150 ${
                  active ? "border-primary bg-primary-soft font-semibold text-primary-text" : "border-line-strong bg-surface hover:bg-subtle"
                }`}
              >
                {n ? `${n}자` : "정하지 않음"}
              </button>
            );
          })}
          <label className="flex items-center gap-1.5 text-sm">
            <span className="sr-only">직접 입력</span>
            <input
              inputMode="numeric"
              value={custom}
              onChange={(e) => setCustom(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="직접 입력"
              aria-invalid={limitInvalid}
              className="min-h-11 w-28 rounded-full border border-line-strong bg-surface px-4 text-base focus:border-primary focus:outline-none sm:text-sm"
            />
            자
          </label>
        </div>
        {limitInvalid && <p className="mt-1.5 text-sm text-danger">글자 수는 100~5000 사이로 입력해 주세요.</p>}
      </fieldset>

      {rep && (
        <p className="flex items-start gap-1.5 text-sm text-ink-soft">
          {/* 별은 첫 줄 높이(1lh)의 가운데에 (역량 키워드 화면 안내와 같은 정렬) */}
          <span className="flex h-[1lh] shrink-0 items-center">
            <StarIcon className="size-3.5 fill-primary text-primary-text" aria-hidden />
          </span>
          <span>소제목은 역량 키워드를 바탕으로 제안해요. 문항이 없으면 대표 키워드 ‘{rep.keyword}’를 써요.</span>
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            취소
          </Button>
        )}
        <Button
          disabled={limitInvalid}
          onClick={() => onCreated(createStory(experience.id, { prompt, charLimit: effectiveLimit ?? undefined }))}
        >
          <PenLine className="size-4" aria-hidden />
          스토리 만들기
        </Button>
      </div>
    </div>
  );
}

// ---------- 결과 편집 ----------

function StoryEditor({ experienceId, story, header }: { experienceId: string; story: Story; header: React.ReactNode }) {
  const editStory = useAppStore((s) => s.editStory);
  const [copied, setCopied] = useState(false);
  const text = storyText(story.subtitle, story.body);
  const total = charCount(text);
  const over = story.charLimit ? total > story.charLimit : false;

  const copy = async () => {
    if (await copyText(text)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-4 sm:p-6">
      {header}
      <div>
        <label htmlFor={`sub-${story.id}`} className="mb-1 block text-xs font-medium text-ink-faint">소제목</label>
        <input
          id={`sub-${story.id}`}
          value={story.subtitle}
          onChange={(e) => editStory(experienceId, story.id, { subtitle: e.target.value })}
          className="min-h-12 w-full rounded-lg border border-line-strong bg-surface px-3 text-lg font-bold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <div>
        <label htmlFor={`body-${story.id}`} className="mb-1 block text-xs font-medium text-ink-faint">본문 — 바로 고칠 수 있어요</label>
        <AutoTextarea
          id={`body-${story.id}`}
          value={story.body}
          onChange={(e) => editStory(experienceId, story.id, { body: e.target.value })}
          minRows={10}
          className="leading-[1.8]"
        />
      </div>

      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <p aria-live="polite" className={`text-sm tabular-nums ${over ? "font-semibold text-danger" : "text-ink-soft"}`}>
          공백 포함 {total.toLocaleString()}자
          {story.charLimit ? ` / ${story.charLimit.toLocaleString()}자` : ""}
          <span className="text-ink-faint"> · 공백 제외 {charCountNoSpace(text).toLocaleString()}자</span>
          {over && <span className="block sm:inline"> — {(total - story.charLimit!).toLocaleString()}자 넘었어요</span>}
        </p>
        <Button variant="secondary" onClick={copy}>
          {copied ? <Check className="size-4 text-ok" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? "복사했어요" : "글 복사"}
        </Button>
      </div>
      <p className="text-xs text-ink-faint">글자 수는 소제목과 본문을 합쳐 복사했을 때 기준이에요.</p>
    </div>
  );
}

// ---------- 스토리 하나의 진행 ----------

function StoryFlow({ experience, story }: { experience: Experience; story: Story }) {
  const { id } = experience;
  const submitRound = useAppStore((s) => s.submitRound);
  const deleteStory = useAppStore((s) => s.deleteStory);
  const open = story.followups.find((r) => !r.submittedAt) ?? null;
  const writeKey = `${id}:story:${story.id}`;

  const checkStatus = useAutoTask(`${id}:story_check:${story.id}`, !story.checked, () => checkStory(id, story.id));
  const writeStatus = useAutoTask(writeKey, story.checked && !open && !story.body, () => writeStory(id, story.id));

  // 이 글에만 해당하는 정보와 동작: 글이 생기면 카드 머리에, 그 전에는 카드 위에 둔다
  const header = (
      <div className={`flex flex-wrap items-center justify-between gap-2 text-sm text-ink-soft ${story.body ? "-mt-1 border-b border-line pb-3" : ""}`}>
        <p className="min-w-0 flex-1 break-keep">
          <span className="font-medium text-ink">문항</span> {story.prompt ?? "선택 안 함 (기본 형태)"}
          <span className="mx-2 text-line-strong">|</span>
          <span className="font-medium text-ink">글자 수</span> {story.charLimit ? `${story.charLimit}자` : "정하지 않음"}
        </p>
        <div className="flex gap-1">
          {story.body && (
            <Button
              variant="ghost"
              size="sm"
              loading={writeStatus?.state === "loading"}
              onClick={async () => {
                const ok = await confirmAction({ title: "이 글을 새로 쓸까요?", body: "직접 고친 내용은 사라져요.", confirmLabel: "새로 쓰기" });
                if (ok) void runTask(writeKey, () => writeStory(id, story.id));
              }}
            >
              {writeStatus?.state !== "loading" && <RefreshCw className="size-3.5" aria-hidden />}
              다시 생성
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            aria-label="이 글 삭제"
            onClick={async () => {
              if (await confirmAction({ title: "이 글을 삭제할까요?", body: "되돌릴 수 없어요.", confirmLabel: "삭제", tone: "danger" })) deleteStory(id, story.id);
            }}
          >
            <Trash2 className="size-3.5" aria-hidden />
          </Button>
        </div>
      </div>
  );

  return (
    <div className="space-y-4">
      {!story.body && header}

      <TaskState status={checkStatus} loadingText="글에 필요한 생각·의도·감정이 원고에 있는지 살펴보고 있어요" />

      {open && (
        <div className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
          <p className="mb-1 font-semibold">글을 쓰기 전에 몇 가지만 여쭤볼게요</p>
          <p className="mb-5 text-sm text-ink-soft">원고에 없는 생각이나 감정은 지어내지 않아요. 기억나는 만큼만 적어 주세요.</p>
          <RoundCard experienceId={id} round={open} />
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => submitRound(id, open.id, true)}>
              건너뛰고 글 쓰기
            </Button>
            <Button onClick={() => submitRound(id, open.id)}>
              <PenLine className="size-4" aria-hidden />
              답변 제출하고 글 쓰기
            </Button>
          </div>
        </div>
      )}

      <TaskState status={writeStatus?.state === "loading" && story.body ? undefined : writeStatus} loadingText="소제목과 문단을 쓰고 있어요" />

      {story.body && <StoryEditor experienceId={id} story={story} header={header} />}
    </div>
  );
}

// ---------- 패널 ----------

export default function StoryPanel({ experience }: { experience: Experience }) {
  const setView = useAppStore((s) => s.setView);
  const { stories } = experience;
  const [selectedId, setSelectedId] = useState<string | null>(stories.at(-1)?.id ?? null);
  const [composingState, setComposing] = useState(stories.length === 0);
  const composing = composingState || stories.length === 0;
  const selected = stories.find((s) => s.id === selectedId) ?? stories.at(-1) ?? null;

  if (!experience.star) return <p className="text-ink-soft">STAR 원고가 만들어지면 자기소개서 글로 완성할 수 있어요.</p>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold sm:text-xl">스토리로 완성하기</h2>
        <p className="mt-1 text-sm text-ink-soft">STAR 원고를 소제목과 이어지는 문단의 자기소개서 글로 바꿔요. 문항마다 다른 글을 여러 개 만들 수 있어요.</p>
      </div>

      {/* 이 경험으로 쓴 글 목록 + 같은 경험으로 다른 문항의 글 추가 */}
      {stories.length > 0 && !composing && (
        <div role="group" aria-label="쓴 글 목록" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {stories.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={s.id === selected?.id}
              onClick={() => setSelectedId(s.id)}
              className={`min-h-11 max-w-60 shrink-0 cursor-pointer truncate rounded-full border px-4 text-sm transition-colors duration-150 ${
                s.id === selected?.id ? "border-primary bg-primary-soft font-semibold text-primary-text" : "border-line-strong bg-surface hover:bg-subtle"
              }`}
            >
              {i + 1}. {s.subtitle || s.prompt || "기본 형태"}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="press inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1 rounded-full border border-dashed border-line-strong px-4 text-sm font-medium text-ink-soft"
          >
            <Plus className="size-4" aria-hidden />
            다른 문항으로 쓰기
          </button>
        </div>
      )}

      {composing ? (
        <StoryOptions
          experience={experience}
          onCancel={stories.length ? () => setComposing(false) : undefined}
          onCreated={(storyId) => {
            setSelectedId(storyId);
            setComposing(false);
          }}
        />
      ) : (
        selected && <StoryFlow key={selected.id} experience={experience} story={selected} />
      )}

      {/* 마무리: 이 경험의 마지막 단계라 다음 행동으로 잇는다 (경험 완성 안내와 같은 모양). 스토리는 완성한 경험에서만 연다 */}
      {!composing && selected?.body && (
        <div className="rounded-xl border border-ok/30 bg-ok-soft p-4">
          <p className="flex items-center gap-2 font-medium text-ok">
            <CheckCircle2 className="size-4" aria-hidden />
            이 경험의 글을 완성했어요.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => setView("new")}>
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
      )}
    </div>
  );
}
