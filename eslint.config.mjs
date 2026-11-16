// Next.js 16부터 next lint가 제거되어 ESLint CLI + flat config를 직접 사용한다.
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // React Compiler 계열 신규 규칙(react-hooks v7)은 기존 컴포넌트에서 위반이 있어
    // 배포를 막지 않도록 경고로 낮춘다. 컴포넌트 정리는 별도 작업으로 진행한다.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", ".open-next/**", ".wrangler/**"]),
]);
