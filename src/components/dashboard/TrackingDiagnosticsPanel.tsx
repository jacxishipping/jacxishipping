'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Play,
  Copy,
  Check,
  Globe,
  Ship,
  Anchor,
  Database,
  Key,
  ChevronDown,
  ChevronUp,
  Terminal,
  Zap,
  Info,
  MapPin,
  Navigation,
  Radio,
  Activity,
  Shield,
  Eye,
  EyeOff,
  Search,
  Wifi,
  WifiOff,
  Timer,
  ArrowUpDown,
  BarChart3,
  PieChart,
  TrendingUp,
  Package,
  Bell,
  MessageSquare,
  Smartphone,
  Webhook,
  Download,
  FlaskConical,
  Layers,
  List,
  Loader2,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { Box, Chip, TextField, Typography, Tooltip, IconButton, Divider, Switch, FormControlLabel, LinearProgress, Select, MenuItem } from '@mui/material';
import { DashboardGrid, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Button, StatsCard, StatusBadge, toast } from '@/components/design-system';

// ─── Types ───────────────────────────────────────────────────────────────────

type SupabaseDiagnostics = {
  supabaseUrl: string;
  userId: string;
  subscriptionStatus: string;
  hasAnonKey: boolean;
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  maskedAnonKey: string;
  maskedAccessToken: string;
  maskedRefreshToken: string;
  tokenExpiresAt: string | null;
  isTokenExpired: boolean;
  secondsUntilExpiry: number | null;
};

type TrackingApisStatus = {
  supabase: SupabaseDiagnostics;
  turkon: {
    name: string;
    endpoint: string;
    targetPrefix: string;
    protocol: string;
    status: string;
  };
  pgl: {
    name: string;
    endpoint: string;
    protocol: string;
    status: string;
  };
  publicGateway: {
    name: string;
    endpoints: string[];
    keysConfigured: boolean;
    keyCount: number;
    maskedKeys: string[];
  };
  recentContainers: Array<{
    id: string;
    containerNumber: string;
    trackingNumber: string | null;
    shippingLine: string | null;
    status: string;
    updatedAt: string;
  }>;
};

type TestTarget =
  | 'pipeline'
  | 'supabase-container'
  | 'supabase-token'
  | 'supabase-ping'
  | 'supabase-vessel'
  | 'turkon'
  | 'pgl'
  | 'public-api';

interface TestResult {
  target: string;
  success: boolean;
  trackingNumber?: string;
  httpStatus?: number;
  latencyMs?: number;
  error?: string;
  message?: string;
  [key: string]: unknown;
}

interface LatencyRecord {
  target: string;
  latencyMs: number;
  success: boolean;
  timestamp: number;
}

