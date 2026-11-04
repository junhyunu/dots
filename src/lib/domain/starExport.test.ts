import { describe, expect, it } from "vitest";
import { experience, kw, match } from "@/test/factory";
import { toShowcase } from "./showcase";
import { starDocument, starDocumentMarkdown, starDocumentText, starFileName } from "./starExport";
import type { Story } from "./types";

const story = (patch: Partial<Story>): Story => ({
  id: "s",
  checked: true,
  followups: [],
  subtitle: "",
  body: "",
  createdAt: "",
  updatedAt: "",
  ...patch,
});

const done = experience({
  matchesConfirmed: true,
  matches: [match("conflict", "primary"), match("decision", "secondary"), match("collaboration", "secondary")],
  keyword: { candidates: [kw("conflict", "합의 이끌기"), kw("decision"), kw("collaboration")], selectedIndex: 0 },
  stories: [
    story({ prompt: "갈등 경험을 쓰시오", charLimit: 800, subtitle: "근거로 합의를 이끈 경험", body: "첫 문단\n\n둘째 문단" }),
    story({ prompt: "글을 안 만든 스토리", body: "   " }),
  ],
});

describe("문서로 내려받기 내용 (CLAUDE.md 2-1절)", () => {
  const item = toShowcase(done)!;
  const doc = starDocument(item);

  it("정보 줄: 시기·역할·대표/보조 역량·대표 키워드", () => {
    expect(doc.meta).toEqual([
      ["시기", "2025년 5월"],
      ["역할", "부스 총괄"],
      ["대표 역량", "갈등 조율"],
      ["보조 역량", "판단·의사결정, 협업·조직 역할"],
      ["역량 키워드", "합의 이끌기 — 합의 이끌기을 보여 주는 힘"],
    ]);
  });

  it("S → T → A → R → 배운 점 → 스토리 순서", () => {
    expect(doc.sections.map((s) => s.heading)).toEqual(["S 상황", "T 목표", "A 행동", "R 결과", "배운 점", "스토리 (자기소개서 글)"]);
  });

  it("글을 안 만든 스토리는 빼고, 문항·글자 수 줄을 붙인다", () => {
    const stories = doc.sections.at(-1)!.stories!;
    expect(stories).toHaveLength(1);
    expect(stories[0].notes[0]).toBe("문항: 갈등 경험을 쓰시오");
    // 소제목 13자 + 빈 줄(줄바꿈 2) + 본문 11자 = 26자 (복사되는 글 기준)
    expect(stories[0].notes[1]).toBe("글자 수: 공백 포함 26자 · 공백 제외 17자 / 제한 800자");
    expect(stories[0].paragraphs).toEqual(["첫 문단", "둘째 문단"]);
  });

  it("스토리가 없으면 원고까지만", () => {
    const noStory = starDocument(toShowcase({ ...done, stories: [] })!);
    expect(noStory.sections.at(-1)!.heading).toBe("배운 점");
  });

  it("TXT와 MD에 같은 내용이 들어간다", () => {
    const txt = starDocumentText(doc);
    const md = starDocumentMarkdown(doc);
    for (const part of ["학과 축제 먹거리 부스 운영", "[A 행동]", "1. 행동 1", "근거로 합의를 이끈 경험", "둘째 문단"]) {
      expect(txt).toContain(part);
    }
    for (const part of ["# 학과 축제 먹거리 부스 운영", "## A 행동", "### 1. 행동 1", "**근거로 합의를 이끈 경험**", "둘째 문단"]) {
      expect(md).toContain(part);
    }
  });

  it("파일 이름은 Dots_경험명.확장자, 파일 이름에 못 쓰는 글자는 뺀다", () => {
    expect(starFileName("학과 축제", "docx")).toBe("Dots_학과 축제.docx");
    expect(starFileName('A/B: "팀"?', "md")).toBe("Dots_AB 팀.md");
    expect(starFileName("  ", "txt")).toBe("Dots_경험.txt");
  });
});

describe("홈 카드에는 완성한 경험만 (CLAUDE.md 2-1절)", () => {
  it("경험 완성 전이면 홈 카드가 없다", () => {
    expect(toShowcase({ ...done, matchesConfirmed: false })).toBeNull();
    expect(toShowcase({ ...done, star: null })).toBeNull();
    expect(toShowcase({ ...done, matches: [] })).toBeNull();
  });
});
