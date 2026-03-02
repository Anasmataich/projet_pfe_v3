interface PieChartProps {
  data: { label: string; value: number }[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6'];

export function PieChart({ data }: PieChartProps) {
  const total = data.reduce((acc, d) => acc + d.value, 0);
  if (total === 0) return <p className="text-sm text-slate-500 text-center py-8">Aucune donnée</p>;

  let cumulative = 0;
  const slices = data.map((d, i) => {
    const start = cumulative;
    cumulative += d.value;
    return { ...d, start, end: cumulative, color: COLORS[i % COLORS.length] };
  });

  const toCoord = (pct: number) => {
    const angle = pct * 2 * Math.PI - Math.PI / 2;
    return { x: 50 + 40 * Math.cos(angle), y: 50 + 40 * Math.sin(angle) };
  };

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 100 100" className="w-40 h-40 shrink-0">
        {slices.map((s, i) => {
          const startPct = s.start / total;
          const endPct = s.end / total;
          const largeArc = endPct - startPct > 0.5 ? 1 : 0;
          const p1 = toCoord(startPct);
          const p2 = toCoord(endPct);
          return (
            <path
              key={i}
              d={`M50,50 L${p1.x},${p1.y} A40,40 0 ${largeArc},1 ${p2.x},${p2.y} Z`}
              fill={s.color}
              className="transition-opacity hover:opacity-80"
            />
          );
        })}
        <circle cx="50" cy="50" r="20" fill="#0f2048" />
        <text x="50" y="52" textAnchor="middle" className="text-[8px] font-bold" fill="#e2e8f0">{total}</text>
      </svg>

      <div className="space-y-1.5 overflow-hidden">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-slate-300 truncate">{s.label}</span>
            <span className="text-slate-500 ml-auto tabular-nums">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
