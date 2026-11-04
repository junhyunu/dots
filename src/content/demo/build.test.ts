import { describe, expect, it } from "vitest";
import { COMPETENCY_IDS } from "@/lib/domain/competencies";
import { missingKeywordComps } from "@/lib/domain/keywords";
import { SCHEMA_VERSION } from "@/lib/domain/types";
import { buildDemoState } from "./build";

// 구성 번호 몇 개로 규칙을 확인한다 (#1은 처음 상태)
const SEEDS = [1, 2, 3, 7, 42, 1234, 3905, 99999];

describe("시연 모드 가상 데이터 (CLAUDE.md 2-2절)", () => {
  it("같은 구성 번호면 항상 같은 결과", () => {
    expect(buildDemoState(1)).toEqual(buildDemoState(1));
    expect(buildDemoState(42)).toEqual(buildDemoState(42));
  });

  it("구성 번호가 다르면 결과가 달라진다 ([다시 섞기])", () => {
    expect(buildDemoState(1)).not.toEqual(buildDemoState(2));
  });

  it.each(SEEDS)("구성 #%i: 역량마다 완성한 경험 1~10개", (seed) => {
    const state = buildDemoState(seed);
    const done = Object.values(state.experiences).filter((e) => e.matchesConfirmed);
    for (const cid of COMPETENCY_IDS) {
      const n = done.filter((e) => e.matches?.some((m) => m.competencyId === cid)).length;
      expect(n, cid).toBeGreaterThanOrEqual(1);
      expect(n, cid).toBeLessThanOrEqual(10);
    }
  });

  it.each(SEEDS)("구성 #%i: 작업 중 경험 2개(질문 중, 역량 연결 전)", (seed) => {
    const working = Object.values(buildDemoState(seed).experiences).filter((e) => e.status !== "done");
    expect(working.map((e) => e.status).sort()).toEqual(["interviewing", "matching"]);
  });

  it.each(SEEDS)("구성 #%i: 완성한 경험은 대표 1 + 보조 최대 2, 연결한 역량마다 키워드", (seed) => {
    for (const e of Object.values(buildDemoState(seed).experiences).filter((x) => x.matchesConfirmed)) {
      expect(e.matches!.filter((m) => m.role === "primary"), e.basic.title).toHaveLength(1);
      expect(e.matches!.filter((m) => m.role === "secondary").length, e.basic.title).toBeLessThanOrEqual(2);
      expect(missingKeywordComps(e.keyword, e.matches), e.basic.title).toEqual([]);
    }
  });

  it("최신 경험이 맨 앞, 저장 구조 버전은 지금 것", () => {
    const state = buildDemoState(1);
    const dates = state.experienceOrder.map((id) => state.experiences[id].createdAt);
    expect(dates).toEqual([...dates].sort().reverse());
    expect(state.schemaVersion).toBe(SCHEMA_VERSION);
  });
});
