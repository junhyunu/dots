import "server-only";
import { COMPETENCIES } from "@/lib/domain/competencies";
import { MAX_FINAL_CHECK_QUESTIONS, MAX_FOLLOWUP_ROUNDS, stageDef } from "@/lib/domain/stages";
import type { ExperienceBasic, KeywordCandidate, StarDraft } from "@/lib/domain/types";
import type { ExperienceContext, HistoryItem, TaskName, TaskPayloads } from "../contract";

type Effort = "low" | "medium" | "high";

interface TaskDef<T extends TaskName> {
  /** 프롬프트.md의 key */
  promptKey: string;
  effort: Effort;
  buildMessage: (payload: TaskPayloads[T]) => string;
}

// ---------- user 메시지 조립 도우미 ----------

function basicBlock(b: ExperienceBasic): string {
  return `[경험 기본 정보]\n- 경험명: ${b.title}\n- 시기: ${b.period || "(미입력)"}\n- 역할: ${b.role || "(미입력)"}`;
}

function answerText(item: HistoryItem): string {
  if (item.skipped) return "(기억 안 남 — 다시 묻지 말 것)";
  return item.answer.trim() || "(답하지 않음)";
}

function itemsBlock(items: HistoryItem[]): string {
  return items.map((it) => `Q. ${it.question}\nA. ${answerText(it)}`).join("\n\n");
}

function historyBlock(ctx: ExperienceContext): string {
  const parts = ctx.history
    .filter((h) => h.items.length > 0)
    .map((h) => {
      const name = stageDef(h.stage).name;
      const summary = h.summary
        ? `(요약${h.summaryEdited ? " — 사용자가 수정함" : ""}) ${h.summary}\n\n`
        : "";
      return `### ${name}\n${summary}${itemsBlock(h.items)}`;
    });
  if (ctx.finalCheck.length > 0) parts.push(`### 전체 점검\n${itemsBlock(ctx.finalCheck)}`);
  return parts.length ? `[지금까지의 질문과 답]\n${parts.join("\n\n")}` : "[지금까지의 질문과 답]\n(아직 없음)";
}

type StarBody = Omit<StarDraft, "generatedAt" | "edited">;

function starBlock(star: StarBody): string {
  const actions = star.actions.map((a, i) => `${i + 1}. ${a.label}: ${a.body}`).join("\n");
  return `[STAR 원고]\nS 상황: ${star.situation}\nT 목표: ${star.task}\nA 행동:\n${actions}\nR 결과: ${star.result}\n배운 점: ${star.learning}`;
}

function competencyBlock(): string {
  return `[역량 7개]\n${COMPETENCIES.map((c) => `- ${c.id} / ${c.name}: ${c.description}`).join("\n")}`;
}

function keywordsBlock(keywords: KeywordCandidate[], selected: number | null = null): string {
  if (!keywords.length) return "[역량 키워드]\n(없음)";
  return `[역량 키워드]\n${keywords
    .map((k, i) => `- ${k.keyword}: ${k.sentence}${i === selected ? " (대표)" : ""}`)
    .join("\n")}`;
}

function storyOptionsBlock(prompt?: string, charLimit?: number): string {
  return `[자기소개서 문항]\n${prompt?.trim() || "(선택 안 함 — 기본 형태)"}\n\n[글자 수]\n${charLimit ? `${charLimit}자 (공백 포함)` : "(선택 안 함)"}`;
}

const join = (...blocks: string[]) => blocks.filter(Boolean).join("\n\n");

// ---------- 작업 정의 ----------

const STAR_BLOCK_NAMES = { situation: "S 상황", task: "T 목표", actions: "A 행동", result: "R 결과", learning: "배운 점" };

