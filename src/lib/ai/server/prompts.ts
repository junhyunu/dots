import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

const PROMPT_FILE = path.join(process.cwd(), "프롬프트.md");
const KEY_MARK = /<!--\s*key:\s*([a-z_]+)\s*-->/;

/** 프롬프트.md를 `## 제목` 단위로 나눠 key → 본문으로 돌려준다. 수정이 바로 반영되도록 요청마다 읽는다. */
export async function loadPrompts(): Promise<Record<string, string>> {
  const raw = await readFile(PROMPT_FILE, "utf8");
  const sections: Record<string, string> = {};

  for (const chunk of raw.split(/^## /m).slice(1)) {
    const match = chunk.match(KEY_MARK);
    if (!match) continue;
    const body = chunk
      .slice(chunk.indexOf(match[0]) + match[0].length)
      .trim()
      .replace(/\n-{3,}$/, "") // 섹션 사이 구분선 제거
      .trim();
    sections[match[1]] = body;
  }
  return sections;
}

export async function buildSystemPrompt(taskKey: string): Promise<string> {
  const prompts = await loadPrompts();
  const common = prompts.common;
  const task = prompts[taskKey];
  if (!common || !task) {
    throw new Error(`프롬프트.md에서 '${!common ? "common" : taskKey}' 섹션을 찾지 못했습니다.`);
  }
  return `${common}\n\n# 이번 작업\n\n${task}`;
}
