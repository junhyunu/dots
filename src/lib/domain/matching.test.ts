import { describe, expect, it } from "vitest";
import { experience, match } from "@/test/factory";
import type { CompetencyId } from "./types";
import { linkedMatch, normalizeMatches } from "./matching";

const ai = (competencyId: CompetencyId, role: "primary" | "secondary", actionNumbers: number[] = [], scene = "장면") => ({
  competencyId,
  role,
  scene,
  actionNumbers,
});

describe("AI 역량 연결 제안 정리 (대표 1 + 보조 최대 2)", () => {
  it("대표가 2개 오면 앞의 것만 대표, 나머지는 보조", () => {
    const result = normalizeMatches([ai("conflict", "primary"), ai("decision", "primary")], 3);
    expect(result.map((m) => [m.competencyId, m.role])).toEqual([
      ["conflict", "primary"],
      ["decision", "secondary"],
    ]);
  });

  it("대표가 없으면 맨 앞 역량을 대표로", () => {
    const result = normalizeMatches([ai("conflict", "secondary"), ai("decision", "secondary")], 3);
    expect(result[0]).toMatchObject({ competencyId: "conflict", role: "primary" });
  });

  it("대표는 목록 맨 앞으로 온다", () => {
    const result = normalizeMatches([ai("conflict", "secondary"), ai("decision", "primary")], 3);
    expect(result.map((m) => m.competencyId)).toEqual(["decision", "conflict"]);
  });

  it("4개 이상 오면 3개까지만 (대표 1 + 보조 2)", () => {
    const result = normalizeMatches(
      [ai("conflict", "primary"), ai("decision", "secondary"), ai("challenge", "secondary"), ai("motivation", "secondary")],
      3,
    );
    expect(result).toHaveLength(3);
    expect(result.filter((m) => m.role === "secondary")).toHaveLength(2);
  });

  it("같은 역량이 두 번 오거나 장면이 비어 있으면 뺀다", () => {
    const result = normalizeMatches([ai("conflict", "primary"), ai("conflict", "secondary"), ai("decision", "secondary", [], "  ")], 3);
    expect(result.map((m) => m.competencyId)).toEqual(["conflict"]);
  });

  it("행동 번호는 1부터 → 0부터로 바꾸고, 없는 번호와 겹친 번호는 뺀다", () => {
    const result = normalizeMatches([ai("conflict", "primary", [1, 3, 3, 0, 9])], 3);
    expect(result[0].actionRefs).toEqual([0, 2]);
  });

  it("제안이 비어 있으면 빈 목록", () => {
    expect(normalizeMatches([], 3)).toEqual([]);
  });
});

describe("완성한 경험만 역량에 나타난다", () => {
  it("경험을 완성하기 전에는 연결된 역량이 없는 것으로 본다", () => {
    const matches = [match("conflict", "primary")];
    expect(linkedMatch(experience({ matches, matchesConfirmed: false }), "conflict")).toBeNull();
    expect(linkedMatch(experience({ matches, matchesConfirmed: true }), "conflict")?.role).toBe("primary");
    expect(linkedMatch(experience({ matches, matchesConfirmed: true }), "decision")).toBeNull();
  });
});
