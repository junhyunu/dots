import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

// 같은 Wi-Fi의 휴대폰에서 개발 서버(http://이 컴퓨터 IP:3000)를 열 수 있게
// 서버를 켤 때의 이 컴퓨터 IPv4 주소를 허용한다. 개발 서버에서만 쓰인다.
const lanAddresses = Object.values(networkInterfaces())
  .flat()
  .filter((net) => net && net.family === "IPv4" && !net.internal)
  .map((net) => net!.address);

const nextConfig: NextConfig = {
  // 프롬프트.md는 API 함수가 실행 중에 읽으므로 배포 번들에 포함시킨다.
  outputFileTracingIncludes: {
    "/api/generate": ["./프롬프트.md"],
  },
  allowedDevOrigins: lanAddresses,
};

export default nextConfig;
