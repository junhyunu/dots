import { describe, expect, it } from "vitest";
import { kw } from "@/test/factory";
import { SCHEMA_VERSION } from "@/lib/domain/types";
import { migrate } from "./migrations";

type Json = Record<string, any>;
const wrap = (exp: Json) => ({ schemaVersion: 1, experienceOrder: ["e"], experiences: { e: exp }, activeExperienceId: "e" });
const run = (exp: Json, version: number) => (migrate(wrap(exp), version) as Json).experiences.e;

describe("예전 데이터 옮기기: v1 → v2 (역량 매칭을 대표/보조 구조로)", () => {
  const v1 = {
    status: "done",
    matchesConfirmed: true,
    keyword: { candidates: [kw("decision"), kw("conflict")], selectedIndex: 1 },
    matches: [
      { competencyId: "decision", enabled: true, scene: "판단 장면" },
      { competencyId: "conflict", enabled: true, scene: "갈등 장면" },
      { competencyId: "challenge", enabled: false, scene: "꺼 둔 역량" },
      { competencyId: "motivation", enabled: true, scene: "  " },
    ],
    stories: [{ subtitle: "a", body: "b" }, { subtitle: "c", body: "d", checked: false }],
  };

  it("켜 둔 역량 중 장면이 있는 것만, 대표 키워드의 역량이 대표가 된다", () => {
    const e = run(structuredClone(v1), 1);
    expect(e.matches.map((m: Json) => [m.competencyId, m.role])).toEqual([
      ["conflict", "primary"],
      ["decision", "secondary"],
    ]);
  });

  it("4개 이상 켜져 있으면 3개까지만 (대표 1 + 보조 2)", () => {
    const many = ["decision", "conflict", "challenge", "motivation"].map((c) => ({ competencyId: c, enabled: true, scene: "장면" }));
    const e = run({ ...structuredClone(v1), matches: many }, 1);
    expect(e.matches).toHaveLength(3);
  });

  it("연결할 역량이 하나도 없으면 경험 완성을 푼다", () => {
    const e = run({ ...structuredClone(v1), matches: [{ competencyId: "decision", enabled: false, scene: "x" }] }, 1);
    expect(e.matches).toEqual([]);
    expect(e.matchesConfirmed).toBe(false);
  });

  it("스토리에 checked가 생기고, 이미 있던 값은 그대로", () => {
    const e = run(structuredClone(v1), 1);
    expect(e.stories.map((s: Json) => s.checked)).toEqual([true, false]);
  });
});

describe("예전 데이터 옮기기: v2 → v3 (순서가 원고 → 역량 연결 → 키워드로 바뀜)", () => {
  it("예전 순서(키워드 → 역량 연결) 때 키워드 단계에 있던 경험은 지금 순서에 맞게 역량 연결 단계로", () => {
    expect(run({ status: "keyword", matches: null, keyword: null, stories: [] }, 2).status).toBe("matching");
  });

  it("다른 단계의 경험은 그대로", () => {
    for (const status of ["interviewing", "drafting", "matching", "done"]) {
      expect(run({ status, matches: null, keyword: null, stories: [] }, 2).status).toBe(status);
    }
  });

  it("예전 키워드는 연결한 역량에 맞춰 정리된다 (연결 안 한 역량 키워드는 빠지고, 대표 역량 키워드가 대표)", () => {
    const e = run(
      {
        status: "done",
        matches: [
          { competencyId: "conflict", role: "secondary", scene: "s", actionRefs: [] },
          { competencyId: "decision", role: "primary", scene: "s", actionRefs: [] },
        ],
        keyword: { candidates: [kw("conflict"), kw("challenge"), kw("decision")], selectedIndex: 1 },
        stories: [],
      },
      2,
    );
    expect(e.keyword.candidates.map((c: Json) => c.competencyId)).toEqual(["decision", "conflict"]);
    expect(e.keyword.selectedIndex).toBe(0);
  });

  it("v1 데이터는 v2를 거쳐 v3까지 한 번에 옮겨진다", () => {
    const e = run(
      {
        status: "keyword",
        keyword: { candidates: [kw("decision")], selectedIndex: 0 },
        matches: [{ competencyId: "decision", enabled: true, scene: "장면" }],
      },
      1,
    );
    expect(e.status).toBe("matching");
    expect(e.matches[0]).toMatchObject({ competencyId: "decision", role: "primary" });
    expect(e.stories).toEqual([]);
  });
});

describe("예전 데이터가 깨져 있어도 앱이 멈추지 않는다", () => {
  it("저장 구조 버전은 지금 것으로", () => {
    expect((migrate(wrap({ status: "done", stories: [] }), 2) as Json).schemaVersion).toBe(SCHEMA_VERSION);
  });

  it("경험 목록이 없는 데이터", () => {
    expect(() => migrate({ schemaVersion: 1 }, 1)).not.toThrow();
  });

  it("빈 데이터(null)", () => {
    expect(() => migrate(null, 1)).not.toThrow();
  });

  it("칸이 빠진 경험 (matches·keyword·stories 없음)", () => {
    expect(() => migrate(wrap({ status: "keyword" }), 1)).not.toThrow();
  });
});
