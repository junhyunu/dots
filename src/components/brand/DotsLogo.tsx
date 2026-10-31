import { useId } from "react";

// 가운데가 채워진 원 안에 무지개색이 일정하지 않은 비율로 부드럽게 번진 로고.
// src/app/icon.svg(파비콘)와 같은 그림이다 — 바꿀 때 함께 바꾼다. 무지개색 = 다양한 경험 (CLAUDE.md 8절)
const BASE = "#f3e8ff";
const BLOBS: [cx: number, cy: number, r: number, fill: string][] = [
  [18, 16, 17, "#ffd23f"], // 노랑 (왼쪽 위, 가장 크게)
  [40, 8, 10, "#ff8a3d"], // 주황
  [56, 22, 11, "#ff4f8b"], // 분홍
  [50, 48, 19, "#5b7cff"], // 파랑 (오른쪽 아래, 크게)
  [26, 56, 12, "#2ed3b7"], // 청록
  [8, 40, 10, "#7ee36b"], // 연두
  [36, 32, 8, "#b77dff"], // 보라 (가운데, 작게)
];

export default function DotsLogo({ size = 28, className = "" }: { size?: number | string; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className={className}>
      <defs>
        <filter id={`b${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <clipPath id={`c${id}`}>
          <circle cx="32" cy="32" r="30" />
        </clipPath>
      </defs>
      <g clipPath={`url(#c${id})`}>
        <rect width="64" height="64" fill={BASE} />
        <g filter={`url(#b${id})`}>
          {BLOBS.map(([cx, cy, r, fill]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={fill} />
          ))}
        </g>
      </g>
    </svg>
  );
}

/** 서비스 이름: "Dots"의 o 자리에 로고 원을 넣는다 (글자 크기에 맞춰 em 단위). 화면 읽기 프로그램에는 "Dots"로 읽힌다 */
export function DotsWordmark() {
  return (
    // 영문과 한글은 크기가 달라 가운데 정렬하면 한글이 떠 보인다 → 글자 아랫선(baseline)에 맞춘다
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-lg font-bold tracking-tight">
        <span className="sr-only">Dots</span>
        <span aria-hidden className="inline-flex items-baseline">
          D
          {/* 로고 원은 소문자 o 높이(약 0.6em)로, 그림 둘레 여백만큼 살짝 내려 글자 아랫선에 앉힌다 */}
          <DotsLogo size="0.66em" className="mx-[0.02em] translate-y-[0.05em]" />
          ts
        </span>
      </span>
      <span className="text-xs text-ink-faint">닷츠</span>
    </span>
  );
}
