import { describe, expect, it } from "vitest";
import { experience, kw, match } from "@/test/factory";
import { highlightRange, matchExperience, snippetAround } from "./search";

const exp = experience({
  basic: { title: "학과 축제 먹거리 부스 운영", period: "2025년 5월", role: "부스 총괄" },
  matches: [match("conflict", "primary")],
  keyword: { candidates: [kw("conflict", "합의 이끌기")], selectedIndex: 0 },
});

describe("사이드바 경험 검색 (CLAUDE.md 8절)", () => {
  it("경험명에서 찾으면 어디서 찾았는지 표시하지 않는다", () => {
    expect(matchExperience(exp, "먹거리")).toEqual({ field: null, text: exp.basic.title });
  });

  it("띄어쓰기를 무시한다", () => {
    expect(matchExperience(exp, "먹 거리부스")?.field).toBeNull();
    expect(matchExperience(exp, "갈등조율")).toEqual({ field: "역량", text: "갈등 조율" });
  });

  it("시기·역할·키워드에서 찾으면 어디서 찾았는지 알려 준다", () => {
    expect(matchExperience(exp, "2025")?.field).toBe("시기");
    expect(matchExperience(exp, "총괄")?.field).toBe("역할");
    expect(matchExperience(exp, "합의")?.field).toBe("키워드");
  });

  it("영문 대소문자를 가리지 않는다", () => {
    const e = experience({ basic: { title: "UX 리서치", period: "", role: "" } });
    expect(matchExperience(e, "ux")?.field).toBeNull();
  });

  it("검색어가 비면 모두 보이고, 없으면 null", () => {
    expect(matchExperience(exp, "  ")).not.toBeNull();
    expect(matchExperience(exp, "해커톤")).toBeNull();
  });

  it("긴 글 뒤쪽에서 찾으면 그 근처부터 보여 준다", () => {
    // 찾은 곳 앞 6글자부터 (띄어쓰기도 한 글자)
    expect(snippetAround("아주 긴 문장 속에서 마지막에 합의를 이끌었다", "합의")).toBe("… 마지막에 합의를 이끌었다");
    expect(snippetAround("합의를 이끌었다", "합의")).toBe("합의를 이끌었다");
  });

  it("경험명에서 굵게 표시할 위치", () => {
    expect(highlightRange("학과 축제", "축제")).toEqual([3, 5]);
    expect(highlightRange("학과 축제", "")).toBeNull();
    expect(highlightRange("학과 축제", "부스")).toBeNull();
  });
});
