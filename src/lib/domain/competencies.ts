import type { CompetencyId } from "./types";

export interface Competency {
  id: CompetencyId;
  name: string;
  description: string;
  /** 경험이 없는 역량을 눌렀을 때 보여주는 떠올리기 질문 */
  hint: string;
}

// 이름은 직군에 상관없이, 설명은 강의 자료 기준. 바꾸면 CLAUDE.md 3절도 함께 고친다.
export const COMPETENCIES: Competency[] = [
  { id: "problem_solving", name: "문제 해결", description: "문제 정의, 원인 분석, 해결책 도출·실행 방식", hint: "예상과 다른 문제를 발견하고 풀어 본 적이 있나요?" },
  { id: "challenge", name: "도전적 요소", description: "새로운 접근, 도전 수준, 시도에 대한 판단과 실행", hint: "해 본 적 없는 방식에 도전해 본 적이 있나요?" },
  { id: "decision", name: "판단·의사결정", description: "대안 비교, 판단 근거, 상황에 맞는 합리적 의사결정", hint: "여러 선택지 중 하나를 근거를 갖고 고른 순간이 있나요?" },
  { id: "trial_error", name: "시행착오·실패", description: "책임 인식, 원인 분석, 회고와 행동 변화", hint: "잘 안 됐던 일에서 원인을 찾아 다시 해 본 적이 있나요?" },
  { id: "collaboration", name: "협업·조직 역할", description: "역할과 기여, 소통 방식, 팀 내 협업 방식", hint: "팀 안에서 맡은 역할로 결과에 기여한 경험이 있나요?" },
  { id: "conflict", name: "갈등 조율", description: "갈등 상황의 인식, 우선순위 판단, 합의·해결 방식", hint: "팀에서 의견이 갈렸던 순간이 있었나요?" },
  { id: "motivation", name: "몰입 동기", description: "동기 요인, 목표 설정, 지속적으로 행동하게 하는 원동력", hint: "누가 시키지 않아도 끝까지 붙잡았던 일이 있나요?" },
];

export const COMPETENCY_IDS = COMPETENCIES.map((c) => c.id) as [CompetencyId, ...CompetencyId[]];

export function competencyName(id: CompetencyId): string {
  return COMPETENCIES.find((c) => c.id === id)?.name ?? id;
}

export function competency(id: CompetencyId): Competency {
  return COMPETENCIES.find((c) => c.id === id)!;
}
