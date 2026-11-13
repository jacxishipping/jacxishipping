'use client';

import { useCallback, useEffect, useState } from 'react';
import { 
  Radio, 
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
  Info
} from 'lucide-react';
import { DashboardGrid, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Button, FormField, StatsCard, StatusBadge, toast } from '@/components/design-system';

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
  aisProviders: {
    marineTraffic: { configured: boolean; maskedKey: string };
    vesselFinder: { configured: boolean; maskedKey: string };
    aisHub: { configured: boolean; maskedKey: string };
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

export function TrackingApisTab() {
  const [data, setData] = useState<TrackingApisStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [renewingToken, setRenewingToken] = useState(false);
  const [pingingSupabase, setPingingSupabase] = useState(false);
  
  // Credentials Edit state
  const [showEditCredentials, setShowEditCredentials] = useState(false);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [credentialsForm, setCredentialsForm] = useState({
    supabaseUrl: '',
    anonKey: '',
    accessToken: '',
    refreshToken: '',
    userId: '',
    subscriptionStatus: '',
    publicTrackingApiKey: '',
    marineTrafficApiKey: '',
    vesselFinderApiKey: '',
    aisHubApiKey: '',
  });

  // Test Console state
  const [testTarget, setTestTarget] = useState<TestTarget>('pipeline');
  const [trackingNumber, setTrackingNumber] = useState('TRKU3019842');
  const [vesselImo, setVesselImo] = useState('9811000');
  const [runningTest, setRunningTest] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [copiedJson, setCopiedJson] = useState(false);
  const [jsonExpanded, setJsonExpanded] = useState(false);

  const fetchStatus = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await fetch('/api/settings/tracking-apis', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load tracking APIs configuration');
      
      const payload: TrackingApisStatus = await res.json();
      setData(payload);
      
      setCredentialsForm({
        supabaseUrl: payload.supabase.supabaseUrl || '',
        anonKey: '',
        accessToken: '',
        refreshToken: '',
        userId: payload.supabase.userId || '',
        subscriptionStatus: payload.supabase.subscriptionStatus || 'pro',
        publicTrackingApiKey: '',
        marineTrafficApiKey: '',
        vesselFinderApiKey: '',
        aisHubApiKey: '',
      });
    } catch (err: any) {
      toast.error(err.message || 'Error fetching tracking API status');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleRenewToken = async () => {
    try {
      setRenewingToken(true);
      const res = await fetch('/api/settings/tracking-apis/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'supabase-token' }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error || 'Token renewal failed');
      }

      toast.success(`Supabase token renewed successfully in ${body.latencyMs}ms!`);
      if (body.diagnostics) {
        setData((prev) => prev ? { ...prev, supabase: body.diagnostics } : prev);
      } else {
        await fetchStatus(true);
      }
    } catch (err: any) {
      toast.error(`Token renewal error: ${err.message}`);
    } finally {
      setRenewingToken(false);
    }
  };

  const handlePingSupabase = async () => {
    try {
      setPingingSupabase(true);
      const res = await fetch('/api/settings/tracking-apis/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'supabase-ping' }),
      });

      const body = await res.json();
      if (body.success) {
        toast.success(`Supabase ping successful! HTTP ${body.httpStatus} in ${body.latencyMs}ms`);
      } else {
        toast.error(`Supabase ping failed: ${body.error || `HTTP ${body.httpStatus}`}`);
      }
    } catch (err: any) {
      toast.error(`Ping failed: ${err.message}`);
    } finally {
      setPingingSupabase(false);
    }
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingCredentials(true);
      const payload: Record<string, string> = {};
      if (credentialsForm.supabaseUrl) payload.supabaseUrl = credentialsForm.supabaseUrl;
      if (credentialsForm.anonKey) payload.anonKey = credentialsForm.anonKey;
      if (credentialsForm.accessToken) payload.accessToken = credentialsForm.accessToken;
      if (credentialsForm.refreshToken) payload.refreshToken = credentialsForm.refreshToken;
      if (credentialsForm.userId) payload.userId = credentialsForm.userId;
      if (credentialsForm.subscriptionStatus) payload.subscriptionStatus = credentialsForm.subscriptionStatus;
      if (credentialsForm.publicTrackingApiKey) payload.publicTrackingApiKey = credentialsForm.publicTrackingApiKey;
      if (credentialsForm.marineTrafficApiKey) payload.marineTrafficApiKey = credentialsForm.marineTrafficApiKey;
      if (credentialsForm.vesselFinderApiKey) payload.vesselFinderApiKey = credentialsForm.vesselFinderApiKey;
      if (credentialsForm.aisHubApiKey) payload.aisHubApiKey = credentialsForm.aisHubApiKey;

      const res = await fetch('/api/settings/tracking-apis', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Failed to update credentials');

      toast.success('Tracking API credentials updated successfully!');
      setShowEditCredentials(false);
      await fetchStatus(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save credentials');
    } finally {
      setSavingCredentials(false);
    }
  };

  const handleRunTest = async (overrideTarget?: TestTarget, overrideTracking?: string) => {
    const target = overrideTarget || testTarget;
    const tracking = overrideTracking || trackingNumber;

    try {
      setRunningTest(true);
      setTestResult(null);

      const payload: Record<string, any> = { target };
      if (target === 'supabase-vessel') {
        payload.imo = vesselImo;
      } else {
        payload.trackingNumber = tracking.trim().toUpperCase();
      }

      const res = await fetch('/api/settings/tracking-apis/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await res.json();
      setTestResult({
        ...body,
        httpStatus: res.status,
      });

      if (body.success) {
        toast.success(`Test executed in ${body.latencyMs || 0}ms`);
      } else {
        toast.warning(body.message || body.error || 'Test completed with warning');
      }
    } catch (err: any) {
      toast.error(`Test execution failed: ${err.message}`);
      setTestResult({
        success: false,
        error: err.message,
      });
    } finally {
      setRunningTest(false);
    }
  };

  const handleCopyJson = () => {
    if (!testResult) return;
    navigator.clipboard.writeText(JSON.stringify(testResult, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
    toast.success('Response JSON copied to clipboard');
  };

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

  if (loading) {
    return (
      <div style={{padding: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px'}}>
        <RefreshCw className="w-5 h-5 animate-spin text-[var(--accent-gold)]" />
        <p style={{color: 'var(--text-secondary)'}}>Loading tracking APIs status...</p>
      </div>
    );
  }

  const supabase = data?.supabase;

  return (
    <div className="space-y-6">
      {/* 1. Header & System Health Grid */}
      <DashboardPanel
        title="Tracking APIs & Carrier Telematics"
        description="Monitor status, check JWT access token lifecycle, test upstream carrier endpoints, and execute live container lookups."
        actions={
          <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
              onClick={() => fetchStatus(true)}
              loading={refreshing}
            >
              Refresh Status
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Zap className="w-4 h-4" />}
              onClick={() => handleRenewToken()}
              loading={renewingToken}
            >
              Renew Supabase JWT
            </Button>
          </div>
        }
      >
        <DashboardGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {/* Supabase Status Card */}
          <StatsCard
            icon={<Database className="w-4 h-4" />}
            title="Supabase Tracking Engine"
            value={supabase?.isTokenExpired ? 'Token Expired' : supabase?.hasAccessToken ? 'Connected' : 'Unconfigured'}
            subtitle={
              supabase?.tokenExpiresAt
                ? `JWT: ${formatExpiryTime(supabase.secondsUntilExpiry)}`
                : 'No expiration available'
            }
            variant={supabase?.isTokenExpired ? 'warning' : supabase?.hasAccessToken ? 'success' : 'error'}
            size="md"
          />

          {/* Turkon Line Card */}
          <StatsCard
            icon={<Ship className="w-4 h-4" />}
            title="Turkon Line Direct"
            value="Active"
            subtitle="TRKU containers direct REST"
            variant="success"
            size="md"
          />

          {/* PGL Fallback Card */}
          <StatsCard
            icon={<Globe className="w-4 h-4" />}
            title="PGL System Pipeline"
            value="Active"
            subtitle="Secondary fallback provider"
            variant="success"
            size="md"
          />

          {/* Public Tracking API Gateway Card */}
          <StatsCard
            icon={<Key className="w-4 h-4" />}
            title="Public API Gateway"
            value={data?.publicGateway.keysConfigured ? `${data.publicGateway.keyCount} Key(s) Ready` : 'Open / Unkeyed'}
            subtitle="/api/public/tracking"
            variant={data?.publicGateway.keysConfigured ? 'success' : 'info'}
            size="md"
          />
        </DashboardGrid>
      </DashboardPanel>

      {/* 2. Supabase Integration Details & Token Lifecycle Panel */}
      <DashboardPanel
        title="Supabase Backend & Token Lifecycle"
        description="Inspect ContainerTracking JWT token expiration, test token renewal, and manage integration credentials."
        actions={
          <div style={{display: 'flex', gap: '8px'}}>
            <Button
              variant="outline"
              size="sm"
              icon={<Radio className="w-4 h-4" />}
              onClick={handlePingSupabase}
              loading={pingingSupabase}
            >
              Ping API
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={showEditCredentials ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              onClick={() => setShowEditCredentials(!showEditCredentials)}
            >
              {showEditCredentials ? 'Hide Credentials' : 'Edit Credentials'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Status Details Bar */}
          <div style={{padding: '20px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px'}}>
            <div>
              <p style={{fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700}}>
                Supabase URL
              </p>
              <p style={{fontSize: '0.88rem', color: 'var(--text-primary)', marginTop: '4px', fontFamily: 'monospace'}}>
                {supabase?.supabaseUrl || 'Not configured'}
              </p>
            </div>

            <div>
              <p style={{fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700}}>
                Token Expiration
              </p>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px'}}>
                <Clock className="w-4 h-4 text-[var(--accent-gold)]" />
                <p style={{fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 600}}>
                  {supabase?.tokenExpiresAt
                    ? `${new Date(supabase.tokenExpiresAt).toLocaleString()} (${formatExpiryTime(supabase.secondsUntilExpiry)})`
                    : 'N/A'}
                </p>
              </div>
            </div>

            <div>
              <p style={{fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700}}>
                Masked Refresh Token
              </p>
              <p style={{fontSize: '0.88rem', color: 'var(--text-primary)', marginTop: '4px', fontFamily: 'monospace'}}>
                {supabase?.maskedRefreshToken || 'None'}
              </p>
            </div>
          </div>

          {/* Quick Renewal Action Callout */}
          <div style={{padding: '16px', borderRadius: '8px', border: '1px solid rgba(var(--accent-gold-rgb), 0.25)', backgroundColor: 'rgba(var(--accent-gold-rgb), 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <Zap className="w-5 h-5 text-[var(--accent-gold)]" />
              <div>
                <p style={{fontSize: '0.88rem', fontWeight: 650, color: 'var(--text-primary)'}}>
                  Test Automatic Token Renewal
                </p>
                <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
                  Exchanges the refresh token for a fresh Supabase JWT token and updates client headers in real time.
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              loading={renewingToken}
              onClick={handleRenewToken}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Execute Renewal Now
            </Button>
          </div>

          {/* Credentials Edit Form */}
          {showEditCredentials && (
            <form onSubmit={handleSaveCredentials} style={{padding: '24px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--panel)', display: 'flex', flexDirection: 'column', gap: '16px'}}>
              <p style={{fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px'}}>
                Update Tracking Service Credentials
              </p>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                <FormField label="Supabase URL" value={credentialsForm.supabaseUrl} onChange={(e) => setCredentialsForm({ ...credentialsForm, supabaseUrl: e.target.value })} placeholder="https://your-project.supabase.co" size="small" />
                <FormField label="User ID (UUID)" value={credentialsForm.userId} onChange={(e) => setCredentialsForm({ ...credentialsForm, userId: e.target.value })} placeholder="4507dbe2-5a3d-42eb-..." size="small" />
                <FormField label="Anon Key (Public API Key)" type="password" value={credentialsForm.anonKey} onChange={(e) => setCredentialsForm({ ...credentialsForm, anonKey: e.target.value })} placeholder="Enter new Anon Key (leave blank to keep current)" size="small" />
                <FormField label="Refresh Token" type="password" value={credentialsForm.refreshToken} onChange={(e) => setCredentialsForm({ ...credentialsForm, refreshToken: e.target.value })} placeholder="Enter new Refresh Token (leave blank to keep current)" size="small" />
                <FormField label="Access Token (JWT)" type="password" value={credentialsForm.accessToken} onChange={(e) => setCredentialsForm({ ...credentialsForm, accessToken: e.target.value })} placeholder="Enter manual Access Token (optional)" size="small" />
                <FormField label="Public Tracking API Key (Gateway)" type="password" value={credentialsForm.publicTrackingApiKey} onChange={(e) => setCredentialsForm({ ...credentialsForm, publicTrackingApiKey: e.target.value })} placeholder="Optional custom secret for /api/public/tracking" size="small" />
              </div>

              <div style={{display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px'}}>
                <Button variant="outline" size="sm" onClick={() => setShowEditCredentials(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={savingCredentials}>
                  Save Credentials
                </Button>
              </div>
            </form>
          )}
        </div>
      </DashboardPanel>

      {/* 3. AIS Provider Configuration (MarineTraffic, VesselFinder, AISHub) */}
      <DashboardPanel
        title="Real-Time AIS Vessel Tracking Providers"
        description="Configure live vessel position data sources for the maritime map. When API keys are set, the LiveSeaRouteMap will use real AIS data instead of simulated positions."
      >
        <div className="space-y-4">
          {/* Provider Status Cards */}
          <DashboardGrid className="grid-cols-1 md:grid-cols-3">
            <StatsCard
              icon={<Radio className="w-4 h-4" />}
              title="MarineTraffic"
              value={data?.aisProviders?.marineTraffic.configured ? 'API Key Configured' : 'Not Configured'}
              subtitle={data?.aisProviders?.marineTraffic.maskedKey || 'Uses simulated data'}
              variant={data?.aisProviders?.marineTraffic.configured ? 'success' : 'info'}
              size="md"
            />
            <StatsCard
              icon={<Ship className="w-4 h-4" />}
              title="VesselFinder"
              value={data?.aisProviders?.vesselFinder.configured ? 'API Key Configured' : 'Not Configured'}
              subtitle={data?.aisProviders?.vesselFinder.maskedKey || 'Uses simulated data'}
              variant={data?.aisProviders?.vesselFinder.configured ? 'success' : 'info'}
              size="md"
            />
            <StatsCard
              icon={<Globe className="w-4 h-4" />}
              title="AISHub"
              value={data?.aisProviders?.aisHub.configured ? 'API Key Configured' : 'Not Configured'}
              subtitle={data?.aisProviders?.aisHub.maskedKey || 'Uses simulated data'}
              variant={data?.aisProviders?.aisHub.configured ? 'success' : 'info'}
              size="md"
            />
          </DashboardGrid>

          {/* AIS Credentials Form */}
          <div style={{padding: '24px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--panel)', display: 'flex', flexDirection: 'column', gap: '16px'}}>
            <p style={{fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px'}}>
              AIS Provider API Keys
            </p>
            <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px'}}>
              Enter your API keys for real-time vessel tracking. The map will fall back through providers in order: MarineTraffic → VesselFinder → AISHub → Simulated.
            </p>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
              <FormField label="MarineTraffic API Key" type="password" value={credentialsForm.marineTrafficApiKey} onChange={(e) => setCredentialsForm({ ...credentialsForm, marineTrafficApiKey: e.target.value })} placeholder={data?.aisProviders?.marineTraffic.configured ? 'Leave blank to keep current key' : 'Enter MarineTraffic API key'} size="small" />
              <FormField label="VesselFinder API Key" type="password" value={credentialsForm.vesselFinderApiKey} onChange={(e) => setCredentialsForm({ ...credentialsForm, vesselFinderApiKey: e.target.value })} placeholder={data?.aisProviders?.vesselFinder.configured ? 'Leave blank to keep current key' : 'Enter VesselFinder API key'} size="small" />
              <FormField label="AISHub API Key" type="password" value={credentialsForm.aisHubApiKey} onChange={(e) => setCredentialsForm({ ...credentialsForm, aisHubApiKey: e.target.value })} placeholder={data?.aisProviders?.aisHub.configured ? 'Leave blank to keep current key' : 'Enter AISHub API key'} size="small" />
            </div>

            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px'}}>
              <Button
                variant="primary"
                size="sm"
                icon={<Key className="w-4 h-4" />}
                loading={savingCredentials}
                onClick={async () => {
                  const payload: Record<string, string> = {};
                  if (credentialsForm.marineTrafficApiKey) payload.marineTrafficApiKey = credentialsForm.marineTrafficApiKey;
                  if (credentialsForm.vesselFinderApiKey) payload.vesselFinderApiKey = credentialsForm.vesselFinderApiKey;
                  if (credentialsForm.aisHubApiKey) payload.aisHubApiKey = credentialsForm.aisHubApiKey;
                  if (Object.keys(payload).length === 0) {
                    toast.info('Enter at least one API key to save');
                    return;
                  }
                  try {
                    setSavingCredentials(true);
                    const res = await fetch('/api/settings/tracking-apis', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload),
                    });
                    const result = await res.json();
                    if (!res.ok) throw new Error(result.message || 'Failed to save AIS keys');
                    toast.success('AIS provider API keys saved!');
                    await fetchStatus(true);
                  } catch (err: any) {
                    toast.error(err.message || 'Failed to save AIS keys');
                  } finally {
                    setSavingCredentials(false);
                  }
                }}
              >
                Save AIS API Keys
              </Button>
            </div>
          </div>
        </div>
      </DashboardPanel>

      {/* 4. Interactive Live Tracking Test Playground */}
      <DashboardPanel
        title="Live Tracking API Test Playground"
        description="Query live container numbers, inspect carrier responses, trace execution through the fallback pipeline, or test vessel AIS telematics."
      >
        <div className="space-y-4">
          {/* Target Selector Tabs */}
          <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
            {[
              { id: 'pipeline', label: '⚡ Production Pipeline (All Providers)' },
              { id: 'supabase-container', label: '📦 Supabase ContainerTracking' },
              { id: 'turkon', label: '🚢 Turkon Line Direct' },
              { id: 'pgl', label: '🌐 PGL System API' },
              { id: 'supabase-vessel', label: '⚓ Vessel AIS Position (IMO)' },
              { id: 'public-api', label: '🔑 Public Gateway API' },
            ].map((tab) => (
              <button type="button" key={tab.id} onClick={() => setTestTarget(tab.id as TestTarget)} style={{fontWeight: testTarget === tab.id ? 700 : 500, backgroundColor: testTarget === tab.id ? 'var(--accent-gold)' : 'var(--background)', color: testTarget === tab.id ? '#000' : 'var(--text-secondary)', border: '1px solid var(--border)'}} className="inline-flex items-center gap-1 rounded-full font-medium text-xs px-2.5 py-1 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">{tab.label}</button>
            ))}
          </div>

          {/* Quick-Pick Sample Container Chips */}
          <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'}}>
            <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600}}>
              Sample Numbers:
            </p>
            <button type="button" onClick={() => {
                setTrackingNumber('TRKU3019842');
                setTestTarget('pipeline');
              }} style={{fontSize: '0.75rem', fontFamily: 'monospace'}} className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">"TRKU3019842 (Turkon)"</button>
            <button type="button" onClick={() => {
                setTrackingNumber('UETU6059142');
                setTestTarget('pipeline');
              }} style={{fontSize: '0.75rem', fontFamily: 'monospace'}} className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">"UETU6059142 (PGL/Maersk)"</button>
            <button type="button" onClick={() => {
                setTrackingNumber('MSKU9876543');
                setTestTarget('pipeline');
              }} style={{fontSize: '0.75rem', fontFamily: 'monospace'}} className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">"MSKU9876543 (Maersk)"</button>
            {data?.recentContainers?.slice(0, 4).map((c) => (
              <button type="button" key={c.id} onClick={() => {
                  setTrackingNumber(c.containerNumber);
                  setTestTarget('pipeline');
                }} style={{fontSize: '0.75rem', fontFamily: 'monospace'}} className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">{`${c.containerNumber} (${c.shippingLine || 'DB'})`}</button>
            ))}
          </div>

          {/* Input & Execution Bar */}
          <div style={{display: 'flex', gap: '16px', flexDirection: 'row', alignItems: 'center'}}>
            {testTarget === 'supabase-vessel' ? (
              <div style={{flex: 1}}><FormField label="Vessel IMO Number" value={vesselImo} onChange={(e) => setVesselImo(e.target.value)} placeholder="e.g. 9811000" size="small" /></div>
            ) : (
              <div style={{flex: 1, fontFamily: 'monospace'}}><FormField label="Container / Tracking Number" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())} placeholder="e.g. TRKU3019842, UETU6059142" onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleRunTest();
                  }
                }} size="small" /></div>
            )}

            <Button
              variant="primary"
              size="md"
              icon={<Play className="w-4 h-4 fill-current" />}
              loading={runningTest}
              onClick={() => handleRunTest()}
            >
              Execute Test
            </Button>
          </div>

          {/* Test Results Section */}
          {testResult && (
            <div style={{marginTop: '24px', padding: '20px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', display: 'flex', flexDirection: 'column', gap: '16px'}}>
              {/* Result Status Bar */}
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                  {testResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  )}
                  <p style={{fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)'}}>
                    {testResult.success ? 'Query Succeeded' : 'Query Completed with Warning'}
                  </p>
                  <StatusBadge
                    status={testResult.success ? 'SUCCESS' : 'WARNING'}
                    label={`HTTP ${testResult.httpStatus || 200}`}
                    size="sm"
                  />
                  <span style={{fontSize: '0.75rem', fontWeight: 650}} className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">{`${testResult.latencyMs || 0} ms`}</span>
                  {testResult.detectedSource && (
                    <span style={{fontSize: '0.75rem', backgroundColor: 'rgba(var(--accent-gold-rgb), 0.1)', color: 'var(--accent-gold)'}} className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">{`Source: ${testResult.detectedSource}`}</span>
                  )}
                </div>

                <div style={{display: 'flex', gap: '8px'}}>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    onClick={handleCopyJson}
                  >
                    {copiedJson ? 'Copied' : 'Copy JSON'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={jsonExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    onClick={() => setJsonExpanded(!jsonExpanded)}
                  >
                    {jsonExpanded ? 'Collapse' : 'Inspect Raw JSON'}
                  </Button>
                </div>
              </div>

              {/* Message notice */}
              {testResult.message && (
                <p style={{fontSize: '0.84rem', color: 'var(--text-secondary)'}}>
                  {testResult.message}
                </p>
              )}

              {/* Formatted Snapshot Overview if present */}
              {(testResult.snapshot || testResult.unified) && (
                <div style={{padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--panel)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px'}}>
                  <div>
                    <p style={{fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase'}}>
                      Container #
                    </p>
                    <p style={{fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 650, fontFamily: 'monospace'}}>
                      {testResult.snapshot?.containerNumber || testResult.unified?.containerNumber || trackingNumber}
                    </p>
                  </div>

                  <div>
                    <p style={{fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase'}}>
                      Status
                    </p>
                    <p style={{fontSize: '0.9rem', color: 'var(--accent-gold)', fontWeight: 650}}>
                      {testResult.snapshot?.status || testResult.unified?.shipmentStatus || 'In Transit'}
                    </p>
                  </div>

                  <div>
                    <p style={{fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase'}}>
                      Vessel / Voyage
                    </p>
                    <p style={{fontSize: '0.9rem', color: 'var(--text-primary)'}}>
                      {testResult.snapshot?.vesselName || testResult.unified?.company?.name || 'N/A'} {testResult.snapshot?.voyageNumber ? `(${testResult.snapshot.voyageNumber})` : ''}
                    </p>
                  </div>

                  <div>
                    <p style={{fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase'}}>
                      Route (POL ➔ POD)
                    </p>
                    <p style={{fontSize: '0.85rem', color: 'var(--text-primary)'}}>
                      {[testResult.snapshot?.loadingPort || testResult.unified?.pol, testResult.snapshot?.destinationPort || testResult.unified?.pod].filter(Boolean).join(' ➔ ') || 'N/A'}
                    </p>
                  </div>
                </div>
              )}

              {/* Raw JSON Code Block */}
              {jsonExpanded && (
                <pre style={{padding: '16px', borderRadius: '8px', backgroundColor: '#0a0a0c', color: '#e4e4e7', fontSize: '0.8rem', fontFamily: 'monospace', overflowX: 'auto', maxHeight: '400px', border: '1px solid rgba(255,255,255,0.1)'}}>
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      </DashboardPanel>
    </div>
  );
}
