// 저장 구조가 바뀔 때 이전 버전 데이터를 새 구조로 옮긴다.
import { MAX_SECONDARY_COMPETENCIES } from "@/lib/domain/stages";

// 이전 버전 데이터는 형태를 보장할 수 없어 느슨한 타입으로 다룬다
type Json = Record<string, any>;

/** v1 → v2: 역량 매칭을 대표 1 + 보조 최대 2로, 스토리에 checked 추가 */
function v1toV2(exp: Json): Json {
  if (Array.isArray(exp.matches)) {
    const on = exp.matches.filter((m: Json) => m.enabled && String(m.scene ?? "").trim());
    const rep = exp.keyword?.selectedIndex != null ? exp.keyword.candidates?.[exp.keyword.selectedIndex]?.competencyId : null;
    const ordered = [...on.filter((m: Json) => m.competencyId === rep), ...on.filter((m: Json) => m.competencyId !== rep)];
    exp.matches = ordered.slice(0, 1 + MAX_SECONDARY_COMPETENCIES).map((m: Json, i: number) => ({
      competencyId: m.competencyId,
      role: i === 0 ? "primary" : "secondary",
      scene: m.scene,
      actionRefs: [],
    }));
    if (exp.matches.length === 0) exp.matchesConfirmed = false;
  }
  exp.stories = (exp.stories ?? []).map((s: Json) => ({ checked: true, ...s }));
  return exp;
}

export function migrate(persisted: unknown, version: number): unknown {
  const state = persisted as Json;
  if (version < 2 && state?.experiences) {
    for (const id of Object.keys(state.experiences)) state.experiences[id] = v1toV2(state.experiences[id]);
  }
  state.schemaVersion = 2;
  return state;
}
