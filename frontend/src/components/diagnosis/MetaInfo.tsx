export type MetaInfoProps = {
  confidencePct?: number;
  ruleId?: string;
};

export function MetaInfo({ confidencePct, ruleId }: MetaInfoProps) {
  const parts: string[] = [];
  if (typeof confidencePct === "number" && Number.isFinite(confidencePct)) {
    parts.push(`Konfidenz ${confidencePct.toFixed(0).replace(/\.0$/, "")}%`);
  }
  if (ruleId && ruleId.trim()) {
    parts.push(ruleId.trim());
  }
  if (parts.length === 0) return null;

  return (
    <p className="text-xs text-aqua-deep/55">
      {parts.map((p, idx) => (
        <span key={p}>
          {idx > 0 ? <span aria-hidden="true"> · </span> : null}
          {p}
        </span>
      ))}
    </p>
  );
}
