// STAR 원고 내려받기: 세 형식(TXT·MD·Word)이 같은 내용을 갖도록 문서 모양을 한 곳에서 정한다.
// 스토리(자기소개서 글)는 넣지 않는다 (사용자 결정).
import { competencyName } from "./competencies";
import type { ShowcaseExperience } from "./showcase";

export interface StarDocument {
  title: string;
  /** 제목 아래 정보 줄: [이름, 값] */
  meta: [string, string][];
  sections: { heading: string; paragraphs?: string[]; items?: { label: string; body: string }[] }[];
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

  return {
    title: basic.title,
    meta,
    sections: [
      { heading: "S 상황", paragraphs: [star.situation] },
      { heading: "T 목표", paragraphs: [star.task] },
      { heading: "A 행동", items: star.actions.map((a) => ({ label: a.label, body: a.body })) },
      { heading: "R 결과", paragraphs: [star.result] },
      { heading: "배운 점", paragraphs: [star.learning] },
    ],
  };
}

export function starDocumentText(doc: StarDocument): string {
  const lines = [doc.title, ...doc.meta.map(([k, v]) => `${k}: ${v}`), ""];
  for (const s of doc.sections) {
    lines.push(`[${s.heading}]`);
    s.paragraphs?.forEach((p) => lines.push(p));
    s.items?.forEach((it, i) => lines.push(`${i + 1}. ${it.label}`, `   ${it.body}`));
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
  }
  return lines.join("\n").trimEnd() + "\n";
}

/** 파일 이름: Dots_경험명_STAR.확장자 (파일 이름에 못 쓰는 글자는 뺀다) */
export function starFileName(title: string, ext: string): string {
  const safe = title.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim().slice(0, 60) || "경험";
  return `Dots_${safe}_STAR.${ext}`;
}
