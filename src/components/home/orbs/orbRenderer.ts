// 구슬 렌더러: WebGL2 컨텍스트 1개로 모든 구슬을 그린다.
// 화면에 보이는 구슬마다 2D 캔버스를 두고, 공용 WebGL 캔버스에 그린 뒤 그대로 복사한다.
// 프레임 예산: 선택·호버 = 매 프레임, 채워진 구슬 = 2프레임마다, 빈 구슬 = 5프레임마다.
// 해상도 예산: 선택·호버 = 100%, 채워진 구슬 = 60%, 빈 구슬 = 50% (부드럽게 번지는 그림이라 확대해도 티가 거의 안 남).
// 화면 밖이면 그리지 않고, 움직임 줄이기면 시간을 멈춘 한 장면만 그린다.
import { FRAGMENT, ORB_RADIUS, VERTEX } from "./orbShader";

export interface OrbParams {
  /** strandsPalette()로 만든 색 역할 7개 (24칸) */
  palette: Float32Array;
  /** 0 = 잔잔한 선 한 줄(빈 구슬), 1 = 리본이 활짝(선택) */
  energy: number;
  /** 0 = 흑백 */
  sat: number;
  /** 밝기 */
  intensity: number;
  /** 가장자리 무지갯빛 번짐. 계산이 무거워 선택·호버 구슬에만 켠다 */
  dispersion: number;
  seed: number;
  /** 높을수록 드물게 그린다: 1 = 매 프레임 */
  every: number;
  /** 그리는 해상도 비율 (1 = 선명). 셰이더가 무거워 선택·호버가 아닌 구슬은 낮춰 그린 뒤 확대한다 */
  resolution: number;
}

type Smooth = Pick<OrbParams, "energy" | "sat" | "intensity" | "dispersion">;

interface Target {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  get: () => OrbParams;
  cur: Smooth | null;
  /** 이 구슬만의 시간 (활력이 높을수록 빨리 흐른다) */
  clock: number;
  last: number;
  visible: boolean;
  frame: number;
}

const MAX_PX = 360;
const UNIFORMS = [
  "uResolution", "uMotion", "uLevel", "uColors", "uCount", "uAmplitude", "uWaviness", "uThickness", "uGlow", "uTaper",
  "uSpread", "uHueShift", "uIntensity", "uSaturation", "uScale", "uGlass", "uRadius", "uRefraction", "uDispersion",
  "uRim", "uLean", "uIntro", "uPulse", "uLight", "uOpacity",
];

class OrbRenderer {
  private gl: WebGL2RenderingContext | null = null;
  private glCanvas: HTMLCanvasElement | null = null;
  private loc: Record<string, WebGLUniformLocation | null> = {};
  private targets = new Set<Target>();
  private raf = 0;
  private io: IntersectionObserver | null = null;
  private reduce = false;
  readonly supported: boolean;

  constructor() {
    this.supported = typeof window !== "undefined" && this.init();
    if (typeof window !== "undefined") {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      this.reduce = mq.matches;
      mq.addEventListener("change", (e) => {
        this.reduce = e.matches;
        this.kick();
      });
    }
  }

