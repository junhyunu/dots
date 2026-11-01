// 경험 문서 내려받기: 세 형식(TXT·MD·Word)이 같은 내용을 갖도록 문서 모양을 한 곳에서 정한다.
// STAR 원고 + 스토리(자기소개서 글)가 있으면 맨 아래에 모두 (사용자 결정 2026-11-01, 이전엔 원고만).
import { competencyName } from "./competencies";
import type { ShowcaseExperience } from "./showcase";
import { charCount, charCountNoSpace, storyText } from "./text";

/** 스토리 하나: 머리(스토리 N) + 문항·글자 수 줄 + 앱에서 복사한 것과 같은 소제목·본문 */
export interface StoryBlock {
  heading: string;
  notes: string[];
  subtitle: string;
  paragraphs: string[];
}

export interface StarDocument {
  title: string;
  /** 제목 아래 정보 줄: [이름, 값] */
  meta: [string, string][];
  sections: { heading: string; paragraphs?: string[]; items?: { label: string; body: string }[]; stories?: StoryBlock[] }[];
}

export function starDocument(item: ShowcaseExperience): StarDocument {
  const { basic, star, matches, keyword } = item;
  const primary = matches.find((m) => m.role === "primary");
  const secondary = matches.filter((m) => m.role === "secondary");
  const rep = keyword?.candidates[keyword.selectedIndex ?? 0];

  const meta: [string, string][] = [];
  if (basic.period) meta.push(["시기", basic.period]);
  if (basic.role) meta.push(["역할", basic.role]);
  if (primary) meta.push(["대표 역량", competencyName(primary.competencyId)]);
  if (secondary.length) meta.push(["보조 역량", secondary.map((m) => competencyName(m.competencyId)).join(", ")]);
  if (rep) meta.push(["역량 키워드", `${rep.keyword} — ${rep.sentence}`]);

  const sections: StarDocument["sections"] = [
    { heading: "S 상황", paragraphs: [star.situation] },
    { heading: "T 목표", paragraphs: [star.task] },
    { heading: "A 행동", items: star.actions.map((a) => ({ label: a.label, body: a.body })) },
    { heading: "R 결과", paragraphs: [star.result] },
    { heading: "배운 점", paragraphs: [star.learning] },
  ];

  const stories = item.stories ?? [];
  if (stories.length) {
    sections.push({
      heading: "스토리 (자기소개서 글)",
      stories: stories.map((s, i) => {
        // 글자 수는 앱과 같은 기준: 소제목 + 빈 줄 + 본문
        const text = storyText(s.subtitle, s.body);
        const count = `글자 수: 공백 포함 ${charCount(text).toLocaleString()}자 · 공백 제외 ${charCountNoSpace(text).toLocaleString()}자${s.charLimit ? ` / 제한 ${s.charLimit.toLocaleString()}자` : ""}`;
        return {
          heading: `스토리 ${i + 1}`,
          notes: [`문항: ${s.prompt?.trim() || "선택 안 함 (기본 형태)"}`, count],
          subtitle: s.subtitle.trim(),
          paragraphs: s.body.trim().split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
        };
      }),
    });
  }

  return { title: basic.title, meta, sections };
}

export function starDocumentText(doc: StarDocument): string {
  const lines = [doc.title, ...doc.meta.map(([k, v]) => `${k}: ${v}`), ""];
  for (const s of doc.sections) {
    lines.push(`[${s.heading}]`);
    s.paragraphs?.forEach((p) => lines.push(p));
    s.items?.forEach((it, i) => lines.push(`${i + 1}. ${it.label}`, `   ${it.body}`));
    s.stories?.forEach((st) => {
      lines.push("", `— ${st.heading} —`, ...st.notes, "");
      if (st.subtitle) lines.push(st.subtitle, "");
      lines.push(st.paragraphs.join("\n\n"));
    });
    lines.push("");
  }
  return lines.join("\n").trimEnd() + "\n";
}

export function starDocumentMarkdown(doc: StarDocument): string {
  const lines = [`# ${doc.title}`, "", ...doc.meta.map(([k, v]) => `- **${k}**: ${v}`), ""];
  for (const s of doc.sections) {
    lines.push(`## ${s.heading}`, "");
    s.paragraphs?.forEach((p) => lines.push(p, ""));
    s.items?.forEach((it, i) => lines.push(`### ${i + 1}. ${it.label}`, "", it.body, ""));
    s.stories?.forEach((st) => {
      lines.push(`### ${st.heading}`, "", ...st.notes.map((n) => `- ${n}`), "");
      if (st.subtitle) lines.push(`**${st.subtitle}**`, "");
      st.paragraphs.forEach((p) => lines.push(p, ""));
    });
  }
  return lines.join("\n").trimEnd() + "\n";
}

/** 파일 이름: Dots_경험명.확장자 (파일 이름에 못 쓰는 글자는 뺀다) */
export function starFileName(title: string, ext: string): string {
  const safe = title.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim().slice(0, 60) || "경험";
  return `Dots_${safe}.${ext}`;
}
