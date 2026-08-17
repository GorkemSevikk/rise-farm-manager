"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { CHART_COLORS } from "@/lib/constants";
import { formatGold, formatGoldShort } from "@/lib/format";
import type { MonthlyEarning, PlayerEarning } from "@/types";

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border/70 bg-popover/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="flex items-center gap-2 text-muted-foreground">
          <span
            className="size-2 rounded-full"
            style={{ background: entry.color ?? CHART_COLORS[0] }}
          />
          {entry.name}: <span className="text-foreground">{formatGold(entry.value ?? 0)}</span>
        </p>
      ))}
    </div>
  );
}

export function PlayerEarningsChart({ data }: { data: PlayerEarning[] }) {
  const chartData = data.slice(0, 8).map((player) => ({
    name: player.name.length > 12 ? `${player.name.slice(0, 11)}…` : player.name,
    Kazanç: player.totalGold,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis
          tickFormatter={(value: number) => formatGoldShort(value)}
          tickLine={false}
          axisLine={false}
          fontSize={11}
          width={56}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.35 }} />
        <Bar dataKey="Kazanç" radius={[6, 6, 0, 0]}>
          {chartData.map((_, index) => (
            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MonthlyEarningsChart({ data }: { data: MonthlyEarning[] }) {
  const chartData = data.map((month) => ({
    name: month.label,
    "Brüt gelir": month.gross,
    "Net dağıtım": month.net,
  }));

  // Gradient id'leri sabit olursa aynı sayfada iki grafik render edildiğinde
  // SVG tanımları çakışır ve ikinci grafik yanlış dolguyu kullanır.
  const uid = useId().replace(/:/g, "");
  const grossGradientId = `grossGradient-${uid}`;
  const netGradientId = `netGradient-${uid}`;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={grossGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.5} />
            <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id={netGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS[1]} stopOpacity={0.4} />
            <stop offset="100%" stopColor={CHART_COLORS[1]} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis
          tickFormatter={(value: number) => formatGoldShort(value)}
          tickLine={false}
          axisLine={false}
          fontSize={11}
          width={56}
        />
        <Tooltip content={<ChartTooltip />} />
        <Area
          type="monotone"
          dataKey="Brüt gelir"
          stroke={CHART_COLORS[0]}
          strokeWidth={2}
          fill={`url(#${grossGradientId})`}
        />
        <Area
          type="monotone"
          dataKey="Net dağıtım"
          stroke={CHART_COLORS[1]}
          strokeWidth={2}
          fill={`url(#${netGradientId})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
