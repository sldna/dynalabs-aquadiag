import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  // Safelist severity badge palette: classes are emitted from a typed map in
  // src/lib/severity.ts, but listing them explicitly keeps them out of any
  // future content-scanner edge cases when the file is renamed/refactored.
  safelist: [
    "bg-status-info/15",
    "text-status-info",
    "ring-status-info/30",
    "bg-status-success/15",
    "text-status-success",
    "ring-status-success/30",
    "bg-status-warning/25",
    "text-aqua-deep",
    "ring-status-warning/40",
    "bg-status-alert/15",
    "text-status-alert",
    "ring-status-alert/35",
    "bg-status-critical/15",
    "text-status-critical",
    "ring-status-critical/35",
    "bg-aqua-sand",
    "text-aqua-deep",
    "ring-aqua-deep/20",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", ...defaultTheme.fontFamily.sans],
      },
      colors: {
        aqua: {
          deep: "#0F4C5C",
          blue: "#1CA7C9",
          mint: "#52D6C6",
          navy: "#082F3A",
          soft: "#E8F8FB",
          sand: "#F4EFE7",
        },
        status: {
          success: "#2FBF71",
          warning: "#F2C94C",
          alert: "#F2994A",
          critical: "#EB5757",
          info: "#2D9CDB",
        },
      },
      borderRadius: {
        card: "16px",
        button: "12px",
      },
      boxShadow: {
        card: "0 8px 24px rgba(8, 47, 58, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
