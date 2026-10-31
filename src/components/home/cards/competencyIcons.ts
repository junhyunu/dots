import { Flame, Handshake, Lightbulb, Mountain, RotateCcw, Scale, Users, type LucideIcon } from "lucide-react";
import type { CompetencyId } from "@/lib/domain/types";

export const COMPETENCY_ICONS: Record<CompetencyId, LucideIcon> = {
  problem_solving: Lightbulb,
  challenge: Mountain,
  decision: Scale,
  trial_error: RotateCcw,
  collaboration: Users,
  conflict: Handshake,
  motivation: Flame,
};