type ContainerStats = {
  totalContainers: number;
  activeContainers: number;
  autoTrackingEnabled: number;
  containersWithTrackingEvents: number;
  containersLast24h: number;
  statusDistribution: Record<string, number>;
  carrierDistribution: Array<{ carrier: string; count: number }>;
  topDestinations: Array<{ port: string; count: number }>;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatExpiryTime = (seconds: number | null) => {
  if (seconds === null) return 'Unknown';
  if (seconds <= 0) return 'Expired';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h remaining`;
  }
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
};

const statusColor = (success: boolean | undefined | null) =>
  success ? 'success' : 'error';

const statusIcon = (success: boolean | undefined | null) =>
  success ? CheckCircle2 : XCircle;

const testTargetMeta: Record<TestTarget, { label: string; icon: typeof Zap; description: string }> = {
  'supabase-ping': { label: 'Supabase Ping', icon: Wifi, description: 'Basic connectivity check' },
  'supabase-token': { label: 'Token Renewal', icon: Key, description: 'Test OAuth refresh flow' },
  'supabase-container': { label: 'Container Lookup', icon: Database, description: 'Fetch tracking data for a container' },
  'supabase-vessel': { label: 'Vessel AIS', icon: Navigation, description: 'Live vessel position by IMO' },
  turkon: { label: 'Turkon API', icon: Ship, description: 'Direct Turkon Line tracking' },
  pgl: { label: 'PGL Legacy', icon: Anchor, description: 'PGL upstream fallback' },
  pipeline: { label: 'Full Pipeline', icon: Activity, description: 'End-to-end tracking resolution' },
  'public-api': { label: 'Public API', icon: Globe, description: 'Public tracking gateway' },
};

const STATUS_COLORS: Record<string, string> = {
  CREATED: '#6366f1',
  WAITING_FOR_LOADING: '#f59e0b',
  LOADED: '#3b82f6',
  IN_TRANSIT: '#06b6d4',
  ARRIVED_PORT: '#10b981',
  CUSTOMS_CLEARANCE: '#8b5cf6',
  RELEASED: '#22c55e',
  CLOSED: '#6b7280',
};

const STATUS_LABELS: Record<string, string> = {
  CREATED: 'Created',
  WAITING_FOR_LOADING: 'Waiting',
  LOADED: 'Loaded',
  IN_TRANSIT: 'In Transit',
  ARRIVED_PORT: 'Arrived',
  CUSTOMS_CLEARANCE: 'Customs',
  RELEASED: 'Released',
  CLOSED: 'Closed',
};

// ─── Component ───────────────────────────────────────────────────────────────

export function TrackingDiagnosticsPanel() {
  const [data, setData] = useState<TrackingApisStatus | null>(null);
  const [stats, setStats] = useState<ContainerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);

  // Test console
  const [testTarget, setTestTarget] = useState<TestTarget>('supabase-ping');
  const [trackingNumber, setTrackingNumber] = useState('TRKU3019842');
  const [vesselImo, setVesselImo] = useState('9811000');
  const [runningTest, setRunningTest] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);
  const [latencyHistory, setLatencyHistory] = useState<LatencyRecord[]>([]);
  const [copiedJson, setCopiedJson] = useState(false);
  const [jsonExpanded, setJsonExpanded] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);

  // Bulk batch testing
  const [bulkContainers, setBulkContainers] = useState('TRKU3019842\nMSKU9048123\nHLCU1234567');
  const [bulkResults, setBulkResults] = useState<TestResult[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);

  // Carrier detection playground
  const [carrierQuery, setCarrierQuery] = useState('MSKU9048123');
  const [carrierResult, setCarrierResult] = useState<{ carrier: string; scac: string; prefixes: string[]; color: string; isValid: boolean | null; checkDigit?: number } | null>(null);

  // Milestone alert test
  const [milestoneType, setMilestoneType] = useState('VESSEL_DEPARTED');
  const [milestonePhone, setMilestonePhone] = useState('');
  const [milestoneSending, setMilestoneSending] = useState(false);
  const [milestoneResult, setMilestoneResult] = useState<any>(null);

  // ── Data Fetching ──────────────────────────────────────────────────────────

  const fetchStatus = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await fetch('/api/settings/tracking-apis', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load tracking APIs configuration');
      const payload: TrackingApisStatus = await res.json();
      setData(payload);
    } catch (err: any) {
      toast.error(err.message || 'Error fetching tracking API status');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await fetch('/api/diagnostics/container-stats', { cache: 'no-store' });
      if (res.ok) {
        const payload: ContainerStats = await res.json();
        setStats(payload);
      }
    } catch { /* silently fail */ } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); fetchStats(); }, [fetchStatus, fetchStats]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => { fetchStatus(true); fetchStats(); }, 30_000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchStatus, fetchStats]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleRunTest = async (overrideTarget?: TestTarget, overrideTracking?: string) => {
    const target = overrideTarget || testTarget;
    const tracking = overrideTracking || trackingNumber;
    const startTime = Date.now();

    try {
      setRunningTest(true);
      setTestResult(null);

      const payload: Record<string, any> = { target };
      if (target === 'supabase-vessel') payload.imo = vesselImo;
      else payload.trackingNumber = tracking.trim().toUpperCase();

      const res = await fetch('/api/settings/tracking-apis/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await res.json();
      const result: TestResult = { ...body, httpStatus: res.status };
      setTestResult(result);
      setTestHistory((prev) => [result, ...prev].slice(0, 20));
      setLatencyHistory((prev) => [{ target, latencyMs: result.latencyMs || 0, success: result.success, timestamp: Date.now() }, ...prev].slice(0, 50));

      if (body.success) toast.success(`✅ ${testTargetMeta[target].label} — ${body.latencyMs || 0}ms`);
      else toast.warning(body.message || body.error || 'Test completed with warning');
    } catch (err: any) {
      const result: TestResult = { target, success: false, error: err.message, latencyMs: Date.now() - startTime };
      setTestResult(result);
      setTestHistory((prev) => [result, ...prev].slice(0, 20));
      setLatencyHistory((prev) => [{ target, latencyMs: Date.now() - startTime, success: false, timestamp: Date.now() }, ...prev].slice(0, 50));
      toast.error(`Test failed: ${err.message}`);
    } finally {
      setRunningTest(false);
    }
  };

  const handleCopyJson = () => {
    if (!testResult) return;
    navigator.clipboard.writeText(JSON.stringify(testResult, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleRenewToken = async () => {
    await handleRunTest('supabase-token');
    await fetchStatus(true);
  };

  const handleQuickTest = (target: TestTarget, container?: string) => {
    setTestTarget(target);
    if (container) setTrackingNumber(container);
    handleRunTest(target, container);
  };

  // ── Bulk Batch Testing ─────────────────────────────────────────────────────

  const handleBulkTest = async () => {
    const numbers = bulkContainers.split('\n').map(s => s.trim()).filter(Boolean);
    if (numbers.length === 0) { toast.error('Enter at least one container number'); return; }

    setBulkRunning(true);
    setBulkResults([]);
    setBulkProgress(0);

    const results: TestResult[] = [];
    for (let i = 0; i < numbers.length; i++) {
      const num = numbers[i];
      try {
        const res = await fetch('/api/settings/tracking-apis/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target: 'supabase-container', trackingNumber: num.trim().toUpperCase() }),
        });
        const body = await res.json();
        results.push({ ...body, httpStatus: res.status });
      } catch (err: any) {
        results.push({ target: 'supabase-container', success: false, error: err.message, trackingNumber: num });
      }
      setBulkResults([...results]);
      setBulkProgress(Math.round(((i + 1) / numbers.length) * 100));
    }

    const successCount = results.filter(r => r.success).length;
    toast.success(`Batch complete: ${successCount}/${numbers.length} succeeded`);
    setBulkRunning(false);
  };

  // ── Carrier Detection ──────────────────────────────────────────────────────

  const handleDetectCarrier = () => {
    const query = carrierQuery.trim();
    if (!query) { setCarrierResult(null); return; }

    const prefixes: Record<string, { carrier: string; scac: string; prefixes: string[]; color: string }> = {
      MSKU: { carrier: 'Maersk Line', scac: 'MAEU', prefixes: ['MSKU', 'MAEU', 'MRKU', 'MSFU', 'MRSU', 'MNBU'], color: '#42B0D5' },
      MAEU: { carrier: 'Maersk Line', scac: 'MAEU', prefixes: ['MSKU', 'MAEU', 'MRKU', 'MSFU', 'MRSU', 'MNBU'], color: '#42B0D5' },
      MSCU: { carrier: 'MSC', scac: 'MSCU', prefixes: ['MSCU', 'MEDU', 'TTNU', 'TGHU'], color: '#FFCC00' },
      MEDU: { carrier: 'MSC', scac: 'MSCU', prefixes: ['MSCU', 'MEDU', 'TTNU', 'TGHU'], color: '#FFCC00' },
      CMAU: { carrier: 'CMA CGM', scac: 'CMDU', prefixes: ['CMAU', 'CGMU', 'ANLU', 'APZU'], color: '#E60028' },
      CGMU: { carrier: 'CMA CGM', scac: 'CMDU', prefixes: ['CMAU', 'CGMU', 'ANLU', 'APZU'], color: '#E60028' },
      HLCU: { carrier: 'Hapag-Lloyd', scac: 'HLCU', prefixes: ['HLCU', 'HLXU', 'UASC', 'CSQU'], color: '#FF6600' },
      COSU: { carrier: 'COSCO', scac: 'COSU', prefixes: ['COSU', 'CSLU', 'CCLU', 'CBHU'], color: '#003399' },
      ONEY: { carrier: 'ONE', scac: 'ONEY', prefixes: ['ONEY', 'NYKU', 'MOLU', 'KKLU'], color: '#E31B6D' },
      EGLV: { carrier: 'Evergreen', scac: 'EGLV', prefixes: ['EGLV', 'EISU', 'EMCU', 'UGMU'], color: '#008037' },
      YMLU: { carrier: 'Yang Ming', scac: 'YMLU', prefixes: ['YMLU', 'YMMU'], color: '#002E6E' },
      ZIMU: { carrier: 'ZIM', scac: 'ZIMU', prefixes: ['ZIMU', 'ZCSU'], color: '#D38827' },
      TRKU: { carrier: 'Turkon Line', scac: 'TRKU', prefixes: ['TRKU'], color: '#E31B23' },
    };

    const upper = query.toUpperCase();
    const prefix = upper.slice(0, 4);
    const detected = prefixes[prefix];

    const cleaned = upper.replace(/[^A-Z0-9]/g, '');
    const isValidFormat = cleaned.length === 11;
    let checkDigitValid: boolean | null = null;
    let calcDigit: number | undefined;

    if (isValidFormat) {
      const charCodeMap: Record<string, number> = {
        A:10,B:12,C:13,D:14,E:15,F:16,G:17,H:18,I:19,J:20,K:21,L:23,M:24,N:25,O:26,P:27,Q:28,R:29,S:30,T:31,U:32,V:34,W:35,X:36,Y:37,Z:38,
      };
      let sum = 0;
      for (let i = 0; i < 10; i++) {
        const char = cleaned[i];
        const val = !isNaN(Number(char)) ? Number(char) : charCodeMap[char] || 0;
        sum += val * Math.pow(2, i);
      }
      const remainder = sum % 11;
      calcDigit = remainder === 10 ? 0 : remainder;
      checkDigitValid = calcDigit === Number(cleaned[10]);
    }

    setCarrierResult({
      carrier: detected?.carrier || 'Unknown / Generic DCSA',
      scac: detected?.scac || 'DCSA',
      prefixes: detected?.prefixes || [],
      color: detected?.color || '#06B6D4',
      isValid: isValidFormat ? checkDigitValid : null,
      checkDigit: calcDigit,
    });
  };

  // ── Milestone Alert Test ───────────────────────────────────────────────────

  const handleTestMilestone = async () => {
    try {
      setMilestoneSending(true);
      setMilestoneResult(null);

      const res = await fetch('/api/notifications/milestone-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'trigger',
          milestone: milestoneType,
          milestoneLabel: milestoneType.replace(/_/g, ' '),
          customerPhone: milestonePhone || undefined,
          containerNumber: trackingNumber,
        }),
      });

      const body = await res.json();
      setMilestoneResult(body);

      if (body.success) toast.success(`Milestone alert dispatched via ${Object.entries(body.channels || {}).filter(([,v]: any) => v).map(([k]) => k).join(', ') || 'channels'}`);
      else toast.warning(body.message || 'Milestone dispatch completed with warnings');
    } catch (err: any) {
      toast.error(`Milestone test failed: ${err.message}`);
      setMilestoneResult({ success: false, error: err.message });
    } finally {
      setMilestoneSending(false);
    }
  };

  // ── Export Report ──────────────────────────────────────────────────────────

  const handleExportReport = () => {
    const report = {
      exportedAt: new Date().toISOString(),
      supabase: data?.supabase || null,
      providers: {
        turkon: data?.turkon || null,
        pgl: data?.pgl || null,
        publicGateway: data?.publicGateway || null,
      },
      containerStats: stats || null,
      testHistory: testHistory.slice(0, 10),
      latencyHistory: latencyHistory.slice(0, 20),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tracking-diagnostics-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Diagnostics report exported');
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box sx={{ p: 8, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 3 }}>
        <div className="relative">
          <Radio className="w-10 h-10 text-cyan-500 animate-pulse" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500" />
          </span>
        </div>
        <Typography sx={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
          Loading tracking diagnostics...
        </Typography>
      </Box>
    );
  }

  const s = data?.supabase;
  const isTokenValid = s && !s.isTokenExpired && s.hasAccessToken;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Activity className="w-6 h-6 text-cyan-500" />
            Container Tracking Diagnostics
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mt: 0.5 }}>
            Real-time health checks, test console, container stats, carrier detection, and milestone alert testing
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                sx={{ '& .MuiSwitch-thumb': { bgcolor: autoRefresh ? 'var(--accent-gold)' : undefined } }}
              />
            }
            label={<Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Auto-refresh 30s</Typography>}
          />
          <Button variant="outline" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleExportReport}>
            Export Report
          </Button>
          <Button variant="outline" size="sm" icon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />} onClick={() => { fetchStatus(true); fetchStats(); }} disabled={refreshing}>
            Refresh
          </Button>
        </Box>
      </Box>

      {/* ── Container Stats Overview ────────────────────────────────────────── */}
      <DashboardPanel title="Container Database Overview" description="Aggregate statistics from the container database">
        {statsLoading ? (
          <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}><Loader2 className="w-5 h-5 animate-spin text-cyan-500" /></Box>
        ) : stats ? (
          <>
            <DashboardGrid className="grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              <StatsCard title="Total Containers" value={stats.totalContainers.toLocaleString()} icon={<Package className="w-5 h-5" />} />
              <StatsCard title="Active" value={stats.activeContainers.toLocaleString()} icon={<Activity className="w-5 h-5" />} trend={stats.activeContainers > 0 ? { value: stats.activeContainers, isPositive: true } : undefined} />
              <StatsCard title="Auto-Tracking" value={stats.autoTrackingEnabled.toLocaleString()} icon={<Radio className="w-5 h-5" />} trend={stats.autoTrackingEnabled > 0 ? { value: stats.autoTrackingEnabled, isPositive: true } : undefined} />
              <StatsCard title="With Events" value={stats.containersWithTrackingEvents.toLocaleString()} icon={<Database className="w-5 h-5" />} />
              <StatsCard title="Updated (24h)" value={stats.containersLast24h.toLocaleString()} icon={<Clock className="w-5 h-5" />} />
              <StatsCard title="Tracking Rate" value={stats.totalContainers > 0 ? `${Math.round((stats.autoTrackingEnabled / stats.totalContainers) * 100)}%` : '0%'} icon={<TrendingUp className="w-5 h-5" />} />
            </DashboardGrid>

            {/* Status Distribution Bar Chart */}
            <Box sx={{ mt: 3 }}>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 1.5 }}>
                Status Distribution
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {Object.entries(stats.statusDistribution)
                  .sort(([, a], [, b]) => b - a)
                  .map(([status, count]) => {
                    const pct = stats.totalContainers > 0 ? (count / stats.totalContainers) * 100 : 0;
                    const color = STATUS_COLORS[status] || '#6b7280';
                    return (
                      <Box key={status} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography sx={{ minWidth: 100, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {STATUS_LABELS[status] || status}
                        </Typography>
                        <Box sx={{ flex: 1, position: 'relative', height: 22, borderRadius: 1.5, bgcolor: 'var(--surface-subtle)', overflow: 'hidden' }}>
                          <Box sx={{ height: '100%', width: `${pct}%`, borderRadius: 1.5, bgcolor: color, opacity: 0.7, transition: 'width 0.5s ease' }} />
                          <Typography sx={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: '0.68rem', fontWeight: 700, color: pct > 15 ? 'white' : 'var(--text-secondary)' }}>
                            {count}
                          </Typography>
                        </Box>
                        <Typography sx={{ minWidth: 40, textAlign: 'right', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {pct.toFixed(1)}%
                        </Typography>
                      </Box>
                    );
                  })}
              </Box>
            </Box>

            {/* Carrier & Destination Distribution */}
            <DashboardGrid className="mt-6 grid-cols-1 md:grid-cols-2">
              {stats.carrierDistribution.length > 0 && (
                <Box sx={{ p: 2, borderRadius: 2, border: '1px solid var(--border)', bgcolor: 'var(--surface-subtle)' }}>
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 1.5 }}>
                    <Ship className="w-3.5 h-3.5 inline mr-1" /> Top Carriers
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {stats.carrierDistribution.slice(0, 8).map((c) => (
                      <Box key={c.carrier} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ flex: 1, fontSize: '0.75rem', color: 'var(--text-primary)' }}>{c.carrier}</Typography>
                        <Box sx={{ width: 120, height: 6, borderRadius: 1, bgcolor: 'var(--surface)', overflow: 'hidden' }}>
                          <Box sx={{ height: '100%', width: `${(c.count / Math.max(...stats.carrierDistribution.map(x => x.count))) * 100}%`, borderRadius: 1, bgcolor: 'var(--accent-gold)', opacity: 0.7 }} />
                        </Box>
                        <Typography sx={{ minWidth: 30, textAlign: 'right', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)' }}>{c.count}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
              {stats.topDestinations.length > 0 && (
                <Box sx={{ p: 2, borderRadius: 2, border: '1px solid var(--border)', bgcolor: 'var(--surface-subtle)' }}>
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 1.5 }}>
                    <MapPin className="w-3.5 h-3.5 inline mr-1" /> Top Destinations
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {stats.topDestinations.map((d) => (
                      <Box key={d.port} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ flex: 1, fontSize: '0.75rem', color: 'var(--text-primary)' }}>{d.port}</Typography>
                        <Box sx={{ width: 120, height: 6, borderRadius: 1, bgcolor: 'var(--surface)', overflow: 'hidden' }}>
                          <Box sx={{ height: '100%', width: `${(d.count / Math.max(...stats.topDestinations.map(x => x.count))) * 100}%`, borderRadius: 1, bgcolor: '#06b6d4', opacity: 0.7 }} />
                        </Box>
                        <Typography sx={{ minWidth: 30, textAlign: 'right', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)' }}>{d.count}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </DashboardGrid>
          </>
        ) : (
          <Typography sx={{ color: 'var(--text-secondary)', p: 2, textAlign: 'center' }}>Unable to load container statistics</Typography>
        )}
      </DashboardPanel>

      {/* ── Supabase Connection Health ──────────────────────────────────────── */}
      <DashboardPanel title="Supabase Connection" description="ContainerTracking backend status and JWT token health">
        <DashboardGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Connection"
            value={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {s?.hasAnonKey ? (
                  <><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Connected</>
                ) : (
                  <><XCircle className="w-4 h-4 text-red-500" /> Not Configured</>
                )}
              </Box>
            }
            icon={<Wifi className="w-5 h-5" />}
            trend={s?.hasAnonKey ? { value: 1, isPositive: true } : { value: 0, isPositive: false }}
          />
          <StatsCard
            title="Access Token"
            value={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {isTokenValid ? (
                  <><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Valid</>
                ) : s?.isTokenExpired ? (
                  <><AlertTriangle className="w-4 h-4 text-amber-500" /> Expired</>
                ) : (
                  <><XCircle className="w-4 h-4 text-red-500" /> Missing</>
                )}
              </Box>
            }
            icon={<Shield className="w-5 h-5" />}
            trend={isTokenValid ? { value: 1, isPositive: true } : s?.isTokenExpired ? { value: 0, isPositive: false } : { value: 0, isPositive: false }}
          />
          <StatsCard
            title="Token Expiry"
            value={
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: s?.isTokenExpired ? 'var(--error)' : 'var(--text-primary)' }}>
                {s?.tokenExpiresAt ? new Date(s.tokenExpiresAt).toLocaleString() : 'N/A'}
              </Typography>
            }
            subtitle={formatExpiryTime(s?.secondsUntilExpiry ?? null)}
            icon={<Timer className="w-5 h-5" />}
          />
          <StatsCard
            title="Subscription"
            value={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StatusBadge status={s?.subscriptionStatus || 'unknown'} size="sm" />
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {s?.subscriptionStatus || 'Unknown'}
                </Typography>
              </Box>
            }
            icon={<Radio className="w-5 h-5" />}
          />
        </DashboardGrid>

        {/* Credentials Summary */}
        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, borderRadius: 2, bgcolor: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
            <Key className="w-4 h-4 text-cyan-500" />
            <Typography sx={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Anon Key: <strong className="text-[var(--text-primary)]">{showSecrets ? s?.maskedAnonKey || '—' : '••••••••'}</strong>
            </Typography>
            <IconButton size="small" onClick={() => setShowSecrets(!showSecrets)} sx={{ color: 'var(--text-secondary)' }}>
              {showSecrets ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, borderRadius: 2, bgcolor: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
            <Globe className="w-4 h-4 text-cyan-500" />
            <Typography sx={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              URL: <strong className="text-[var(--text-primary)]">{s?.supabaseUrl || '—'}</strong>
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, borderRadius: 2, bgcolor: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
            <Database className="w-4 h-4 text-cyan-500" />
            <Typography sx={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              User ID: <strong className="text-[var(--text-primary)]">{s?.userId ? `${s.userId.slice(0, 12)}...` : '—'}</strong>
            </Typography>
          </Box>
        </Box>

        {/* Quick Actions */}
        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
          <Button
            variant="outline"
            size="sm"
            icon={<Wifi className="w-4 h-4" />}
            onClick={() => handleQuickTest('supabase-ping')}
          >
            Ping Supabase
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={handleRenewToken}
          >
            Renew Token
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Database className="w-4 h-4" />}
            onClick={() => handleQuickTest('supabase-container', trackingNumber)}
          >
            Test Container Lookup
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Navigation className="w-4 h-4" />}
            onClick={() => handleQuickTest('supabase-vessel')}
          >
            Test Vessel AIS
          </Button>
        </Box>
      </DashboardPanel>

      {/* ── Provider Status Overview ────────────────────────────────────────── */}
      <DashboardPanel title="Provider Status" description="All upstream tracking providers">
        <DashboardGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {/* Supabase */}
          <Box sx={{ p: 2.5, borderRadius: 2, border: '1px solid var(--border)', bgcolor: 'var(--surface-subtle)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: isTokenValid ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }}>
                  <Database className={`w-4 h-4 ${isTokenValid ? 'text-emerald-500' : 'text-red-500'}`} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Supabase ContainerTracking
                  </Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    Primary Live Engine
                  </Typography>
                </Box>
              </Box>
              <StatusBadge status={isTokenValid ? 'ACTIVE' : 'ERROR'} size="sm" />
            </Box>
            <Divider sx={{ borderColor: 'var(--border)', mb: 1.5 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <span>Token: {isTokenValid ? 'Valid' : s?.isTokenExpired ? 'Expired' : 'Missing'}</span>
              <span>{s?.hasRefreshToken ? 'Refresh ✓' : 'No Refresh'}</span>
            </Box>
          </Box>

          {/* Turkon */}
          <Box sx={{ p: 2.5, borderRadius: 2, border: '1px solid var(--border)', bgcolor: 'var(--surface-subtle)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(6,182,212,0.12)' }}>
                  <Ship className="w-4 h-4 text-cyan-500" />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Turkon Line
                  </Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    {data?.turkon?.name || 'Direct API'}
                  </Typography>
                </Box>
              </Box>
              <StatusBadge status={data?.turkon?.status || 'ACTIVE'} size="sm" />
            </Box>
            <Divider sx={{ borderColor: 'var(--border)', mb: 1.5 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <span>Prefix: <strong className="text-[var(--text-primary)]">{data?.turkon?.targetPrefix || 'TRKU'}</strong></span>
              <Button variant="ghost" size="sm" onClick={() => handleQuickTest('turkon')}>
                Test
              </Button>
            </Box>
          </Box>

          {/* PGL */}
          <Box sx={{ p: 2.5, borderRadius: 2, border: '1px solid var(--border)', bgcolor: 'var(--surface-subtle)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(139,92,246,0.12)' }}>
                  <Anchor className="w-4 h-4 text-purple-500" />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    PGL Legacy
                  </Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    Upstream Fallback
                  </Typography>
                </Box>
              </Box>
              <StatusBadge status={data?.pgl?.status || 'ACTIVE'} size="sm" />
            </Box>
            <Divider sx={{ borderColor: 'var(--border)', mb: 1.5 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <span>Protocol: {data?.pgl?.protocol?.slice(0, 30)}</span>
              <Button variant="ghost" size="sm" onClick={() => handleQuickTest('pgl')}>
                Test
              </Button>
            </Box>
          </Box>

          {/* Public Gateway */}
          <Box sx={{ p: 2.5, borderRadius: 2, border: '1px solid var(--border)', bgcolor: 'var(--surface-subtle)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(251,191,36,0.12)' }}>
                  <Globe className="w-4 h-4 text-amber-500" />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Public API Gateway
                  </Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    {data?.publicGateway?.keyCount || 0} key(s) configured
                  </Typography>
                </Box>
              </Box>
              <StatusBadge status={data?.publicGateway?.keysConfigured ? 'ACTIVE' : 'INACTIVE'} size="sm" />
            </Box>
            <Divider sx={{ borderColor: 'var(--border)', mb: 1.5 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <span>Endpoints: {data?.publicGateway?.endpoints?.length || 0}</span>
              <Button variant="ghost" size="sm" onClick={() => handleQuickTest('public-api')}>
                Test
              </Button>
            </Box>
          </Box>
        </DashboardGrid>
      </DashboardPanel>

      {/* ── Latency History ──────────────────────────────────────────────────── */}
      {latencyHistory.length > 0 && (
        <DashboardPanel title="Latency History" description="Recent test response times">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {latencyHistory.slice(0, 10).map((r, i) => {
              const meta = testTargetMeta[r.target as TestTarget];
              return (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1, borderRadius: 1.5, bgcolor: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                  <Box sx={{ width: 80, flexShrink: 0 }}>
                    <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{meta?.label || r.target}</Typography>
                  </Box>
                  <Box sx={{ flex: 1, height: 6, borderRadius: 1, bgcolor: 'var(--surface)', overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', borderRadius: 1, bgcolor: r.success ? '#10b981' : '#ef4444', width: `${Math.min(100, (r.latencyMs / 5000) * 100)}%`, transition: 'width 0.3s ease' }} />
                  </Box>
                  <Typography sx={{ minWidth: 60, textAlign: 'right', fontSize: '0.72rem', fontWeight: 700, fontFamily: 'monospace', color: r.latencyMs < 500 ? '#10b981' : r.latencyMs < 2000 ? '#f59e0b' : '#ef4444' }}>
                    {r.latencyMs}ms
                  </Typography>
                  {r.success ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 text-red-500" />}
                </Box>
              );
            })}
          </Box>
        </DashboardPanel>
      )}

      {/* ── Test Console ────────────────────────────────────────────────────── */}
      <DashboardPanel
        title="Test Console"
        description="Run diagnostics against any tracking provider"
        actions={
          testHistory.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setTestHistory([])}>
              Clear History
            </Button>
          )
        }
      >
        {/* Controls */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <Box sx={{ flex: '1 1 200px', minWidth: 160 }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.5 }}>
              Test Target
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {(Object.entries(testTargetMeta) as [TestTarget, typeof testTargetMeta[TestTarget]][]).map(([key, meta]) => {
                const Icon = meta.icon;
                return (
                  <Chip
                    key={key}
                    label={meta.label}
                    icon={<Icon className="w-3.5 h-3.5" />}
                    onClick={() => setTestTarget(key)}
                    variant={testTarget === key ? 'filled' : 'outlined'}
                    size="small"
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.72rem',
                      bgcolor: testTarget === key ? 'rgba(var(--accent-gold-rgb), 0.15)' : undefined,
                      borderColor: testTarget === key ? 'var(--accent-gold)' : 'var(--border)',
                      color: testTarget === key ? 'var(--accent-gold)' : 'var(--text-secondary)',
                      '&:hover': { bgcolor: 'rgba(var(--accent-gold-rgb), 0.08)' },
                    }}
                  />
                );
              })}
            </Box>
          </Box>

          <Box sx={{ flex: '1 1 240px', minWidth: 180 }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.5 }}>
              {testTarget === 'supabase-vessel' ? 'Vessel IMO Number' : 'Container / Tracking Number'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                value={testTarget === 'supabase-vessel' ? vesselImo : trackingNumber}
                onChange={(e) => {
                  if (testTarget === 'supabase-vessel') setVesselImo(e.target.value);
                  else setTrackingNumber(e.target.value);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRunTest(); }}
                placeholder={testTarget === 'supabase-vessel' ? 'e.g. 9811000' : 'e.g. TRKU3019842'}
                sx={{
                  flex: 1,
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.82rem',
                    bgcolor: 'var(--surface-subtle)',
                    '& fieldset': { borderColor: 'var(--border)' },
                  },
                }}
              />
              <Button
                variant="primary"
                size="sm"
                icon={runningTest ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                onClick={() => handleRunTest()}
                disabled={runningTest}
              >
                {runningTest ? 'Running...' : 'Run'}
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Quick Test Buttons from Recent Containers */}
        {data?.recentContainers && data.recentContainers.length > 0 && (
          <Box sx={{ mb: 2.5 }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.75 }}>
              Quick Test — Recent Containers
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {data.recentContainers.slice(0, 6).map((c) => (
                <Chip
                  key={c.id}
                  label={`${c.containerNumber} (${c.status})`}
                  size="small"
                  icon={<Search className="w-3 h-3" />}
                  onClick={() => handleQuickTest('supabase-container', c.containerNumber)}
                  sx={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    bgcolor: 'var(--surface-subtle)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                    '&:hover': { borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' },
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Result Display */}
        {testResult && (
          <Box
            sx={{
              borderRadius: 2,
              border: '1px solid',
              borderColor: testResult.success ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
              bgcolor: testResult.success ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)',
              overflow: 'hidden',
            }}
          >
            {/* Result Header */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 2.5,
                py: 1.5,
                borderBottom: '1px solid var(--border)',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <Box>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {testResult.target ? (testTargetMeta[testResult.target as TestTarget]?.label || testResult.target) : 'Result'}
                  </Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    HTTP {testResult.httpStatus || '—'} · {testResult.latencyMs}ms · {testResult.message || testResult.error || 'No message'}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={copiedJson ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  onClick={handleCopyJson}
                >
                  {copiedJson ? 'Copied' : 'Copy JSON'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={jsonExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  onClick={() => setJsonExpanded(!jsonExpanded)}
                >
                  {jsonExpanded ? 'Collapse' : 'Expand'}
                </Button>
              </Box>
            </Box>

            {/* Result Body */}
            {jsonExpanded && (
              <Box
                sx={{
                  p: 2.5,
                  maxHeight: 400,
                  overflow: 'auto',
                  fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                  fontSize: '0.72rem',
                  lineHeight: 1.6,
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre',
                }}
              >
                {JSON.stringify(testResult, null, 2)}
              </Box>
            )}
          </Box>
        )}

        {/* Test History */}
        {testHistory.length > 0 && (
          <Box sx={{ mt: 2.5 }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 1 }}>
              Test History ({testHistory.length})
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {testHistory.map((h, i) => {
                const Icon = statusIcon(h.success);
                const meta = testTargetMeta[h.target as TestTarget];
                return (
                  <Box
                    key={i}
                    onClick={() => { setTestResult(h); setJsonExpanded(true); }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      px: 2,
                      py: 1,
                      borderRadius: 1.5,
                      bgcolor: 'var(--surface-subtle)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      '&:hover': { borderColor: 'var(--accent-gold)', bgcolor: 'rgba(var(--accent-gold-rgb), 0.05)' },
                    }}
                  >
                    <Icon className={`w-4 h-4 ${h.success ? 'text-emerald-500' : 'text-red-500'}`} />
                    <Typography sx={{ flex: 1, fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {meta?.label || h.target}
                    </Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      {h.latencyMs}ms
                    </Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: h.success ? 'var(--text-secondary)' : 'var(--error)' }}>
                      {h.message || h.error || (h.success ? 'OK' : 'Failed')}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
      </DashboardPanel>

      {/* ── Bulk Batch Testing ────────────────────────────────────────────────── */}
      <DashboardPanel title="Bulk Batch Testing" description="Test multiple containers at once against the Supabase tracking API">
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ flex: '1 1 300px' }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.5 }}>Container Numbers (one per line)</Typography>
            <TextField
              multiline rows={4}
              value={bulkContainers}
              onChange={(e) => setBulkContainers(e.target.value)}
              placeholder="TRKU3019842\nMSKU9048123\nHLCU1234567"
              sx={{ width: '100%', '& .MuiOutlinedInput-root': { fontSize: '0.82rem', bgcolor: 'var(--surface-subtle)', fontFamily: 'monospace', '& fieldset': { borderColor: 'var(--border)' } } }}
            />
          </Box>
          <Box sx={{ flex: '1 1 200px' }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.5 }}>&nbsp;</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button variant="primary" size="sm" icon={bulkRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />} onClick={handleBulkTest} disabled={bulkRunning}>
                {bulkRunning ? `Testing... ${bulkProgress}%` : 'Run Batch Test'}
              </Button>
              {bulkRunning && <LinearProgress variant="determinate" value={bulkProgress} sx={{ borderRadius: 1, height: 4 }} />}
            </Box>
          </Box>
        </Box>

        {bulkResults.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 1 }}>
              Results ({bulkResults.filter(r => r.success).length}/{bulkResults.length} succeeded)
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, maxHeight: 300, overflow: 'auto' }}>
              {bulkResults.map((r, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25, borderRadius: 1.5, bgcolor: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                  {r.success ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                  <Typography sx={{ flex: 1, fontSize: '0.78rem', fontWeight: 600, fontFamily: 'monospace', color: 'var(--text-primary)' }}>{r.trackingNumber || r.target}</Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{r.latencyMs}ms</Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: r.success ? 'var(--text-secondary)' : 'var(--error)' }}>{r.message || r.error || (r.success ? 'OK' : 'Failed')}</Typography>
                  <Typography sx={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Events: {(r as any).eventsCount ?? '—'}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </DashboardPanel>

      {/* ── Carrier Detection Playground ──────────────────────────────────────── */}
      <DashboardPanel title="Carrier Detection Playground" description="Identify ocean carriers from container numbers using ISO 6346 prefix matching">
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-end' }}>
          <Box sx={{ flex: '1 1 240px' }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.5 }}>Container Number or Carrier Name</Typography>
            <TextField
              size="small" value={carrierQuery}
              onChange={(e) => setCarrierQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleDetectCarrier(); }}
              placeholder="e.g. MSKU9048123, MSCU, Maersk"
              sx={{ width: '100%', '& .MuiOutlinedInput-root': { fontSize: '0.82rem', bgcolor: 'var(--surface-subtle)', fontFamily: 'monospace', '& fieldset': { borderColor: 'var(--border)' } } }}
            />
          </Box>
          <Button variant="primary" size="sm" icon={<FlaskConical className="w-4 h-4" />} onClick={handleDetectCarrier}>Detect Carrier</Button>
          <Button variant="outline" size="sm" icon={<Play className="w-4 h-4" />} onClick={() => handleQuickTest('supabase-container', carrierQuery)}>Test This Container</Button>
        </Box>

        {carrierResult && (
          <Box sx={{ mt: 2, p: 2.5, borderRadius: 2, border: '1px solid var(--border)', bgcolor: 'var(--surface-subtle)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: `${carrierResult.color}20`, border: `1px solid ${carrierResult.color}40` }}>
                <Ship className="w-6 h-6" style={{ color: carrierResult.color }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{carrierResult.carrier}</Typography>
                <Typography sx={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  SCAC: <strong className="text-[var(--text-primary)]">{carrierResult.scac}</strong>
                  {carrierResult.prefixes.length > 0 && <> · Prefixes: <strong className="text-[var(--text-primary)]">{carrierResult.prefixes.join(', ')}</strong></>}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                {carrierResult.isValid === true && <StatusBadge status="VALID" size="sm" />}
                {carrierResult.isValid === false && <StatusBadge status="INVALID" size="sm" />}
                {carrierResult.isValid === null && <StatusBadge status="UNKNOWN" size="sm" />}
                {carrierResult.checkDigit !== undefined && (
                  <Typography sx={{ fontSize: '0.68rem', color: 'var(--text-secondary)', mt: 0.5 }}>Check digit: {carrierResult.checkDigit}</Typography>
                )}
              </Box>
            </Box>
          </Box>
        )}
      </DashboardPanel>

      {/* ── Milestone Alert Test Panel ────────────────────────────────────────── */}
      <DashboardPanel title="Milestone Alert Test" description="Test the multi-channel milestone notification system">
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-end' }}>
          <Box sx={{ minWidth: 180 }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.5 }}>Milestone Type</Typography>
            <Select
              size="small" value={milestoneType}
              onChange={(e) => setMilestoneType(e.target.value)}
              sx={{ minWidth: 180, '& .MuiOutlinedInput-root': { fontSize: '0.82rem' } }}
            >
              {['VEHICLE_PICKED_UP', 'CONTAINER_LOADED', 'VESSEL_DEPARTED', 'ARRIVED_AT_PORT', 'CUSTOMS_CLEARED'].map((m) => (
                <MenuItem key={m} value={m}>{m.replace(/_/g, ' ')}</MenuItem>
              ))}
            </Select>
          </Box>
          <Box sx={{ flex: '1 1 200px' }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.5 }}>Customer Phone (optional)</Typography>
            <TextField
              size="small" value={milestonePhone}
              onChange={(e) => setMilestonePhone(e.target.value)}
              placeholder="+1 555 123 4567"
              sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.82rem', bgcolor: 'var(--surface-subtle)', '& fieldset': { borderColor: 'var(--border)' } } }}
            />
          </Box>
          <Button variant="primary" size="sm" icon={milestoneSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />} onClick={handleTestMilestone} disabled={milestoneSending}>
            {milestoneSending ? 'Sending...' : 'Test Milestone Alert'}
          </Button>
        </Box>

        {milestoneResult && (
          <Box sx={{ mt: 2, p: 2, borderRadius: 2, border: '1px solid', borderColor: milestoneResult.success ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)', bgcolor: milestoneResult.success ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              {milestoneResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-amber-500" />}
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {milestoneResult.success ? 'Alert dispatched' : milestoneResult.message || 'Dispatch completed with warnings'}
              </Typography>
            </Box>
            {milestoneResult.channels && (
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                {Object.entries(milestoneResult.channels).map(([channel, sent]) => (
                  <Chip key={channel} icon={sent ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />} label={channel} size="small" color={sent ? 'success' : 'default'} sx={{ fontSize: '0.68rem', fontWeight: 600 }} />
                ))}
              </Box>
            )}
          </Box>
        )}
      </DashboardPanel>

      {/* ── End-to-End Pipeline ────────────────────────────────────────────────── */}
      <DashboardPanel title="End-to-End Pipeline" description="Full tracking resolution pipeline test">
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-end' }}>
          <Box sx={{ flex: '1 1 240px' }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.5 }}>Container Number</Typography>
            <TextField
              size="small" value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="e.g. TRKU3019842"
              sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.82rem', bgcolor: 'var(--surface-subtle)', '& fieldset': { borderColor: 'var(--border)' } } }}
            />
          </Box>
          <Button variant="primary" size="sm" icon={<Activity className="w-4 h-4" />} onClick={() => handleQuickTest('pipeline')} disabled={runningTest}>Run Full Pipeline</Button>
          <Button variant="outline" size="sm" icon={<Ship className="w-4 h-4" />} onClick={() => handleQuickTest('turkon')} disabled={runningTest}>Test Turkon Only</Button>
          <Button variant="outline" size="sm" icon={<Anchor className="w-4 h-4" />} onClick={() => handleQuickTest('pgl')} disabled={runningTest}>Test PGL Only</Button>
        </Box>
      </DashboardPanel>
    </Box>
  );
}
