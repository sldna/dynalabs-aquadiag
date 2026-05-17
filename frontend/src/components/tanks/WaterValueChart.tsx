"use client";

import { formatDateDE } from "@/lib/date";
import type { WaterChartPoint } from "@/lib/water-chart-data";

export type WaterValueChartProps = {
  title: string;
  unit?: string;
  points: WaterChartPoint[];
};

const WIDTH = 280;
const HEIGHT = 132;
const PAD = { top: 12, right: 8, bottom: 28, left: 36 };

function formatAxisValue(value: number): string {
  return value.toLocaleString("de-DE", {
    maximumFractionDigits: value < 10 ? 2 : 1,
  });
}

function buildPath(points: WaterChartPoint[], minY: number, maxY: number): string {
  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const spanY = maxY - minY || 1;

  return points
    .map((point, index) => {
      const x = PAD.left + (index / Math.max(points.length - 1, 1)) * innerW;
      const y = PAD.top + innerH - ((point.value - minY) / spanY) * innerH;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function WaterValueChart({ title, unit, points }: WaterValueChartProps) {
  if (points.length === 0) {
    return (
      <article
        className="min-w-[240px] flex-1 rounded-card border border-aqua-deep/10 bg-white p-3 shadow-card"
        aria-label={title}
      >
        <h3 className="text-sm font-semibold text-aqua-deep">{title}</h3>
        <p className="mt-6 text-xs text-aqua-deep/60">Keine Werte im Zeitraum</p>
      </article>
    );
  }

  if (points.length === 1) {
    const only = points[0]!;
    const when = formatDateDE(only.at);
    return (
      <article
        className="min-w-[240px] flex-1 rounded-card border border-aqua-deep/10 bg-white p-3 shadow-card"
        aria-label={title}
      >
        <h3 className="text-sm font-semibold text-aqua-deep">{title}</h3>
        <p className="mt-4 text-2xl font-semibold text-aqua-deep">
          {formatAxisValue(only.value)}
          {unit ? <span className="ml-1 text-sm font-medium text-aqua-deep/65">{unit}</span> : null}
        </p>
        <p className="mt-1 text-xs text-aqua-deep/60">{when ?? only.at}</p>
        <p className="mt-3 text-xs text-aqua-deep/70">
          Für einen Verlauf werden mindestens zwei Messungen benötigt.
        </p>
      </article>
    );
  }

  const values = points.map((p) => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const padding = (maxVal - minVal || 1) * 0.12;
  const minY = minVal - padding;
  const maxY = maxVal + padding;
  const path = buildPath(points, minY, maxY);

  const firstLabel = formatDateDE(points[0]!.at);
  const lastLabel = formatDateDE(points[points.length - 1]!.at);

  return (
    <article
      className="min-w-[240px] flex-1 rounded-card border border-aqua-deep/10 bg-white p-3 shadow-card"
      aria-label={`${title} Verlauf`}
    >
      <h3 className="text-sm font-semibold text-aqua-deep">{title}</h3>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-1 h-auto w-full"
        role="img"
        aria-hidden="true"
      >
        <line
          x1={PAD.left}
          y1={HEIGHT - PAD.bottom}
          x2={WIDTH - PAD.right}
          y2={HEIGHT - PAD.bottom}
          stroke="currentColor"
          className="text-aqua-deep/15"
          strokeWidth="1"
        />
        <text
          x={PAD.left}
          y={PAD.top + 4}
          className="fill-aqua-deep/55 text-[9px]"
        >
          {formatAxisValue(maxY)}
        </text>
        <text
          x={PAD.left}
          y={HEIGHT - PAD.bottom - 4}
          className="fill-aqua-deep/55 text-[9px]"
        >
          {formatAxisValue(minY)}
        </text>
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          className="text-aqua-blue"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((point, index) => {
          const innerW = WIDTH - PAD.left - PAD.right;
          const innerH = HEIGHT - PAD.top - PAD.bottom;
          const spanY = maxY - minY || 1;
          const x = PAD.left + (index / Math.max(points.length - 1, 1)) * innerW;
          const y = PAD.top + innerH - ((point.value - minY) / spanY) * innerH;
          return (
            <circle
              key={`${point.at}-${index}`}
              cx={x}
              cy={y}
              r={3}
              className="fill-aqua-blue"
            />
          );
        })}
        <text
          x={PAD.left}
          y={HEIGHT - 6}
          className="fill-aqua-deep/60 text-[9px]"
        >
          {firstLabel ?? "—"}
        </text>
        <text
          x={WIDTH - PAD.right}
          y={HEIGHT - 6}
          textAnchor="end"
          className="fill-aqua-deep/60 text-[9px]"
        >
          {lastLabel ?? "—"}
        </text>
      </svg>
      {unit ? (
        <p className="text-xs text-aqua-deep/55">{unit}</p>
      ) : null}
    </article>
  );
}
