import { beforeEach, describe, expect, it } from "vitest";
import { experience, kw, match } from "@/test/factory";
import type { Experience } from "@/lib/domain/types";
import { useAppStore } from "./useAppStore";

const store = () => useAppStore.getState();
const exp = (id = "exp-1") => store().experiences[id];
const roles = (id = "exp-1") => exp(id).matches?.map((m) => [m.competencyId, m.role]);

/** 역량 연결 단계의 경험 하나를 넣어 둔다 */
function seed(patch: Partial<Experience> = {}) {
  const e = experience({ status: "matching", ...patch });
  useAppStore.setState({ experiences: { [e.id]: e }, experienceOrder: [e.id], activeExperienceId: e.id });
}

beforeEach(() => useAppStore.setState({ experiences: {}, experienceOrder: [], activeExperienceId: null }));

describe("역량 연결 바꾸기 (CLAUDE.md 2절 6번)", () => {
  it("새 대표를 고르면 기존 대표는 보조로 내려간다", () => {
    seed({ matches: [match("conflict", "primary"), match("decision", "secondary")] });
    store().setMatchRole("exp-1", "decision", "primary");
    expect(roles()).toEqual([
      ["conflict", "secondary"],
      ["decision", "primary"],
    ]);
  });

  it("보조가 2개일 때 보조 하나를 대표로 올리면 대표·보조가 자리를 바꾼다 (빠지는 역량 없음)", () => {
    seed({ matches: [match("conflict", "primary"), match("decision", "secondary"), match("challenge", "secondary")] });
    store().setMatchRole("exp-1", "challenge", "primary");
    expect(exp().matches).toHaveLength(3);
    expect(roles()).toContainEqual(["challenge", "primary"]);
    expect(roles()).toContainEqual(["conflict", "secondary"]);
  });

  it("대표 1 + 보조 2가 찼을 때 연결 안 한 역량을 대표로 고르면, 기존 대표가 보조로 내려가고 맨 뒤 보조 하나가 빠진다", () => {
    seed({ matches: [match("conflict", "primary"), match("decision", "secondary"), match("challenge", "secondary")] });
    store().setMatchRole("exp-1", "motivation", "primary");
    expect(roles()).toEqual([
      ["conflict", "secondary"],
      ["decision", "secondary"],
      ["motivation", "primary"],
    ]);
  });

  it("보조는 최대 2개 (화면에서 막히지만, 스토어도 넘치지 않게 지킨다)", () => {
    seed({ matches: [match("conflict", "primary"), match("decision", "secondary"), match("challenge", "secondary")] });
    store().setMatchRole("exp-1", "motivation", "secondary");
    expect(exp().matches!.filter((m) => m.role === "secondary")).toHaveLength(2);
  });

  it("[연결 안 함]으로 빼면 그 역량의 키워드도 빠진다", () => {
    seed({
      matches: [match("conflict", "primary"), match("decision", "secondary")],
      keyword: { candidates: [kw("conflict"), kw("decision")], selectedIndex: 0 },
    });
    store().setMatchRole("exp-1", "decision", null);
    expect(roles()).toEqual([["conflict", "primary"]]);
    expect(exp().keyword!.candidates.map((c) => c.competencyId)).toEqual(["conflict"]);
  });

  it("[연결 안 함]으로 뺐다가 다시 켜면 장면·관련 행동·키워드가 되살아난다", () => {
    seed({
      matches: [match("conflict", "primary"), match("decision", "secondary", "고친 장면", [1])],
      keyword: { candidates: [kw("conflict"), kw("decision", "판단 키워드")], selectedIndex: 0 },
    });
    store().setMatchRole("exp-1", "decision", null);
    store().setMatchRole("exp-1", "decision", "secondary");
    expect(exp().matches!.find((m) => m.competencyId === "decision")).toMatchObject({ scene: "고친 장면", actionRefs: [1] });
    expect(exp().keyword!.candidates.find((c) => c.competencyId === "decision")?.keyword).toBe("판단 키워드");
  });

  it("대표를 바꾸면 대표 키워드도 따라간다", () => {
    seed({
      status: "keyword",
      matches: [match("conflict", "primary"), match("decision", "secondary")],
      keyword: { candidates: [kw("conflict"), kw("decision")], selectedIndex: 0 },
    });
    store().setMatchRole("exp-1", "decision", "primary");
    const k = exp().keyword!;
    expect(k.candidates[k.selectedIndex!].competencyId).toBe("decision");
  });
});

