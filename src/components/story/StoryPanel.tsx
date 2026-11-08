"use client";
// 스토리 완성: STAR 원고 → 소제목 + 문단의 자기소개서 글.
// 흐름: 옵션(문항·글자 수, 선택) → 부족한 생각·의도·감정이 있으면 추가 질문 → 글 생성 → 수정·다시 생성·복사
import { useEffect, useRef, useState } from "react";
import { Check, CheckCircle2, Copy, Home, PenLine, Plus, RefreshCw, Star as StarIcon, Trash2 } from "lucide-react";
import Link from "next/link";
import { generate } from "@/lib/api";
import type { HistoryItem } from "@/lib/ai/contract";
import { starBody } from "@/lib/domain/context";
import { MAX_STORY_QUESTIONS } from "@/lib/domain/stages";
import { charCount, charCountNoSpace, copyText, storyText, storyWritten } from "@/lib/domain/text";
import type { Experience, Story } from "@/lib/domain/types";
import { getStore, useAppStore } from "@/lib/store/useAppStore";
import { runTask, useAutoTask } from "@/lib/store/useTaskRunner";
import RoundCard from "@/components/interview/RoundCard";
import AutoTextarea from "@/components/ui/AutoTextarea";
import Button from "@/components/ui/Button";
import TaskState from "@/components/ui/TaskState";
import { href } from "@/lib/mode";
import { confirmAction } from "@/components/ui/ConfirmDialog";
import { showToast } from "@/components/ui/Toast";

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
              aria-describedby={limitInvalid ? "story-limit-error" : undefined}
              className="min-h-11 w-28 rounded-full border border-line-strong bg-surface px-4 text-base focus:border-primary focus:outline-none sm:text-sm"
            />
            자
          </label>
        </div>
        {limitInvalid && <p id="story-limit-error" className="mt-1.5 text-sm text-danger">글자 수는 100~5000 사이로 입력해 주세요.</p>}
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
      showToast("복사했어요");
    } else showToast("복사하지 못했어요. 글을 직접 선택해 복사해 주세요.");
  };

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-4 sm:p-6">
      {header}
      <div>
        <label htmlFor={`sub-${story.id}`} className="mb-1 block text-xs font-medium text-ink-faint">소제목</label>
        {/* 긴 소제목도 다 보이게 칸이 줄 수만큼 늘어난다(휴대폰에서 보통 두 줄). 한 문장이라 Enter·붙여넣은 줄바꿈은 넣지 않는다 (2026-11-08 사용자 결정) */}
        <AutoTextarea
          id={`sub-${story.id}`}
          value={story.subtitle}
          minRows={1}
          onChange={(e) => editStory(experienceId, story.id, { subtitle: e.target.value.replace(/\s*\n\s*/g, " ") })}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) e.preventDefault();
          }}
          className="min-h-12 !py-[9px] !text-lg !leading-[1.5] font-bold"
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
  // 답을 하나라도 쓰거나 "기억 안 남"을 눌러야 [답변 제출]이 눌린다(단계 질문·전체 점검과 같은 규칙). 답하지 않을 거면 [건너뛰고 글 쓰기]
  const canSubmit = !!open && open.items.some((i) => i.skipped || i.answer.trim());
  const writeKey = `${id}:story:${story.id}`;
  const written = storyWritten(story);

  const checkStatus = useAutoTask(`${id}:story_check:${story.id}`, !story.checked, () => checkStory(id, story.id));
  const writeStatus = useAutoTask(writeKey, story.checked && !open && !written, () => writeStory(id, story.id));
  const writing = writeStatus?.state === "loading";

  // 키보드 위치: 누른 버튼이 사라지면 페이지 전체로 돌아가므로, 이 글에서 새로 생긴 곳으로 옮긴다.
  // 추가 질문이 오면 첫 답변 칸, 글이 나오면(다시 생성 포함) 소제목. 화면에 있는 동안 바뀔 때만(새로고침으로 다시 열 때는 그대로)
  const openRef = useRef<HTMLDivElement>(null);
  const prev = useRef({ openId: open?.id ?? null, writing });
  useEffect(() => {
    const p = prev.current;
    prev.current = { openId: open?.id ?? null, writing };
    const now = document.activeElement;
    // 다른 곳(사이드바 등)을 보고 있으면 빼앗지 않는다: 페이지 전체이거나 스토리 화면 안(글 목록·다시 생성 버튼 등)에 있을 때만
    const mine = !now || now === document.body || !!now.closest("[data-story-panel]");
    if (!mine) return;
    if (open && open.id !== p.openId) openRef.current?.querySelector<HTMLElement>("textarea, button")?.focus({ preventScroll: true });
    else if (p.writing && !writing && written) document.getElementById(`sub-${story.id}`)?.focus({ preventScroll: true });
  }, [open, writing, written, story.id]);

  // 이 글에만 해당하는 정보와 동작: 글이 생기면 카드 머리에, 그 전에는 카드 위에 둔다
  // 휴대폰: 첫 줄 = "문항" + 버튼, 그 아래 문항 글(카드 너비 전부), 글자 수. 문항이 버튼 옆 좁은 칸에서 여러 줄로 꺾이지 않게
  // PC: 한 줄. 문항 글은 최대 28em(약 30자)까지, 넘으면 문항만 줄바꿈하고 글자 수·버튼은 첫 줄에 (2026-11-08 사용자 결정)
  // 글자는 버튼(마우스 기기 40px, 터치 44px)의 첫 줄 가운데에 오게 위 여백을 준다. 읽는 순서는 문항 → 글자 수 → 버튼
  const textTop = "sm:pt-[calc((2.75rem-1lh)/2)] sm:pointer-fine:pt-[calc((2.5rem-1lh)/2)]";
  const header = (
      <div
        className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 text-sm text-ink-soft sm:grid-cols-[auto_minmax(0,28em)_auto_auto_minmax(0,1fr)_auto] sm:items-start ${written ? "-mt-1 border-b border-line pb-3" : ""}`}
      >
        <span className={`col-start-1 row-start-1 font-medium text-ink sm:mr-1.5 ${textTop}`}>문항</span>
        <p className={`col-span-2 row-start-2 text-ink sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:text-ink-soft ${textTop}`}>
          {story.prompt ?? "선택 안 함 (기본 형태)"}
        </p>
        <span aria-hidden className={`hidden text-line-strong sm:col-start-3 sm:row-start-1 sm:mx-2 sm:block ${textTop}`}>|</span>
        <p className={`col-span-2 row-start-3 mt-1 sm:col-span-1 sm:col-start-4 sm:row-start-1 sm:mt-0 sm:whitespace-nowrap ${textTop}`}>
          <span className="mr-1.5 font-medium text-ink">글자 수</span>
          {story.charLimit ? `${story.charLimit}자` : "정하지 않음"}
        </p>
        <div className="col-start-2 row-start-1 -mr-2 flex gap-1 justify-self-end whitespace-nowrap sm:col-start-6">
          {written && (
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
              if (await confirmAction({ title: "이 글을 삭제할까요?", body: "되돌릴 수 없어요.", confirmLabel: "삭제", tone: "danger" })) {
                deleteStory(id, story.id);
                // 지운 뒤에는 글 목록(지금 고른 글)으로, 글이 하나도 없으면 문항 입력 칸으로
                requestAnimationFrame(() => focusStoryList());
              }
            }}
          >
            <Trash2 className="size-3.5" aria-hidden />
          </Button>
        </div>
      </div>
  );

  return (
    <div className="space-y-4">
      {!written && header}

      <TaskState status={checkStatus} loadingText="글에 필요한 생각·의도·감정이 원고에 있는지 살펴보고 있어요" />

      {open && (
        <div ref={openRef} className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
          <p className="mb-1 font-semibold">글을 쓰기 전에 몇 가지만 여쭤볼게요</p>
          <p className="mb-5 text-sm text-ink-soft">원고에 없는 생각이나 감정은 지어내지 않아요. 기억나는 만큼만 적어 주세요.</p>
          <RoundCard experienceId={id} round={open} />
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => submitRound(id, open.id, true)}>
              건너뛰고 글 쓰기
            </Button>
            <Button disabled={!canSubmit} onClick={() => submitRound(id, open.id)}>
              <PenLine className="size-4" aria-hidden />
              답변 제출하고 글 쓰기
            </Button>
          </div>
        </div>
      )}

      <TaskState status={writeStatus?.state === "loading" && written ? undefined : writeStatus} loadingText="소제목과 문단을 쓰고 있어요" />

      {written && <StoryEditor experienceId={id} story={story} header={header} />}
    </div>
  );
}

// ---------- 패널 ----------

/** 글 목록에서 지금 고른 글로 키보드 위치를 옮긴다. 목록이 없으면(글을 새로 쓰는 중) 문항 입력 칸으로 */
function focusStoryList() {
  const target =
    document.querySelector<HTMLElement>('[aria-label="쓴 글 목록"] [aria-pressed="true"]') ?? document.getElementById("story-prompt");
  target?.focus({ preventScroll: true });
}

export default function StoryPanel({ experience }: { experience: Experience }) {
  const setView = useAppStore((s) => s.setView);
  const { stories } = experience;
  const [selectedId, setSelectedId] = useState<string | null>(stories.at(-1)?.id ?? null);
  const [composingState, setComposing] = useState(stories.length === 0);
  const composing = composingState || stories.length === 0;
  const selected = stories.find((s) => s.id === selectedId) ?? stories.at(-1) ?? null;

  // 키보드 위치: [다른 문항으로 쓰기] → 문항 칸, [스토리 만들기] → 새 글(목록에서 고른 글), [취소] → [다른 문항으로 쓰기]
  const focusAfter = useRef<"prompt" | "list" | "add" | null>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const t = focusAfter.current;
    if (!t) return;
    focusAfter.current = null;
    if (t === "prompt") document.getElementById("story-prompt")?.focus({ preventScroll: true });
    else if (t === "add") addRef.current?.focus({ preventScroll: true });
    else focusStoryList();
  });

  if (!experience.star) return <p className="text-ink-soft">STAR 원고가 만들어지면 자기소개서 글로 완성할 수 있어요.</p>;

  return (
    <div data-story-panel className="space-y-4">
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
            ref={addRef}
            type="button"
            onClick={() => {
              setComposing(true);
              focusAfter.current = "prompt";
            }}
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
          onCancel={
            stories.length
              ? () => {
                  setComposing(false);
                  focusAfter.current = "add";
                }
              : undefined
          }
          onCreated={(storyId) => {
            setSelectedId(storyId);
            setComposing(false);
            focusAfter.current = "list";
          }}
        />
      ) : (
        selected && <StoryFlow key={selected.id} experience={experience} story={selected} />
      )}

      {/* 마무리: 이 경험의 마지막 단계라 다음 행동으로 잇는다 (경험 완성 안내와 같은 모양). 스토리는 완성한 경험에서만 연다 */}
      {!composing && selected && storyWritten(selected) && (
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
