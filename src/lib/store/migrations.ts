// 저장 구조가 바뀔 때 이전 버전 데이터를 새 구조로 옮긴다.
import { alignKeywords } from "@/lib/domain/keywords";
import { MAX_SECONDARY_COMPETENCIES } from "@/lib/domain/stages";
import { SCHEMA_VERSION } from "@/lib/domain/types";

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

/** v2 → v3: 순서가 원고 → 키워드 → 역량 연결에서 원고 → 역량 연결 → 키워드로 바뀜.
 *  키워드 단계(연결 전)에 있던 경험은 역량 연결 단계로. 키워드는 연결한 역량에 맞춰 정리한다 */
function v2toV3(exp: Json): Json {
  if (exp.status === "keyword") exp.status = "matching";
  if (exp.keyword && Array.isArray(exp.matches)) exp.keyword = alignKeywords(exp.keyword, exp.matches);
  return exp;
}

export function migrate(persisted: unknown, version: number): unknown {
  const state = persisted as Json;
  if (state?.experiences) {
    for (const id of Object.keys(state.experiences)) {
      if (version < 2) state.experiences[id] = v1toV2(state.experiences[id]);
      if (version < 3) state.experiences[id] = v2toV3(state.experiences[id]);
    }
  }
  state.schemaVersion = SCHEMA_VERSION;
  return state;
}
