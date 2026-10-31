// 저장된 경험을 AI 요청용 입력으로 바꾼다.
import type { ExperienceContext, HistoryItem } from "@/lib/ai/contract";
import { STAGE_ORDER } from "./stages";
import type { Experience, QARound, StarDraft } from "./types";

const toItems = (rounds: QARound[]): HistoryItem[] =>
  rounds.flatMap((r) => r.items.map((i) => ({ question: i.question, answer: i.answer, skipped: i.skipped })));

export function toContext(exp: Experience): ExperienceContext {
  return {
    basic: exp.basic,
    history: STAGE_ORDER.map((stage) => {
      const log = exp.interview.stages[stage];
      return { stage, summary: log.summary, summaryEdited: log.summaryEdited, items: toItems(log.rounds) };
    }),
    finalCheck: toItems(exp.interview.finalCheck ?? []),
  };
}

export function starBody(star: StarDraft): Omit<StarDraft, "generatedAt" | "edited"> {
  const { situation, task, actions, result, learning } = star;
  return { situation, task, actions, result, learning };
}
