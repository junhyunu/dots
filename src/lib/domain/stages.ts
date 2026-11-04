import type { StageId } from "./types";

export interface StageDef {
  id: StageId;
  name: string;
  title: string;
  /** 강의 자료(스토리 확장)의 단계별 핵심 질문. AI가 질문을 만들 때 참고한다. */
  focus: string[];
  /** 단계 제목 아래 흐린 안내 한 줄 (필요한 단계만) */
  hint?: string;
}

export const STAGES: StageDef[] = [
  {
    id: "situation",
    name: "상황",
    title: "어떤 문제에서 시작했나요?",
    focus: ["어떤 문제가 발생했는가?", "그 문제는 왜 중요한 문제였는가?", "나의 역할과 책임은 무엇이었는가?"],
  },
  {
    id: "goal",
    name: "목표",
    title: "무엇을 이루려 했나요?",
    focus: ["우선적으로 해결하고자 한 핵심 목표는?", "성공 기준은 무엇이었는가?", "왜 목표 달성에 몰입했는가?"],
  },
  {
    id: "action",
    name: "행동",
    title: "직접 무엇을 했나요?",
    focus: ["문제 원인을 어떻게 파악했는가?", "어떤 기술적·협업적 선택을 했는가?", "직접 주도적으로 한 행동은 무엇인가?"],
  },
  {
    id: "result",
    name: "결과",
    title: "무엇이 달라졌나요?",
    focus: [
      "해결 후 어떤 변화가 있었는가?",
      "수치가 없다면, 전과 후에 무엇이 달라졌는가? (사람들의 반응, 그 뒤 이어지거나 바뀐 일)",
      "수치 또는 명확한 상황으로 표현할 수 있는 성과는?",
    ],
    // UT 6명 모두 결과·수치화에서 막힘 (2026-11-04 사용자 결정)
    hint: "숫자가 없어도 괜찮아요. 전과 후에 달라진 점, 사람들의 반응, 그 뒤 바뀐 일을 적어 보세요.",
  },
  {
    id: "learning",
    name: "배운 점",
    title: "무엇을 배웠나요?",
    focus: ["이 경험으로 얻은 교훈은?", "비슷한 상황에서 어떻게 행동할 것인가?"],
  },
];

export const STAGE_ORDER: StageId[] = STAGES.map((s) => s.id);

export const MAX_FOLLOWUP_ROUNDS = 2;
export const MAX_FINAL_CHECK_QUESTIONS = 3;
export const MAX_STORY_QUESTIONS = 3;
export const MAX_SECONDARY_COMPETENCIES = 2;

export function stageDef(id: StageId): StageDef {
  return STAGES.find((s) => s.id === id)!;
}

export function nextStage(id: StageId): StageId | null {
  const i = STAGE_ORDER.indexOf(id);
  return STAGE_ORDER[i + 1] ?? null;
}
