import { describe, expect, it } from "vitest";
import {
  MAX_FINAL_CHECK_QUESTIONS,
  MAX_FOLLOWUP_ROUNDS,
  MAX_SECONDARY_COMPETENCIES,
  MAX_STORY_QUESTIONS,
  STAGES,
  nextStage,
} from "./stages";
import { COMPETENCIES } from "./competencies";

describe("단계와 횟수 (CLAUDE.md 2절과 같아야 함)", () => {
  it("상황 → 목표 → 행동 → 결과 → 배운 점", () => {
    expect(STAGES.map((s) => s.name)).toEqual(["상황", "목표", "행동", "결과", "배운 점"]);
  });

  it("다음 단계로 차례대로 가고, 배운 점 다음은 없다", () => {
    expect(nextStage("situation")).toBe("goal");
    expect(nextStage("result")).toBe("learning");
    expect(nextStage("learning")).toBeNull();
  });

  it("추가 질문 최대 2회, 전체 점검·스토리 추가 질문 최대 3문항, 보조 역량 최대 2개", () => {
    expect(MAX_FOLLOWUP_ROUNDS).toBe(2);
    expect(MAX_FINAL_CHECK_QUESTIONS).toBe(3);
    expect(MAX_STORY_QUESTIONS).toBe(3);
    expect(MAX_SECONDARY_COMPETENCIES).toBe(2);
  });

  it("역량은 7개 (CLAUDE.md 3절 순서)", () => {
    expect(COMPETENCIES.map((c) => c.name)).toEqual(["문제 해결", "도전적 요소", "판단·의사결정", "시행착오·실패", "협업·조직 역할", "갈등 조율", "몰입 동기"]);
  });
});
