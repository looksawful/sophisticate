import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          0: "#060607",
          1: "#0b0b0d",
          2: "#111216",
          3: "#17181d",
        },
        text: {
          strong: "#f5f5f7",
          base: "#e6e6ea",
          muted: "#b4b5be",
          dim: "#8f919b",
        },
      },
      borderColor: {
        strong: "rgba(255,255,255,0.14)",
        base: "rgba(255,255,255,0.1)",
      },
      boxShadow: {
        glass: "0 10px 30px rgba(0,0,0,0.42)",
        glow: "0 0 20px rgba(219,39,119,0.28)",
      },
      backdropBlur: {
        glass: "10px",
      },
      fontSize: {
        ui: ["0.8125rem", { lineHeight: "1.4" }],
      },
      borderRadius: {
        xl2: "1rem",
      },
    },
  },
  plugins: [],
};

export default config;
