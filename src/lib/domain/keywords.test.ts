import { describe, expect, it } from "vitest";
import { kw, match } from "@/test/factory";
import { alignKeywords, mergeKeywords, missingKeywordComps } from "./keywords";

describe("역량 키워드 맞추기 (CLAUDE.md 2절 7번)", () => {
  it("역량 연결에서 뺀 역량의 키워드는 빠진다", () => {
    const keyword = { candidates: [kw("conflict"), kw("collaboration"), kw("decision")], selectedIndex: 0 };
    const result = alignKeywords(keyword, [match("conflict", "primary"), match("decision", "secondary")]);
    expect(result?.candidates.map((c) => c.competencyId)).toEqual(["conflict", "decision"]);
  });

  it("대표 키워드 = 대표 역량의 키워드이고, 대표 역량 키워드가 맨 앞에 온다", () => {
    const keyword = { candidates: [kw("conflict"), kw("collaboration")], selectedIndex: 0 };
    const result = alignKeywords(keyword, [match("conflict", "secondary"), match("collaboration", "primary")]);
    expect(result?.candidates[0].competencyId).toBe("collaboration");
    expect(result?.selectedIndex).toBe(0);
  });

  it("대표 역량의 키워드가 아직 없으면 대표 키워드도 없다", () => {
    const keyword = { candidates: [kw("conflict")], selectedIndex: 0 };
    const result = alignKeywords(keyword, [match("collaboration", "primary"), match("conflict", "secondary")]);
    expect(result?.selectedIndex).toBeNull();
  });

  it("한 역량에 키워드가 여럿이어도 1개만 남긴다", () => {
    const keyword = { candidates: [kw("conflict", "첫째"), kw("conflict", "둘째")], selectedIndex: 0 };
    const result = alignKeywords(keyword, [match("conflict", "primary")]);
    expect(result?.candidates.map((c) => c.keyword)).toEqual(["첫째"]);
  });

  it("키워드나 역량 연결이 없으면 그대로 둔다", () => {
    expect(alignKeywords(null, [match("conflict", "primary")])).toBeNull();
    const keyword = { candidates: [kw("conflict")], selectedIndex: 0 };
    expect(alignKeywords(keyword, null)).toBe(keyword);
  });

  it("연결했지만 키워드가 없는 역량을 찾는다 (키워드 단계에서 그것만 만든다)", () => {
    const keyword = { candidates: [kw("conflict")], selectedIndex: 0 };
    const matches = [match("conflict", "primary"), match("decision", "secondary"), match("challenge", "secondary")];
    expect(missingKeywordComps(keyword, matches)).toEqual(["decision", "challenge"]);
    expect(missingKeywordComps(null, matches)).toEqual(["conflict", "decision", "challenge"]);
    expect(missingKeywordComps(keyword, null)).toEqual([]);
  });

  it("[다시 쓰기]로 받은 키워드는 그 역량 자리만 바꾼다", () => {
    const keyword = { candidates: [kw("conflict", "예전"), kw("decision", "그대로")], selectedIndex: 0 };
    const result = mergeKeywords(keyword, [kw("conflict", "새로")]);
    expect(result.candidates.map((c) => c.keyword)).toEqual(["새로", "그대로"]);
    expect(result.selectedIndex).toBe(0);
  });

  it("새로 연결한 역량의 키워드는 더해진다", () => {
    const result = mergeKeywords({ candidates: [kw("conflict")], selectedIndex: 0 }, [kw("motivation")]);
    expect(result.candidates.map((c) => c.competencyId)).toEqual(["conflict", "motivation"]);
    expect(mergeKeywords(null, [kw("motivation")]).selectedIndex).toBeNull();
  });
});
