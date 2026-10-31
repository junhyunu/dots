import type { CompetencyId } from "@/lib/domain/types";

// 역량 7개 = 빨주노초파남보. 일곱 색이 모여 무지개 = "다양한 경험" (CLAUDE.md 8절)
export const ORB_COLORS: Record<CompetencyId, { hex: string; seed: number }> = {
  problem_solving: { hex: "#ff4040", seed: 0.11 }, // 빨
  challenge: { hex: "#ff8a1f", seed: 0.27 }, // 주
  decision: { hex: "#ffd21f", seed: 0.43 }, // 노
  trial_error: { hex: "#22d36a", seed: 0.58 }, // 초
  collaboration: { hex: "#2f8bff", seed: 0.71 }, // 파
  conflict: { hex: "#5b5cff", seed: 0.86 }, // 남
  motivation: { hex: "#b35cff", seed: 0.97 }, // 보
};

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function rgbToHsl([r, g, b]: [number, number, number]): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hh = ((((h % 360) + 360) % 360) / 360) * 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + hh) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0), f(8), f(4)];
}

/**
 * Strands 셰이더의 색 역할 7개 [위 가장자리, 주황 자리, 호박 자리, 따뜻한 흰 중심, 청록 자리, 파랑 자리, 깊은 자리]를
 * 역량 색 하나의 계열(가까운 색상 + 밝기 차이)로 채운다. 셰이더 배열 크기(8)에 맞춰 24칸으로 돌려준다.
 */
export function strandsPalette(hex: string): Float32Array {
  const [h, s] = rgbToHsl(hexToRgb(hex));
  const S = Math.max(0.65, s);
  const roles = [
    hslToRgb(h, S, 0.58),
    hslToRgb(h + 10, S, 0.52),
    hslToRgb(h + 20, S, 0.66),
    hslToRgb(h, 0.7, 0.93),
    hslToRgb(h - 22, S, 0.76),
    hslToRgb(h - 30, S, 0.52),
    hslToRgb(h - 36, S, 0.3),
  ];
  const out = new Float32Array(24);
  roles.forEach((c, i) => out.set(c, i * 3));
  return out;
}
