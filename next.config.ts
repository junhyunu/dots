import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 프롬프트.md는 API 함수가 실행 중에 읽으므로 배포 번들에 포함시킨다.
  outputFileTracingIncludes: {
    "/api/generate": ["./프롬프트.md"],
  },
};

export default nextConfig;
