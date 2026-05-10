import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  // Safelist severity badge palette: classes are emitted from a typed map in
  // src/lib/severity.ts, but listing them explicitly keeps them out of any
  // future content-scanner edge cases when the file is renamed/refactored.
  safelist: [
    // SeverityBadge + hero accents (see src/lib/severity.ts)
    "shadow-sm",
    "bg-status-info/22",
    "text-status-info",
    "ring-2",
    "ring-status-info/45",
    "bg-status-success/22",
    "text-status-success",
    "ring-status-success/45",
    "bg-status-warning/35",
    "text-aqua-deep",
    "ring-status-warning/55",
    "bg-status-alert/22",
    "text-status-alert",
    "ring-status-alert/50",
    "bg-status-critical/22",
    "text-status-critical",
    "ring-status-critical/50",
    "bg-aqua-sand",
    "ring-aqua-deep/30",
    "border-l-[6px]",
    "border-l-status-info",
    "border-l-status-success",
    "border-l-status-warning",
    "border-l-status-alert",
    "border-l-status-critical",
    "border-l-aqua-deep/25",
    "bg-status-info/[0.07]",
    "bg-status-success/[0.08]",
    "bg-status-warning/[0.12]",
    "bg-status-alert/[0.08]",
    "bg-status-critical/[0.08]",
    "bg-aqua-soft/80",
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
