// 브라우저와 API 함수가 함께 쓰는 요청·응답 약속.
// 새 AI 작업을 추가하려면: TASKS에 이름 추가 → 아래 스키마·payload 추가 → server/tasks.ts에 메시지 작성 함수 추가 → 프롬프트.md에 섹션 추가.
import { z } from "zod";
import { COMPETENCY_IDS } from "@/lib/domain/competencies";
import type { CompetencyId, ExperienceBasic, KeywordCandidate, MatchRole, StageId, StarDraft } from "@/lib/domain/types";

export const TASKS = [
  "questions",
  "followup",
  "final_check",
  "star",
  "keyword",
  "match",
  "story_followup",
  "story",
] as const;
export type TaskName = (typeof TASKS)[number];

// ---------- 출력 스키마 (구조화 출력으로 강제됨) ----------

const Question = z.object({
  question: z.string().describe("사용자에게 보여줄 질문"),
  reason: z.string().describe("왜 묻는지 한 줄. 첫 질문이면 빈 문자열"),
});

const QuestionList = z.object({ questions: z.array(Question) });

const CompetencyEnum = z.enum(COMPETENCY_IDS);

export const OUTPUT_SCHEMAS = {
  questions: QuestionList,
  followup: z.object({
    sufficient: z.boolean(),
    summary: z.string(),
    questions: z.array(Question),
  }),
  final_check: QuestionList,
  star: z.object({
    situation: z.string(),
    task: z.string(),
    actions: z.array(z.object({ label: z.string(), body: z.string() })),
    result: z.string(),
    learning: z.string(),
  }),
  keyword: z.object({
    candidates: z.array(z.object({ competencyId: CompetencyEnum, keyword: z.string(), sentence: z.string() })),
  }),
  match: z.object({
    matches: z.array(
      z.object({
        competencyId: CompetencyEnum,
        role: z.enum(["primary", "secondary"]),
        scene: z.string(),
        actionNumbers: z.array(z.number().int()).describe("관련된 A 행동 항목 번호 (1부터)"),
      }),
    ),
  }),
  story_followup: QuestionList,
  story: z.object({ subtitle: z.string(), body: z.string() }),
} satisfies Record<TaskName, z.ZodType>;

export type TaskOutput<T extends TaskName> = z.infer<(typeof OUTPUT_SCHEMAS)[T]>;

// ---------- 입력 ----------

/** AI에게 넘기는 질문·답 기록 (단계별) */
export interface HistoryItem {
  question: string;
  answer: string;
  skipped: boolean;
}
export interface StageHistory {
  stage: StageId;
  summary: string | null;
  summaryEdited: boolean;
  items: HistoryItem[];
}

export interface ExperienceContext {
  basic: ExperienceBasic;
  history: StageHistory[];
  finalCheck: HistoryItem[];
}

export type StarBlock = "situation" | "task" | "actions" | "result" | "learning";

export interface TaskPayloads {
  questions: { context: ExperienceContext; stage: StageId };
  followup: { context: ExperienceContext; stage: StageId; followupCount: number; forceComplete: boolean };
  final_check: { context: ExperienceContext };
  star: { context: ExperienceContext; regenerate?: { block: StarBlock; current: Omit<StarDraft, "generatedAt" | "edited"> } };
  /** links = 키워드를 쓸 역량(연결한 역량 전체, 또는 [다시 쓰기]한 하나). 역량마다 1개씩 돌려받는다 */
  keyword: {
    basic: ExperienceBasic;
    star: Omit<StarDraft, "generatedAt" | "edited">;
    links: { competencyId: CompetencyId; role: MatchRole; scene: string }[];
  };
  match: { basic: ExperienceBasic; star: Omit<StarDraft, "generatedAt" | "edited"> };
  story_followup: {
    basic: ExperienceBasic;
    star: Omit<StarDraft, "generatedAt" | "edited">;
    keywords: KeywordCandidate[];
    prompt?: string;
    charLimit?: number;
    previous: HistoryItem[];
  };
  story: {
    basic: ExperienceBasic;
    star: Omit<StarDraft, "generatedAt" | "edited">;
    keywords: KeywordCandidate[];
    selectedKeywordIndex: number | null;
    prompt?: string;
    charLimit?: number;
    answers: HistoryItem[];
  };
}

export interface GenerateRequest<T extends TaskName = TaskName> {
  task: T;
  payload: TaskPayloads[T];
}

export interface GenerateErrorBody {
  error: { code: string; message: string; retryable: boolean };
}
