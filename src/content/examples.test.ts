import { describe, expect, it } from "vitest";
import { COMPETENCY_IDS } from "@/lib/domain/competencies";
import { EXAMPLES } from "./examples";

describe("홈 예시 결과물 (CLAUDE.md 2-1절)", () => {
  it("예시는 3개이고 모두 '예시' 표시가 있다", () => {
    expect(EXAMPLES).toHaveLength(3);
    expect(EXAMPLES.every((e) => e.example)).toBe(true);
  });

  it("세 예시로 역량 7개가 모두 한 번 이상 보인다", () => {
    const shown = new Set(EXAMPLES.flatMap((e) => e.matches.map((m) => m.competencyId)));
    expect([...shown].sort()).toEqual([...COMPETENCY_IDS].sort());
  });

  it("예시마다 대표 역량 1개 + 보조 역량 최대 2개", () => {
    for (const e of EXAMPLES) {
      expect(e.matches.filter((m) => m.role === "primary")).toHaveLength(1);
      expect(e.matches.filter((m) => m.role === "secondary").length).toBeLessThanOrEqual(2);
    }
  });
});
