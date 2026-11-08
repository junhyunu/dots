// 글자 수 세기와 복사용 글 만들기 (자기소개서 입력칸 기준)
import type { StarDraft, Story } from "./types";

/** 한글·이모지를 한 글자로 센다 */
export const charCount = (text: string) => [...text].length;
export const charCountNoSpace = (text: string) => [...text.replace(/\s/g, "")].length;

/** 자기소개서 입력칸에 붙여 넣는 형태: 소제목 + 빈 줄 + 본문 */
/** 글이 써진 스토리인지. 본문을 모두 지워도 써진 글로 본다: 글 칸이 사라지거나 AI가 묻지 않고 새로 쓰면 안 돼서 (2026-11-08) */
export function storyWritten(s: Pick<Story, "written" | "subtitle" | "body">): boolean {
  return s.written ?? !!(s.subtitle || s.body);
}

export function storyText(subtitle: string, body: string): string {
  return subtitle.trim() ? `${subtitle.trim()}\n\n${body.trim()}` : body.trim();
}

export function starText(title: string, star: Pick<StarDraft, "situation" | "task" | "actions" | "result" | "learning">): string {
  const actions = star.actions.map((a) => `- ${a.label}: ${a.body}`).join("\n");
  return `${title}\n\n[S 상황]\n${star.situation}\n\n[T 목표]\n${star.task}\n\n[A 행동]\n${actions}\n\n[R 결과]\n${star.result}\n\n[배운 점]\n${star.learning}`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 권한이 없거나 오래된 브라우저: 임시 입력칸으로 복사
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    el.remove();
    return ok;
  }
}
