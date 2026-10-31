"use client";
// 역량 구슬 1개. 그림은 WebGL2 셰이더(orbShader.ts, 원본 React Bits Strands), 그리는 일은 공용 렌더러(orbRenderer.ts)가 맡는다.
// 상태: 기본(리본이 은은히 꼬임) / 호버(떠오름 + 리본이 커짐 + 바깥 빛) / 선택(리본 활짝 + 바깥 빛) / 비어 있음(흑백 선 한 줄, 숫자 없음)
// 이름·경험 수는 구슬 아래에 둔다 (구슬 가운데 빛 띠 위에서는 글자가 잘 안 읽혀서).
// WebGL2를 못 쓰는 브라우저는 CSS 그라데이션 구슬로 대신한다.
import { useEffect, useMemo, useRef, useState } from "react";
import type { CompetencyId } from "@/lib/domain/types";
import { getOrbRenderer, type OrbParams } from "./orbRenderer";
import { ORB_COLORS, strandsPalette } from "./orbColors";

// 라이트 모드의 빈 구슬 리본 색. 셰이더가 라이트 모드에서 무채색 빛을 흰 유리색으로 그려 흑백이 안 보이므로 차분한 회청색을 쓴다
const EMPTY_LIGHT_PALETTE = strandsPalette("#64748b");

export default function GlassOrb({
  competencyId,
  name,
  count,
  selected,
  compact = false,
}: {
  competencyId: CompetencyId;
  name: string;
  count: number;
  selected: boolean;
  compact?: boolean;
}) {
  const empty = count === 0;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hovered = useRef(false);
  const state = useRef({ selected, empty });
  state.current = { selected, empty };
  const [supported] = useState(() => getOrbRenderer().supported);
  const { hex, seed } = ORB_COLORS[competencyId];
  const palette = useMemo(() => strandsPalette(hex), [hex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !supported) return;
    const renderer = getOrbRenderer();
    // 화면 크기에 맞춰 캔버스 해상도 정하기 (기기 배율은 최대 2)
    const ro = new ResizeObserver(([entry]) => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const px = Math.round(entry.contentRect.width * dpr);
      if (canvas.width !== px) {
        canvas.width = canvas.height = px;
        renderer.kick();
      }
    });
    ro.observe(canvas);
    const unregister = renderer.register(canvas, (): OrbParams => {
      const { selected, empty } = state.current;
      const hot = selected || hovered.current;
      const light = !document.documentElement.classList.contains("dark");
      const greyEmpty = empty && !selected && light;
      return {
        palette: greyEmpty ? EMPTY_LIGHT_PALETTE : palette,
        seed,
        // 빈 구슬은 흑백(라이트 모드는 회청색) 선 한 줄. 선택하면 그 역량 색을 옅게 비춰 "이 색으로 채워질 구슬"임을 보여 준다
        sat: empty ? (selected ? 0.4 : greyEmpty ? 0.55 : 0) : 1,
        energy: empty ? (hot ? 0.3 : light ? 0.24 : 0.12) : selected ? 1 : hovered.current ? 0.82 : 0.5,
        intensity: empty ? (light ? 1.6 : 1.25) : 1,
        dispersion: hot && !empty ? 1 : 0,
        every: hot ? 1 : empty ? 5 : 2,
        resolution: hot ? 1 : empty ? 0.5 : 0.6,
      };
    });
    return () => {
      ro.disconnect();
      unregister();
    };
  }, [palette, seed, supported]);

  // 선택이 바뀌면 바로 다시 그리기
  useEffect(() => getOrbRenderer().kick(), [selected, empty]);

  const setHover = (v: boolean) => {
    hovered.current = v;
    getOrbRenderer().kick();
  };

  return (
    <span className="block" onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)} onPointerLeave={() => setHover(false)}>
      <span className="orb relative block aspect-square w-full" data-selected={selected} data-empty={empty}>
        {/* 바깥 빛: 선택·호버한 채워진 구슬만 (CSS 그림자라 매 프레임 다시 그리지 않음).
            모바일 캐러셀(compact)에는 없음: 옆으로 넘기는 상자가 빛을 네모나게 잘라서 (사용자 결정) */}
        {!empty && !compact && (
          <span
            aria-hidden
            className="orb-glow pointer-events-none absolute inset-[8%] rounded-full"
            style={{ boxShadow: `0 0 48px 8px ${hex}`, opacity: selected ? 0.5 : undefined }}
          />
        )}
        {supported ? (
          <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 size-full" />
        ) : (
          <span
            aria-hidden
            className="absolute inset-0 rounded-full"
            style={{
              background: empty
                ? "radial-gradient(circle at 50% 45%, #c9cacd, #8e9096 70%)"
                : `radial-gradient(circle at 50% 50%, #ffffff 0%, ${hex} 30%, #1b1c1e 78%)`,
            }}
          />
        )}
      </span>
      {name && (
        <span className={`mt-2.5 flex flex-col items-center text-center ${compact ? "" : "lg:mt-3"}`}>
          <span
            className={`font-semibold leading-tight break-keep ${compact ? "text-[13px]" : "text-[13px] lg:text-[15px]"} ${
              empty ? "text-ink-faint" : "text-ink"
            }`}
          >
            {name}
          </span>
          {!empty && <span className="mt-0.5 text-xs tabular-nums text-ink-faint">{count}개</span>}
        </span>
      )}
    </span>
  );
}
