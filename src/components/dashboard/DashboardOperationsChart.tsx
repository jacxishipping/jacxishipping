'use client';

import { JacxiButton } from '@/components/design-system/JacxiButton';
import { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { Activity, BarChart3, PieChart as PieIcon, Layers, TrendingUp, TrendingDown } from 'lucide-react';

import { DashboardPanel } from '@/components/dashboard/DashboardSurface';

type TrendPoint = {
  date: string;
  shipments: number;
  inTransit: number;
};

type ContainerCap = {
  containerNumber: string;
  utilization: number;
  capacity: number;
};

type StatusStat = {
  status: string;
  _count: number;
};

type DashboardOperationsChartProps = {
  trends: TrendPoint[];
  containerUtilization: ContainerCap[];
  shipmentStats: StatusStat[];
};

const STATUS_LABELS: Record<string, string> = {
  ON_HAND: 'On Hand',
  DISPATCHING: 'Dispatching',
  DISPATCHED: 'Dispatched',
  IN_TRANSIT: 'In Transit',
  ARRIVED_AT_PORT: 'Arrived At Port',
  LOADED_IN_CONTAINER: 'Loaded in Container',
  CUSTOMS_CLEARANCE: 'Customs Hold',
  RELEASED: 'Released',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

const STATUS_COLORS = [
  '#D4AF37', // Accent Gold
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#14B8A6', // Teal
];

export default function DashboardOperationsChart({
  trends,
  containerUtilization,
  shipmentStats,
}: DashboardOperationsChartProps) {
  const [activeTab, setActiveTab] = useState<'trends' | 'status' | 'containers'>('trends');
  const [trendPeriod, setTrendPeriod] = useState<'7d' | '14d' | '30d'>('14d');

  const sliceCount = useMemo(() => {
    return trendPeriod === '7d' ? 7 : trendPeriod === '14d' ? 14 : 30;
  }, [trendPeriod]);

  const formattedTrends = useMemo(() => {
    const sliced = trends.slice(-sliceCount);
    return sliced.map((item) => ({
      ...item,
      displayDate: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));
  }, [trends, sliceCount]);

  const periodMetrics = useMemo(() => {
    const currentSlice = trends.slice(-sliceCount);
    const currentShipments = currentSlice.reduce((sum, item) => sum + item.shipments, 0);
    const currentInTransit = currentSlice.reduce((sum, item) => sum + item.inTransit, 0);

    // Prior slice of same length if available in the trends history
    const priorSlice = trends.slice(-sliceCount * 2, -sliceCount);
    const priorShipments = priorSlice.reduce((sum, item) => sum + item.shipments, 0);

    // A velocity % is only meaningful when both periods have shipments: a
    // zero baseline would force a fabricated divisor, and a zero current
    // period would render as a -100% "collapse" even though the live
    // pipeline (all-time, by status) is untouched. Null means "no pill".
    const velocityPct =
      priorShipments > 0 && currentShipments > 0
        ? Math.round(((currentShipments - priorShipments) / priorShipments) * 100)
        : null;

    return {
      currentShipments,
      currentInTransit,
      velocityPct,
      isPositive: velocityPct !== null && velocityPct >= 0,
      priorLabel: trendPeriod === '7d' ? 'prior 7d' : trendPeriod === '14d' ? 'prior 14d' : 'prior 30d',
    };
  }, [trends, sliceCount, trendPeriod]);

  const formattedStats = useMemo(() => {
    return shipmentStats
      .filter((s) => s._count > 0)
      .map((item, index) => ({
        name: STATUS_LABELS[item.status] || item.status,
        count: item._count,
        color: STATUS_COLORS[index % STATUS_COLORS.length],
      }))
      .sort((a, b) => b.count - a.count);
  }, [shipmentStats]);

  const totalStatusCount = useMemo(
    () => formattedStats.reduce((sum, item) => sum + item.count, 0),
    [formattedStats]
  );

  const formattedContainers = useMemo(() => {
    return containerUtilization.map((c) => ({
      name: c.containerNumber,
      utilized: c.utilization,
      remaining: Math.max(0, c.capacity - c.utilization),
      rate: c.capacity > 0 ? Math.round((c.utilization / c.capacity) * 100) : 0,
      total: c.capacity,
    }));
  }, [containerUtilization]);

  return (
    <DashboardPanel
      title={
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-[var(--accent-gold)]" />
          <span className="font-semibold text-[var(--text-primary)]">Operations Velocity &amp; Analytics</span>
        </div>
      }
      description="Real-time operational momentum, pipeline distribution, and fleet utilization"
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          {/* Main Tab Switcher */}
          <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--background)] p-1 text-xs">
            <JacxiButton
              type="button"
              variant="outline"
              onClick={() => setActiveTab('trends')}
              style={{ fontFamily: 'inherit' }}
              className={`!inline-flex !items-center !gap-1.5 !rounded-lg !px-2.5 !py-1 !text-xs !font-medium !border-transparent shadow-none transition-all cursor-pointer ${
                activeTab === 'trends'
                  ? '!bg-[var(--panel)] !text-[var(--accent-gold-text)] shadow-xs'
                  : '!bg-transparent !text-[var(--text-secondary)] hover:!text-[var(--text-primary)]'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Movement Trends</span>
              <span className="sm:hidden">Trends</span>
            </JacxiButton>
            <JacxiButton
              type="button"
              variant="outline"
              onClick={() => setActiveTab('status')}
              style={{ fontFamily: 'inherit' }}
              className={`!inline-flex !items-center !gap-1.5 !rounded-lg !px-2.5 !py-1 !text-xs !font-medium !border-transparent shadow-none transition-all cursor-pointer ${
                activeTab === 'status'
                  ? '!bg-[var(--panel)] !text-[var(--accent-gold-text)] shadow-xs'
                  : '!bg-transparent !text-[var(--text-secondary)] hover:!text-[var(--text-primary)]'
              }`}
            >
              <PieIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Pipeline Status</span>
              <span className="sm:hidden">Pipeline</span>
            </JacxiButton>
            <JacxiButton
              type="button"
              variant="outline"
              onClick={() => setActiveTab('containers')}
              style={{ fontFamily: 'inherit' }}
              className={`!inline-flex !items-center !gap-1.5 !rounded-lg !px-2.5 !py-1 !text-xs !font-medium !border-transparent shadow-none transition-all cursor-pointer ${
                activeTab === 'containers'
                  ? '!bg-[var(--panel)] !text-[var(--accent-gold-text)] shadow-xs'
                  : '!bg-transparent !text-[var(--text-secondary)] hover:!text-[var(--text-primary)]'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Container Capacity</span>
              <span className="sm:hidden">Capacity</span>
            </JacxiButton>
          </div>

          {/* Dynamic Period Selector for Trends (7D / 14D / 30D) */}
          {activeTab === 'trends' && (
            <div className="flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--background)] p-0.5 text-[11px]">
              {(['7d', '14d', '30d'] as const).map((period) => (
                <JacxiButton
                  key={period}
                  type="button"
                  variant="outline"
                  onClick={() => setTrendPeriod(period)}
                  style={{ fontFamily: 'inherit' }}
                  className={`!px-2 !py-0.5 !rounded-md !text-[11px] !font-semibold shadow-none transition-all cursor-pointer ${
                    trendPeriod === period
                      ? '!bg-[var(--panel)] !text-[var(--accent-gold-text)] shadow-xs !border !border-[var(--border)]'
                      : '!bg-transparent !border-transparent !text-[var(--text-secondary)] hover:!text-[var(--text-primary)]'
                  }`}
                >
                  {period.toUpperCase()}
                </JacxiButton>
              ))}
            </div>
          )}
        </div>
      }
    >
      <div className="w-full pt-2">
        {activeTab === 'trends' && (
          <div>
            {periodMetrics.currentShipments === 0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center gap-1.5 px-4 py-8 text-center">
                <Activity className="h-5 w-5 text-[var(--text-secondary)]" />
                <p className="text-sm font-semibold text-[var(--text-primary)]">No shipments in this period</p>
                <p className="max-w-sm text-xs leading-relaxed text-[var(--text-secondary)]">
                  No shipments were created in the selected period. Try a longer period, or check the Pipeline Status tab for current totals.
                </p>
              </div>
            ) : (
              <>
            {/* Interactive Analytical Metrics Summary Bar */}
            <div className="mb-3 flex items-center justify-between border-b border-[var(--border)] pb-2 px-1 text-xs">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-[11px] font-medium text-[var(--text-secondary)]">Period shipments</span>
                  <div className="font-bold text-[var(--text-primary)] text-sm tabular-nums">
                    {periodMetrics.currentShipments} units
                  </div>
                </div>
                <div className="h-6 w-px bg-[var(--border)]" />
                <div>
                  <span className="text-[11px] font-medium text-[var(--text-secondary)]">In transit</span>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm tabular-nums">
                    {periodMetrics.currentInTransit} active
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[var(--text-secondary)] hidden sm:inline">Velocity vs {periodMetrics.priorLabel}:</span>
                {periodMetrics.velocityPct !== null ? (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums border ${
                    periodMetrics.isPositive
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  }`}>
                    {periodMetrics.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {periodMetrics.velocityPct > 0 ? `+${periodMetrics.velocityPct}%` : `${periodMetrics.velocityPct}%`}
                  </span>
                ) : (
                  <span className="text-[11px] text-[var(--text-secondary)]">No prior-period baseline</span>
                )}
              </div>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formattedTrends} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="opGoldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#D4AF37" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="opTransitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} vertical={false} />
                  <XAxis
                    dataKey="displayDate"
                    stroke="var(--text-secondary)"
                    style={{ fontSize: '11px' }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border)' }}
                  />
                  <YAxis
                    stroke="var(--text-secondary)"
                    style={{ fontSize: '11px' }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border)' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--panel)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      color: 'var(--text-primary)',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                      fontSize: '12px',
                    }}
                    labelStyle={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '8px', fontSize: '12px' }}
                    formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{value}</span>}
                  />
                  <Area
                    type="monotone"
                    dataKey="shipments"
                    name="New Shipments"
                    stroke="#D4AF37"
                    strokeWidth={2.2}
                    fill="url(#opGoldGrad)"
                    activeDot={{ r: 6, stroke: '#FFFFFF', strokeWidth: 2 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="inTransit"
                    name="In Transit"
                    stroke="#10B981"
                    strokeWidth={2.2}
                    fill="url(#opTransitGrad)"
                    activeDot={{ r: 6, stroke: '#FFFFFF', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'status' && (
          <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
            <div className="h-[260px] lg:col-span-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={formattedStats}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={3}
                  >
                    {formattedStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--panel)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--panel)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      color: 'var(--text-primary)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:col-span-6">
              {formattedStats.map((item) => {
                const pct = totalStatusCount > 0 ? Math.round((item.count / totalStatusCount) * 100) : 0;
                return (
                  <div
                    key={item.name}
                    className="flex flex-col justify-between rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 transition-colors hover:border-[var(--accent-gold)]/40"
                  >
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate font-medium">{item.name}</span>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-lg font-bold text-[var(--text-primary)]">{item.count}</span>
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)]">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'containers' && (
          <div className="h-[280px] w-full">
            {formattedContainers.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-[var(--text-secondary)]">
                No active containers recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formattedContainers} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="var(--text-secondary)"
                    style={{ fontSize: '11px' }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border)' }}
                  />
                  <YAxis
                    stroke="var(--text-secondary)"
                    style={{ fontSize: '11px' }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border)' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--panel)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      color: 'var(--text-primary)',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                      fontSize: '12px',
                    }}
                    formatter={(value: any, name: any) => [
                      value,
                      name === 'utilized' ? 'Vehicles Loaded' : 'Remaining Capacity',
                    ]}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '8px', fontSize: '12px' }}
                    formatter={(value) => (
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                        {value === 'utilized' ? 'Vehicles Loaded' : 'Remaining Capacity'}
                      </span>
                    )}
                  />
                  <Bar dataKey="utilized" stackId="a" fill="#D4AF37" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="remaining" stackId="a" fill="#E5E7EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </div>
    </DashboardPanel>
  );
}
