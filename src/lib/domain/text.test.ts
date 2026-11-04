import { describe, expect, it } from "vitest";
import { charCount, charCountNoSpace, storyText } from "./text";

describe("글자 수 (자기소개서 입력칸 기준)", () => {
  it("한글·영문·숫자·이모지를 한 글자씩 센다", () => {
    expect(charCount("가나다")).toBe(3);
    expect(charCount("Dots 1")).toBe(6);
    expect(charCount("좋아요👍")).toBe(4);
  });

  it("공백 포함은 띄어쓰기·줄바꿈까지, 공백 제외는 모두 뺀다", () => {
    const text = "소제목\n\n저는 팀장이었습니다.";
    expect(charCount(text)).toBe(16);
    expect(charCountNoSpace(text)).toBe(13);
  });
});

describe("복사되는 글 = 소제목 + 빈 줄 + 본문", () => {
  it("소제목과 본문 사이에 빈 줄 하나", () => {
    expect(storyText("근거로 설득하는 힘", "첫 문단\n\n둘째 문단")).toBe("근거로 설득하는 힘\n\n첫 문단\n\n둘째 문단");
  });

  it("앞뒤 빈칸은 지우고, 소제목이 없으면 본문만", () => {
    expect(storyText("  소제목  ", "  본문  ")).toBe("소제목\n\n본문");
    expect(storyText("   ", "본문")).toBe("본문");
  });
});
