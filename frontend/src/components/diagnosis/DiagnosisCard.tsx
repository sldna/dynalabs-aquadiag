import type { DiagnosisItem } from "@/lib/types";
import { SeverityBadge } from "@/components/SeverityBadge";
import { MetaInfo } from "@/components/diagnosis/MetaInfo";
import type { ReactNode } from "react";

function displayName(d: DiagnosisItem): string {
  const n = d.name?.trim();
  if (n) return n;
  return d.diagnosis_type.replace(/_/g, " ");
}

export type DiagnosisCardProps = {
  diagnosis: DiagnosisItem;
  emphasis?: "top" | "extra";
  children?: ReactNode;
};

export function DiagnosisCard({
  diagnosis,
  emphasis = "extra",
  children,
}: DiagnosisCardProps) {
  const ring =
    emphasis === "top" ? "ring-aqua-blue/35" : "ring-aqua-deep/12";
  const bg = emphasis === "top" ? "bg-white" : "bg-white";

  return (
    <article className={`rounded-card p-4 ring-1 shadow-card ${ring} ${bg}`}>
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={diagnosis.severity} />
          <MetaInfo
            confidencePct={diagnosis.confidence * 100}
            ruleId={diagnosis.rule_id}
          />
        </div>
        <h2 className="text-lg font-semibold tracking-tight text-aqua-deep">
          {displayName(diagnosis)}
        </h2>
      </header>
      {children ? <div className="mt-4 space-y-4">{children}</div> : null}
    </article>
  );
}