describe("단계 넘어가기와 경험 완성", () => {
  it("대표 역량이 없으면 역량 키워드 단계로 넘어가지 않는다", () => {
    seed({ matches: [] });
    store().confirmMatches("exp-1");
    expect(exp().status).toBe("matching");

    seed({ matches: [match("conflict", "primary")] });
    store().confirmMatches("exp-1");
    expect(exp().status).toBe("keyword");
  });

  it("연결한 역량 중 키워드가 하나라도 없으면 경험을 완성할 수 없다", () => {
    seed({
      status: "keyword",
      matches: [match("conflict", "primary"), match("decision", "secondary")],
      keyword: { candidates: [kw("conflict")], selectedIndex: 0 },
    });
    store().completeExperience("exp-1");
    expect(exp().matchesConfirmed).toBe(false);
    expect(exp().status).toBe("keyword");
  });

  it("연결한 역량마다 키워드가 있으면 경험이 완성된다", () => {
    seed({
      status: "keyword",
      matches: [match("conflict", "primary"), match("decision", "secondary")],
      keyword: { candidates: [kw("conflict"), kw("decision")], selectedIndex: 0 },
    });
    store().completeExperience("exp-1");
    expect(exp().matchesConfirmed).toBe(true);
    expect(exp().status).toBe("done");
  });

  it("받은 키워드는 연결한 역량 순서(대표 먼저)로 맞춰진다", () => {
    seed({ status: "keyword", matches: [match("conflict", "primary"), match("decision", "secondary")] });
    store().setKeywords("exp-1", [kw("decision"), kw("motivation"), kw("conflict")]);
    expect(exp().keyword!.candidates.map((c) => c.competencyId)).toEqual(["conflict", "decision"]);
    expect(exp().keyword!.selectedIndex).toBe(0);
  });
});

describe("사이드바 ⋯ 목록: 이름 바꾸기·삭제", () => {
  it("이름을 바꾸면 시기·역할은 그대로", () => {
    seed();
    store().updateBasic("exp-1", { ...exp().basic, title: "새 이름" });
    expect(exp().basic).toMatchObject({ title: "새 이름", period: "2025년 5월", role: "부스 총괄" });
  });

  it("보고 있던 경험을 지우면 새 경험 입력 화면으로", () => {
    seed();
    useAppStore.setState({ view: "experience" });
    store().deleteExperience("exp-1");
    expect(store().experiences["exp-1"]).toBeUndefined();
    expect(store().experienceOrder).toEqual([]);
    expect(store().view).toBe("new");
    expect(store().activeExperienceId).toBeNull();
  });

  it("다른 경험을 지우면 보던 화면은 그대로", () => {
    const a = experience({ id: "a" });
    const b = experience({ id: "b" });
    useAppStore.setState({ experiences: { a, b }, experienceOrder: ["a", "b"], activeExperienceId: "a", view: "experience" });
    store().deleteExperience("b");
    expect(store().experienceOrder).toEqual(["a"]);
    expect(store().activeExperienceId).toBe("a");
    expect(store().view).toBe("experience");
  });
});

describe("경험 목록 순서 (최신 경험이 맨 앞)", () => {
  it("새 경험은 목록 맨 앞에 들어간다", () => {
    const first = store().createExperience({ title: "첫 경험", period: "", role: "" });
    const second = store().createExperience({ title: "둘째 경험", period: "", role: "" });
    expect(store().experienceOrder).toEqual([second, first]);
    expect(store().activeExperienceId).toBe(second);
  });

  it("저장된 데이터를 불러올 때 만든 날짜 최신순으로 다시 정렬하고, 예전 구조는 지금 구조로 옮긴다", async () => {
    const old = experience({ id: "old", createdAt: "2026-10-01T00:00:00.000Z", status: "done" });
    const recent = experience({ id: "recent", createdAt: "2026-11-01T00:00:00.000Z", status: "keyword" });
    localStorage.setItem(
      "dots:state",
      JSON.stringify({
        state: { schemaVersion: 2, experienceOrder: ["old", "recent"], experiences: { old, recent }, activeExperienceId: "old", view: "experience" },
        version: 2,
      }),
    );
    await useAppStore.persist.rehydrate();
    expect(store().experienceOrder).toEqual(["recent", "old"]);
    expect(exp("recent").status).toBe("matching");
    expect(store().schemaVersion).toBe(3);
  });
});
