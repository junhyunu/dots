import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { competency } from "@/lib/domain/competencies";
import type { CompetencyId } from "@/lib/domain/types";
import GlassOrb from "../orbs/GlassOrb";
import { href } from "@/lib/mode";

// 문구: ux-writing 스킬로 작성, 사용자가 B안 선택
export default function EmptyCompetency({ competencyId }: { competencyId: CompetencyId }) {
  const c = competency(competencyId);
  return (
    <div className="card-in flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-12 text-center">
      <div className="w-20" aria-hidden>
        <GlassOrb competencyId={competencyId} name="" count={0} selected={false} compact />
      </div>
      <p className="mt-5 text-sm font-medium text-ink-faint">{c.name}</p>
      <h3 className="mt-1 text-lg font-semibold break-keep">이 역량을 채울 경험을 찾아볼까요?</h3>
      <p className="mt-2 max-w-md text-ink-soft break-keep">
        {c.hint}
        <br />
        떠오르는 장면 하나면 충분해요.
      </p>
      <Link
        href={href("/work?new=1")}
        className="mt-6 inline-flex min-h-11 items-center gap-1.5 press rounded-lg bg-primary-fill px-5 font-semibold text-on-primary"
      >
        경험 정리하기
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}
