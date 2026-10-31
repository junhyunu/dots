// 사이드바 경험 검색: 경험명 + 시기·역할 + 연결된 역량 + 역량 키워드에서 찾는다.
// 띄어쓰기·대소문자는 무시한다 ("갈등조율"로도 "갈등 조율"을 찾는다).
import { competencyName } from "./competencies";
import type { Experience } from "./types";

export interface SearchHit {
  /** 어디서 찾았는지. null = 경험명 */
  field: string | null;
  /** 찾은 글 (경험명이 아니면 목록에 작은 줄로 보여 준다) */
  text: string;
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");

export function matchExperience(exp: Experience, query: string): SearchHit | null {
  const q = norm(query);
  if (!q) return { field: null, text: exp.basic.title };
  const fields: [string | null, string][] = [
    [null, exp.basic.title],
    ["시기", exp.basic.period],
    ["역할", exp.basic.role],
    ...(exp.matches ?? []).map((m): [string, string] => ["역량", competencyName(m.competencyId)]),
    ...(exp.keyword?.candidates ?? []).flatMap((c): [string, string][] => [["키워드", c.keyword], ["키워드", c.sentence]]),
  ];
  const hit = fields.find(([, text]) => text && norm(text).includes(q));
  return hit ? { field: hit[0], text: hit[1] } : null;
}

/** 긴 글에서 찾은 곳이 뒤쪽이면 그 근처부터 보여 준다 (한 줄로 잘려도 찾은 글자가 보이게) */
export function snippetAround(text: string, query: string, lead = 6): string {
  const i = text.toLowerCase().indexOf(query.trim().toLowerCase());
  return i > lead + 4 ? `…${text.slice(i - lead)}` : text;
}

/** 경험명 안에서 검색어 위치 (띄어쓰기 그대로 찾을 수 있을 때만 굵게 표시) */
export function highlightRange(text: string, query: string): [number, number] | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const i = text.toLowerCase().indexOf(q);
  return i < 0 ? null : [i, i + q.length];
}
