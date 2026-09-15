import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  {
    files: ["src/components/sophisticate/SophisticatePreviewView.tsx"],
    // React issue #34775: passing a ref-bearing controller object through props can
    // incorrectly mark every property access as a ref read during render. This view
    // never reads `.current`; keep the rule enabled everywhere else.
    rules: {
      "react-hooks/refs": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "public/ffmpeg-core/**"]),
]);