export const TASK_DEFS: { [T in TaskName]: TaskDef<T> } = {
  questions: {
    promptKey: "questions",
    effort: "medium",
    buildMessage: ({ context, stage }) => {
      const def = stageDef(stage);
      return join(
        basicBlock(context.basic),
        historyBlock(context),
        `[지금 단계]\n${def.name} — ${def.title}\n핵심 질문:\n${def.focus.map((f) => `- ${f}`).join("\n")}`,
        `[요청]\n'${def.name}' 단계의 첫 질문을 2~4개 만들어 주세요.`,
      );
    },
  },
  followup: {
    promptKey: "followup",
    effort: "medium",
    buildMessage: ({ context, stage, followupCount, forceComplete }) => {
      const def = stageDef(stage);
      const noMore = forceComplete || followupCount >= MAX_FOLLOWUP_ROUNDS;
      return join(
        basicBlock(context.basic),
        historyBlock(context),
        `[지금 단계]\n${def.name} — ${def.title}\n핵심 질문:\n${def.focus.map((f) => `- ${f}`).join("\n")}`,
        `[상태]\n- 이 단계에서 이미 한 추가 질문 횟수: ${followupCount}/${MAX_FOLLOWUP_ROUNDS}\n- 강제 종료: ${forceComplete ? "예 (사용자가 '충분해요, 다음으로'를 눌렀음)" : "아니오"}`,
        `[요청]\n'${def.name}' 단계의 답을 검토해 주세요.${noMore ? " 이번에는 추가 질문을 만들지 말고 요약만 작성해 주세요." : ""}`,
      );
    },
  },
  final_check: {
    promptKey: "final_check",
    effort: "medium",
    buildMessage: ({ context }) =>
      join(
        basicBlock(context.basic),
        historyBlock(context),
        `[요청]\n원고를 쓰기 전 전체 점검을 해 주세요. 꼭 필요한 질문만 최대 ${MAX_FINAL_CHECK_QUESTIONS}개입니다.`,
      ),
  },
  star: {
    promptKey: "star",
    effort: "high",
    buildMessage: ({ context, regenerate }) =>
      join(
        basicBlock(context.basic),
        historyBlock(context),
        regenerate
          ? `${starBlock(regenerate.current)}\n\n[요청]\n위 원고에서 '${STAR_BLOCK_NAMES[regenerate.block]}' 블록만 새로 써 주세요. 나머지 블록은 위 원고 그대로 돌려주세요.`
          : "[요청]\nSTAR 경험 원고를 작성해 주세요.",
      ),
  },
  keyword: {
    promptKey: "keyword",
    effort: "medium",
    buildMessage: ({ basic, star }) =>
      join(basicBlock(basic), starBlock(star), competencyBlock(), "[요청]\n역량 키워드 후보를 2~4개 만들어 주세요."),
  },
  match: {
    promptKey: "match",
    effort: "medium",
    buildMessage: ({ basic, star }) =>
      join(basicBlock(basic), starBlock(star), competencyBlock(), "[요청]\n이 경험의 대표 역량 1개와 보조 역량(0~2개)을 정해 주세요."),
  },
  story_followup: {
    promptKey: "story_followup",
    effort: "medium",
    buildMessage: ({ basic, star, keywords, prompt, charLimit, previous }) =>
      join(
        basicBlock(basic),
        starBlock(star),
        keywordsBlock(keywords),
        storyOptionsBlock(prompt, charLimit),
        previous.length ? `[이전에 한 질문과 답]\n${itemsBlock(previous)}` : "",
        "[요청]\n자기소개서 글에 필요한데 원고에 부족한 생각·의도·감정이 있는지 확인해 주세요.",
      ),
  },
  story: {
    promptKey: "story",
    effort: "high",
    buildMessage: ({ basic, star, keywords, selectedKeywordIndex, prompt, charLimit, answers }) =>
      join(
        basicBlock(basic),
        starBlock(star),
        keywordsBlock(keywords, selectedKeywordIndex),
        storyOptionsBlock(prompt, charLimit),
        answers.length ? `[스토리를 위한 추가 질문과 답]\n${itemsBlock(answers)}` : "",
        "[요청]\n자기소개서 글을 작성해 주세요.",
      ),
  },
};
