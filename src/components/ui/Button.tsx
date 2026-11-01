import type { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

// 몽타주 Button: primary = Solid/Primary, secondary = Outlined/Assistive, ghost = Text
// danger = 빨간 글자 버튼, danger-solid = 확인 창의 [삭제]처럼 지우는 일을 확정하는 빨간 버튼
// 호버·눌림은 .press(globals.css)가 글자색 막으로 보여 준다
type Variant = "primary" | "secondary" | "ghost" | "danger" | "danger-solid";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary-fill text-on-primary disabled:bg-subtle disabled:text-placeholder",
  secondary: "border border-line-strong bg-surface text-ink disabled:text-placeholder",
  ghost: "text-ink-soft hover:text-ink disabled:text-placeholder",
  danger: "text-danger",
  "danger-solid": "bg-danger text-white dark:text-bg disabled:bg-subtle disabled:text-placeholder",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  size?: "md" | "sm";
}

export default function Button({ variant = "primary", loading, size = "md", className = "", children, disabled, ...rest }: Props) {
  // md = Large(높이 48), sm = Medium(높이 40, 모바일은 터치 영역 44)
  const sizing = size === "md" ? "min-h-12 px-5 text-base" : "min-h-11 px-4 text-[15px] sm:min-h-10";
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`press inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors duration-150 disabled:cursor-not-allowed ${sizing} ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
