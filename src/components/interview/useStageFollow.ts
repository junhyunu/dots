"use client";
// 새 단계로 넘어갈 때 화면과 커서가 따라가게 한다. 표시는 저장하지 않아서 새로고침으로 다시 열 때는 움직이지 않는다.
// 크롬은 내용이 늘어날 때 보던 위치를 스스로 지켜 주지만 사파리는 그렇지 않아, 브라우저에 맡기지 않고 직접 옮긴다.
import { useEffect, useRef } from "react";

let pending = false;

/** 다음에 열리는 단계로 화면을 옮기도록 표시한다 (버튼을 누를 때 부른다) */
export function followNextStage() {
  pending = true;
}

function moveTo(section: HTMLElement, focusTarget: HTMLElement) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  section.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
  focusTarget.focus({ preventScroll: true });
}

/** 단계가 열리면 제목으로, 질문이 도착하면 첫 답변 칸으로 옮긴다. 돌려준 ref를 단계 <section>에 붙인다 */
export function useStageFollow(hasQuestions: boolean) {
  const sectionRef = useRef<HTMLElement>(null);
  const follow = useRef(pending);

  useEffect(() => {
    pending = false;
    if (follow.current && sectionRef.current) moveTo(sectionRef.current, sectionRef.current);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!follow.current || !hasQuestions || !section) return;
    follow.current = false;
    moveTo(section, section.querySelector<HTMLElement>("textarea:not([disabled])") ?? section);
  }, [hasQuestions]);

  return sectionRef;
}