  private init(): boolean {
    const c = document.createElement("canvas");
    c.width = c.height = MAX_PX;
    const gl = c.getContext("webgl2", { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: true });
    if (!gl) return false;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
      return s;
    };
    try {
      const prog = gl.createProgram()!;
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERTEX));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAGMENT));
      gl.bindAttribLocation(prog, 0, "position");
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      // 화면을 덮는 삼각형 하나
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      for (const u of UNIFORMS) this.loc[u] = gl.getUniformLocation(prog, u);
      // 구슬마다 같은 값
      gl.uniform1i(this.loc.uCount, 3);
      for (const u of ["uAmplitude", "uWaviness", "uThickness", "uGlow", "uTaper", "uSpread", "uScale", "uRefraction", "uRim", "uIntro", "uOpacity", "uGlass"]) gl.uniform1f(this.loc[u], 1);
      gl.uniform1f(this.loc.uHueShift, 0);
      gl.uniform1f(this.loc.uRadius, ORB_RADIUS);
      gl.uniform2f(this.loc.uLean, 0, 0);
      gl.uniform1f(this.loc.uPulse, 0);
    } catch (e) {
      console.warn("orb shader", e);
      return false;
    }
    this.gl = gl;
    this.glCanvas = c;
    // 테마가 바뀌면 다시 그린다
    new MutationObserver(() => this.kick()).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    this.io = new IntersectionObserver((entries) => {
      for (const en of entries) for (const t of this.targets) if (t.canvas === en.target) t.visible = en.isIntersecting;
      this.kick();
    });
    return true;
  }

  register(canvas: HTMLCanvasElement, get: () => OrbParams): () => void {
    const ctx = canvas.getContext("2d");
    if (!ctx || !this.gl) return () => {};
    const t: Target = { canvas, ctx, get, cur: null, clock: 2 + get().seed * 10, last: 0, visible: true, frame: 0 };
    this.targets.add(t);
    this.io?.observe(canvas);
    this.kick();
    return () => {
      this.targets.delete(t);
      this.io?.unobserve(canvas);
    };
  }

  /** 상태가 바뀌었을 때(선택·호버·테마) 바로 다시 그리게 한다 */
  kick() {
    if (!this.raf && this.gl) this.raf = requestAnimationFrame(this.loop);
  }

  private loop = (now: number) => {
    this.raf = 0;
    const gl = this.gl!;
    const light = document.documentElement.classList.contains("dark") ? 0 : 1;
    let busy = false;

    for (const t of this.targets) {
      if (!t.visible || !t.canvas.isConnected) continue;
      const want = t.get();
      // 상태 변화는 부드럽게 따라간다 (움직임 줄이기면 바로)
      const k = this.reduce ? 1 : 0.14;
      const cur = (t.cur ??= { energy: want.energy, sat: want.sat, intensity: want.intensity, dispersion: want.dispersion });
      let settling = false;
      for (const key of ["energy", "sat", "intensity", "dispersion"] as const) {
        cur[key] += (want[key] - cur[key]) * k;
        if (Math.abs(want[key] - cur[key]) > 0.005) settling = true;
      }

      t.frame++;
      // 첫 장면은 바로 그린다 (빈 구슬이 5프레임 동안 비어 보이지 않게)
      const due = this.reduce || settling || t.frame === 1 || t.frame % Math.max(1, want.every) === 0;
      if (!this.reduce) busy = true;
      if (!due) continue;

      // 이 구슬의 시간: 건너뛴 프레임만큼 한꺼번에 흐른다. 활력이 높을수록 빨리 (원본과 같은 비율)
      const dt = t.last ? Math.min(0.1, (now - t.last) / 1000) : 0;
      t.last = now;
      if (!this.reduce) t.clock += dt * (0.6 + 1.6 * Math.min(1, cur.energy));
      const c = t.clock;
      const sway = 0.75 + 0.45 * cur.energy;

      const w = Math.max(1, Math.round(Math.min(MAX_PX, t.canvas.width) * want.resolution));
      const h = Math.max(1, Math.round(Math.min(MAX_PX, t.canvas.height) * want.resolution));
      gl.viewport(0, 0, w, h);
      gl.uniform2f(this.loc.uResolution, w, h);
      gl.uniform3f(
        this.loc.uMotion,
        (0.26 * Math.sin(0.53 * c) + 0.1 * Math.sin(1.19 * c + 1.3)) * sway,
        1 + (0.06 * Math.sin(0.71 * c) + 0.035 * Math.sin(1.37 * c + 0.4)) * sway,
        0.06 * Math.sin(0.41 * c + 2) * sway,
      );
      gl.uniform1f(this.loc.uLevel, cur.energy);
      gl.uniform3fv(this.loc.uColors, want.palette);
      gl.uniform1f(this.loc.uSaturation, cur.sat);
      gl.uniform1f(this.loc.uIntensity, cur.intensity);
      gl.uniform1f(this.loc.uDispersion, cur.dispersion);
      gl.uniform1f(this.loc.uLight, light);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      t.ctx.clearRect(0, 0, t.canvas.width, t.canvas.height);
      // WebGL은 아래쪽이 원점: 그린 영역은 캔버스의 아래 왼쪽 w×h
      t.ctx.drawImage(this.glCanvas!, 0, MAX_PX - h, w, h, 0, 0, t.canvas.width, t.canvas.height);
      if (settling) busy = true;
    }
    if (busy) this.raf = requestAnimationFrame(this.loop);
  };
}

let instance: OrbRenderer | null = null;
export function getOrbRenderer(): OrbRenderer {
  return (instance ??= new OrbRenderer());
}
