import { describe, expect, it } from "vitest";
import { experience } from "@/test/factory";
import { FEEDBACK_MAX, feedbackRow, parseFeedbackRow, placeLines, workStep } from "./feedback";

const place = { screen: "작업 화면", step: "역량 연결", device: "PC" as const };

describe("의견 남기기: 어디서 보냈는지 (경험 내용은 보내지 않음)", () => {
  it("작업 화면에서 보고 있던 곳을 한 마디로", () => {
    expect(workStep("new", null)).toBe("새 경험 입력");
    expect(workStep("matrix", experience())).toBe("내 역량 한눈에 보기");
    expect(workStep("experience", experience({ status: "matching" }))).toBe("역량 연결");
    expect(workStep("experience", experience({ status: "done" }))).toBe("완성한 경험");
  });

  it("질문 중이면 어느 단계인지까지", () => {
    const e = experience({ status: "interviewing" });
    e.interview.currentStage = "result";
    expect(workStep("experience", e)).toBe("질문 · 결과");
    e.interview.currentStage = "final_check";
    expect(workStep("experience", e)).toBe("질문 · 전체 점검");
  });

  it("경험명은 어디에도 들어가지 않는다", () => {
    const e = experience({ status: "matching" });
    const row = feedbackRow("막혔어요", "헷갈려요", { ...place, step: workStep("experience", e) }, new Date());
    expect(JSON.stringify(row)).not.toContain(e.basic.title);
  });

  it("함께 보내는 정보는 항목 이름과 함께 (원고 내용처럼 읽히지 않게)", () => {
    expect(placeLines(place)).toEqual([
      ["보던 화면", "작업 화면"],
      ["진행 단계", "역량 연결"],
      ["기기", "PC"],
    ]);
    expect(placeLines({ screen: "홈", step: "", device: "모바일" })).toEqual([
      ["보던 화면", "홈"],
      ["기기", "모바일"],
    ]);
  });
});

describe("의견 남기기: 시트 한 줄과 서버 검사", () => {
  const row = feedbackRow("제안해요", "  이런 기능이 있으면 좋겠어요  ", place, new Date("2026-11-04T03:00:00Z"));

  it("한국 시각으로 적고 내용 앞뒤 빈칸은 지운다", () => {
    expect(row.제출시각).toBe("2026-11-04 12:00:00");
    expect(row.내용).toBe("이런 기능이 있으면 좋겠어요");
  });

  it("맞는 한 줄은 그대로 통과한다", () => {
    expect(parseFeedbackRow(row)).toEqual(row);
  });

  it("정해진 종류가 아니거나 내용이 비면 받지 않는다", () => {
    expect(parseFeedbackRow({ ...row, 종류: "칭찬해요" })).toBeNull();
    expect(parseFeedbackRow({ ...row, 내용: "   " })).toBeNull();
    expect(parseFeedbackRow(null)).toBeNull();
    expect(parseFeedbackRow([row])).toBeNull();
  });

  it("내용은 1,000자까지", () => {
    expect(parseFeedbackRow({ ...row, 내용: "가".repeat(FEEDBACK_MAX) })).not.toBeNull();
    expect(parseFeedbackRow({ ...row, 내용: "가".repeat(FEEDBACK_MAX + 1) })).toBeNull();
  });

  it("정해진 칸 말고 다른 칸은 버린다", () => {
    expect(parseFeedbackRow({ ...row, 경험명: "비밀 프로젝트" })).toEqual(row);
  });
});
