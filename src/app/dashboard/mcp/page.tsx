'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Bot,
  Check,
  Code2,
  Copy,
  Cpu,
  Database,
  Eye,
  EyeOff,
  ExternalLink,
  KeyRound,
  Layers,
  Lock,
  Play,
  PlugZap,
  RefreshCcw,
  RotateCw,
  Search as SearchIcon,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
  Unlock,
  Zap,
} from 'lucide-react';
import {
  PageHeader,
  Button,
  DashboardPageSkeleton,
  StatsCard,
  StatusBadge,
  toast,
} from '@/components/design-system';
import {
  DashboardGrid,
  DashboardPanel,
  DashboardSurface,
} from '@/components/dashboard/DashboardSurface';
import { hasPermission } from '@/lib/rbac';

type McpParameter = {
  name: string;
  type: string;
  required: boolean;
  description: string;
  defaultValue?: string;
};

type McpTool = {
  name: string;
  category: 'Search' | 'Tracking' | 'Operations' | 'Analytics' | 'Quotes';
  description: string;
  parameters: McpParameter[];
  sampleArgs: Record<string, any>;
};

type McpResource = {
  uri: string;
  name: string;
  mimeType: string;
  description: string;
};

type McpPrompt = {
  name: string;
  description: string;
  arguments: string[];
};

type McpLog = {
  id: string;
  feature: string;
  entityType: string | null;
  entityId: string | null;
  provider: string;
  model: string | null;
  prompt: string;
  response: string | null;
  status: string;
  createdAt: string;
};

type McpAdminPayload = {
  serverInfo: {
    name: string;
    version: string;
    protocolVersion: string;
    transports: string[];
  };
  settings: {
    enabled: boolean;
    apiKey: string;
    authMode: 'required' | 'optional';
    dataSource: 'database' | 'snapshot';
  };
  stats: {
    totalShipments: number;
    totalContainers: number;
    activeOceanContainers: number;
    yardOnHandShipments: number;
    shipmentsByStatus: Record<string, number>;
    containersByStatus: Record<string, number>;
    dataSource: string;
  };
  tools: McpTool[];
  resources: McpResource[];
  prompts: McpPrompt[];
  logs: McpLog[];
  endpoints: {
    production: {
      baseUrl: string;
      mcpStreamableHttp: string;
      openApiSpec: string;
      chatGptPluginManifest: string;
      simpleGeminiGateway: string;
      schemasEndpoint: string;
      searchVin: string;
      searchContainer: string;
      track: string;
    };
    current: {
      baseUrl: string;
      mcpStreamableHttp: string;
      openApiSpec: string;
      chatGptPluginManifest: string;
      simpleGeminiGateway: string;
    };
  };
};

type ActiveTab = 'playground' | 'connect' | 'security' | 'catalog';
type AgentPlatform = 'chatgpt' | 'gemini' | 'grok' | 'claude';

export default function McpDashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [data, setData] = useState<McpAdminPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('playground');
  const [selectedPlatform, setSelectedPlatform] = useState<AgentPlatform>('chatgpt');

  // Playground state
  const [selectedToolName, setSelectedToolName] = useState<string>('search_vin');
  const [toolArgs, setToolArgs] = useState<Record<string, any>>({
    vin: 'JTEBU5JR4A5011946',
    includeTracking: true,
  });
  const [executingTool, setExecutingTool] = useState(false);
  const [toolOutput, setToolOutput] = useState<{
    toolName: string;
    durationMs: number;
    summary: string;
    result: any;
  } | null>(null);

  // Security state
  const [showApiKey, setShowApiKey] = useState(false);
  const [rotatingKey, setRotatingKey] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const canAccessMcp =
    session?.user?.role === 'admin' ||
    hasPermission(session?.user?.role, 'shipments:read_all');

  const fetchMcpDashboard = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch('/api/mcp/admin', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to load MCP server state');
      }
      setData(json);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load MCP dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || !canAccessMcp) {
      router.replace('/dashboard');
      return;
    }
    void fetchMcpDashboard();
  }, [canAccessMcp, fetchMcpDashboard, router, session, status]);

  const handleSelectTool = (tool: McpTool) => {
    setSelectedToolName(tool.name);
    setToolArgs({ ...tool.sampleArgs });
  };

  const handleExecuteTool = async () => {
    try {
      setExecutingTool(true);
      const res = await fetch('/api/mcp/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute_tool',
          toolName: selectedToolName,
          args: toolArgs,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Tool execution failed');
      }
      setToolOutput({
        toolName: json.toolName,
        durationMs: json.durationMs,
        summary: json.summary,
        result: json.result,
      });
      if (json.logs && data) {
        setData({ ...data, logs: json.logs });
      }
      toast.success(`Executed ${selectedToolName} in ${json.durationMs}ms`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to execute MCP tool');
    } finally {
      setExecutingTool(false);
    }
  };

  const handleRotateKey = async () => {
    try {
      setRotatingKey(true);
      const res = await fetch('/api/mcp/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rotate_key' }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to rotate API key');
      }
      if (data) {
        setData({
          ...data,
          settings: { ...data.settings, ...json.settings },
        });
      }
      setShowApiKey(true);
      toast.success('Generated new MCP API key');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to rotate API key');
    } finally {
      setRotatingKey(false);
    }
  };

  const handleUpdateSettings = async (updates: {
    enabled?: boolean;
    authMode?: 'required' | 'optional';
  }) => {
    try {
      setSavingSettings(true);
      const res = await fetch('/api/mcp/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_settings',
          ...updates,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to update settings');
      }
      if (data) {
        setData({
          ...data,
          settings: { ...data.settings, ...json.settings },
        });
      }
      toast.success('MCP Gateway settings updated');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const copyToClipboard = async (text: string, id: string, label = 'Copied to clipboard') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success(label);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  if (status === 'loading' || loading || !data) {
    return <DashboardPageSkeleton />;
  }

  const selectedTool =
    data.tools.find((t) => t.name === selectedToolName) || data.tools[0];
  const apiKey = data.settings.apiKey;
  const maskedKey =
    apiKey.length > 14
      ? `${apiKey.slice(0, 10)}••••••••••••••••••••${apiKey.slice(-6)}`
      : '••••••••••••••••';
  const prodUrl = data.endpoints.production.baseUrl;

  return (
    <DashboardSurface>
      <PageHeader
        showBreadcrumbs
        title="MCP Server & AI Gateway"
        description="Manage your Model Context Protocol (MCP) server, API authentication keys, interactive tool playground, and 1-click integrations for ChatGPT, Google Gemini, xAI Grok, and Claude."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              status={data.settings.enabled ? 'success' : 'warning'}
              label={data.settings.enabled ? 'ACTIVE' : 'PAUSED'}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleUpdateSettings({ enabled: !data.settings.enabled })
              }
              disabled={savingSettings}
            >
              {data.settings.enabled ? 'Pause Gateway' : 'Enable Gateway'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />}
              onClick={() => {
                setRefreshing(true);
                void fetchMcpDashboard(true);
              }}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* Top KPI Cards */}
      <DashboardGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="MCP Server Status"
          value={data.settings.enabled ? 'Online' : 'Paused'}
          subtitle={`Protocol ${data.serverInfo.protocolVersion} • ${data.settings.dataSource.toUpperCase()}`}
          icon={<Server className="h-5 w-5" />}
          variant={data.settings.enabled ? 'success' : 'warning'}
        />
        <StatsCard
          title="Registered Capabilities"
          value={`${data.tools.length} Tools`}
          subtitle={`${data.resources.length} Resources • ${data.prompts.length} Prompts`}
          icon={<Cpu className="h-5 w-5" />}
          variant="default"
        />
        <StatsCard
          title="Indexed Logistics Data"
          value={`${data.stats.totalShipments.toLocaleString()} VINs`}
          subtitle={`${data.stats.totalContainers.toLocaleString()} Containers • ${data.stats.activeOceanContainers} Active`}
          icon={<Database className="h-5 w-5" />}
          variant="info"
        />
        <StatsCard
          title="Authentication Mode"
          value={data.settings.authMode === 'required' ? 'Protected' : 'Public Read'}
          subtitle="Bearer Key, X-API-Key & LoginCode"
          icon={<ShieldCheck className="h-5 w-5" />}
          variant={data.settings.authMode === 'required' ? 'success' : 'warning'}
        />
      </DashboardGrid>

      {/* Main Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-3">
        {[
          {
            id: 'playground',
            label: 'Interactive Tool Playground',
            icon: <Play className="h-4 w-4" />,
          },
          {
            id: 'connect',
            label: 'Connect AI Agents (ChatGPT, Gemini, Grok)',
            icon: <PlugZap className="h-4 w-4" />,
          },
          {
            id: 'security',
            label: 'API Keys & Authentication',
            icon: <KeyRound className="h-4 w-4" />,
          },
          {
            id: 'catalog',
            label: `Tools Catalog & Activity Logs (${data.logs.length})`,
            icon: <Layers className="h-4 w-4" />,
          },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                active
                  ? 'bg-[var(--accent-gold)] text-white shadow-sm'
                  : 'bg-[var(--panel)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--accent-gold)]/40 hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* =================================================================== */}
      {/* TAB 1: INTERACTIVE TOOL PLAYGROUND                                  */}
      {/* =================================================================== */}
      {activeTab === 'playground' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Tool Selector */}
          <div className="lg:col-span-4 space-y-4">
            <DashboardPanel
              title="Available MCP Tools (10)"
              description="Select any tool to test live queries against your logistics data."
            >
              <div className="space-y-2">
                {data.tools.map((tool) => {
                  const isSelected = tool.name === selectedToolName;
                  return (
                    <button
                      key={tool.name}
                      type="button"
                      onClick={() => handleSelectTool(tool)}
                      className={`w-full text-left rounded-xl p-3 border transition-all ${
                        isSelected
                          ? 'border-[var(--accent-gold)] bg-[rgba(var(--accent-gold-rgb),0.08)]'
                          : 'border-[var(--border)] bg-[var(--background)] hover:border-[var(--accent-gold)]/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">
                          {tool.name}()
                        </span>
                        <span className="rounded-md bg-[var(--panel)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] border border-[var(--border)]">
                          {tool.category}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--text-secondary)] line-clamp-2">
                        {tool.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </DashboardPanel>
          </div>

          {/* Right Column: Parameter Inputs & Execution Result */}
          <div className="lg:col-span-8 space-y-6">
            <DashboardPanel
              title={`Execute Tool: ${selectedTool.name}`}
              description={selectedTool.description}
              actions={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setToolArgs({ ...selectedTool.sampleArgs })}
                >
                  Load Sample Args
                </Button>
              }
            >
              <div className="space-y-4">
                {selectedTool.parameters.length === 0 ? (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 text-xs text-[var(--text-secondary)]">
                    This tool takes no input arguments. Click <strong>Run MCP Tool</strong> below to execute.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedTool.parameters.map((param) => (
                      <div key={param.name} className="space-y-1.5">
                        <label className="flex items-center justify-between text-xs font-semibold text-[var(--text-primary)]">
                          <span className="font-mono">
                            {param.name}
                            {param.required && (
                              <span className="ml-1 text-[var(--error)]">*</span>
                            )}
                          </span>
                          <span className="text-[10px] uppercase text-[var(--text-secondary)]">
                            {param.type}
                          </span>
                        </label>
                        {param.type === 'boolean' ? (
                          <select
                            value={String(toolArgs[param.name] ?? true)}
                            onChange={(e) =>
                              setToolArgs({
                                ...toolArgs,
                                [param.name]: e.target.value === 'true',
                              })
                            }
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gold)] focus:outline-none"
                          >
                            <option value="true">true</option>
                            <option value="false">false</option>
                          </select>
                        ) : (
                          <input
                            type={param.type === 'number' ? 'number' : 'text'}
                            value={toolArgs[param.name] ?? ''}
                            placeholder={param.description}
                            onChange={(e) =>
                              setToolArgs({
                                ...toolArgs,
                                [param.name]:
                                  param.type === 'number'
                                    ? Number(e.target.value)
                                    : e.target.value,
                              })
                            }
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gold)] focus:outline-none"
                          />
                        )}
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          {param.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                  <div className="text-xs text-[var(--text-secondary)] font-mono">
                    POST /api/mcp/admin → {selectedTool.name}
                  </div>
                  <Button
                    variant="primary"
                    icon={<Zap className="h-4 w-4" />}
                    onClick={handleExecuteTool}
                    disabled={executingTool}
                  >
                    {executingTool ? 'Running Tool...' : 'Run MCP Tool'}
                  </Button>
                </div>
              </div>
            </DashboardPanel>

            {/* Output Panel */}
            {toolOutput && (
              <DashboardPanel
                title={`Execution Output: ${toolOutput.toolName}`}
                description={toolOutput.summary}
                actions={
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-[rgba(var(--success-rgb),0.12)] px-2.5 py-1 text-xs font-semibold text-[var(--success)]">
                      {toolOutput.durationMs} ms
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={
                        copiedId === 'tool-output' ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )
                      }
                      onClick={() =>
                        copyToClipboard(
                          JSON.stringify(toolOutput.result, null, 2),
                          'tool-output',
                          'Copied JSON response'
                        )
                      }
                    >
                      Copy JSON
                    </Button>
                  </div>
                }
              >
                <pre className="max-h-[420px] overflow-auto rounded-xl border border-[var(--border)] bg-[#141619] p-4 font-mono text-xs text-emerald-300 leading-relaxed">
                  {JSON.stringify(toolOutput.result, null, 2)}
                </pre>
              </DashboardPanel>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: CONNECT AI AGENTS (CHATGPT, GEMINI, GROK, CLAUDE)            */}
      {/* =================================================================== */}
      {activeTab === 'connect' && (
        <div className="space-y-6">
          {/* Platform Selector Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                id: 'chatgpt',
                title: 'ChatGPT Plugin & Actions',
                subtitle: 'OpenAPI 3.1 + ai-plugin.json',
                badge: 'OpenAI',
              },
              {
                id: 'gemini',
                title: 'Simple Google Gemini',
                subtitle: '/api/gemini Function Calling',
                badge: 'Google AI',
              },
              {
                id: 'grok',
                title: 'xAI Grok 2 / Grok 3',
                subtitle: 'OpenAI-compatible tool schema',
                badge: 'xAI',
              },
              {
                id: 'claude',
                title: 'Claude / Cursor / Antigravity',
                subtitle: 'Streamable HTTP & Stdio MCP',
                badge: 'Native MCP',
              },
            ].map((item) => {
              const active = selectedPlatform === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedPlatform(item.id as AgentPlatform)}
                  className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
                    active
                      ? 'border-[var(--accent-gold)] bg-[rgba(var(--accent-gold-rgb),0.08)] shadow-sm'
                      : 'border-[var(--border)] bg-[var(--panel)] hover:border-[var(--accent-gold)]/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-[var(--background)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-gold)] border border-[var(--border)]">
                      {item.badge}
                    </span>
                    <Sparkles className="h-4 w-4 text-[var(--accent-gold)]" />
                  </div>
                  <div className="mt-3">
                    <div className="font-semibold text-sm text-[var(--text-primary)]">
                      {item.title}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {item.subtitle}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 1. CHATGPT CONFIGURATION */}
          {selectedPlatform === 'chatgpt' && (
            <DashboardPanel
              title="Connect with ChatGPT (Custom GPT Action & Plugin Manifest)"
              description="Create a Custom GPT or register as a ChatGPT Plugin using your production domain https://jacxishipping.com."
              actions={
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<ExternalLink className="h-3.5 w-3.5" />}
                    onClick={() => window.open('/openapi.json', '_blank')}
                  >
                    Preview openapi.json
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<ExternalLink className="h-3.5 w-3.5" />}
                    onClick={() =>
                      window.open('/.well-known/ai-plugin.json', '_blank')
                    }
                  >
                    Preview ai-plugin.json
                  </Button>
                </div>
              }
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    Method A: Custom GPT Actions (Recommended)
                  </h4>
                  <ol className="list-decimal list-inside space-y-2.5 text-sm text-[var(--text-primary)]">
                    <li>
                      Open <strong>ChatGPT</strong> → <strong>Explore GPTs</strong> →{' '}
                      <strong>Create a GPT</strong>.
                    </li>
                    <li>
                      Go to <strong>Configure</strong> → scroll down to{' '}
                      <strong>Actions</strong> → click <strong>Create new action</strong>.
                    </li>
                    <li>
                      Click <strong>Import from URL</strong> and paste your OpenAPI URL:
                    </li>
                  </ol>
                  <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-2.5">
                    <code className="text-xs font-mono text-[var(--text-primary)] truncate">
                      {prodUrl}/openapi.json
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Copy className="h-3.5 w-3.5" />}
                      onClick={() =>
                        copyToClipboard(
                          `${prodUrl}/openapi.json`,
                          'chatgpt-openapi',
                          'Copied OpenAPI URL'
                        )
                      }
                    >
                      Copy
                    </Button>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    4. Under <strong>Authentication</strong>, select{' '}
                    <strong>API Key</strong> → Auth Type: <strong>Bearer</strong>, and
                    paste your <code>MCP_API_KEY</code>.
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    Method B: Official Plugin Manifest (/.well-known/ai-plugin.json)
                  </h4>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Plugin stores and frameworks (ChatGPT Plugins, LibreChat, Dify,
                    LangChain, Flowise) automatically discover your plugin from:
                  </p>
                  <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-2.5">
                    <code className="text-xs font-mono text-[var(--text-primary)] truncate">
                      {prodUrl}/.well-known/ai-plugin.json
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Copy className="h-3.5 w-3.5" />}
                      onClick={() =>
                        copyToClipboard(
                          `${prodUrl}/.well-known/ai-plugin.json`,
                          'chatgpt-plugin',
                          'Copied Plugin Manifest URL'
                        )
                      }
                    >
                      Copy
                    </Button>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">
                        Bearer Token (MCP_API_KEY)
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Copy className="h-3.5 w-3.5" />}
                        onClick={() =>
                          copyToClipboard(apiKey, 'chatgpt-key', 'Copied API Key')
                        }
                      >
                        Copy Key
                      </Button>
                    </div>
                    <code className="block text-xs font-mono text-[var(--text-secondary)] break-all">
                      {showApiKey ? apiKey : maskedKey}
                    </code>
                  </div>
                </div>
              </div>
            </DashboardPanel>
          )}

          {/* 2. SIMPLE GEMINI CONFIGURATION */}
          {selectedPlatform === 'gemini' && (
            <DashboardPanel
              title="Connect with Simple Google Gemini (/api/gemini)"
              description="Plug-and-play Function Calling gateway for Google Gemini API, Google AI Studio, and Gemini Live."
              actions={
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Copy className="h-3.5 w-3.5" />}
                  onClick={() =>
                    copyToClipboard(
                      `import google.generativeai as genai\nimport requests\n\ngenai.configure(api_key="YOUR_GEMINI_API_KEY")\nAPI_URL = "${prodUrl}/api/gemini"\nHEADERS = {"Authorization": "Bearer ${apiKey}"}\n\ndef search_vin(vin: str, includeTracking: bool = True):\n    """Search for a vehicle shipment in Jacxi Shipping by VIN or lot number."""\n    return requests.post(API_URL, headers=HEADERS, json={"name": "search_vin", "args": {"vin": vin, "includeTracking": includeTracking}}).json()\n\ndef search_container(containerNumber: str, includeShipments: bool = True):\n    """Search for an ocean container by container number or booking ID."""\n    return requests.post(API_URL, headers=HEADERS, json={"name": "search_container", "args": {"containerNumber": containerNumber, "includeShipments": includeShipments}}).json()\n\nmodel = genai.GenerativeModel("gemini-1.5-pro", tools=[search_vin, search_container])\nchat = model.start_chat(enable_automatic_function_calling=True)\nprint(chat.send_message("Where is container CAAU5189072?").text)`,
                      'gemini-python',
                      'Copied Gemini Python code'
                    )
                  }
                >
                  Copy Python Code
                </Button>
              }
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3">
                  <div>
                    <div className="text-xs font-semibold text-[var(--text-primary)]">
                      Simple Gemini Endpoint URL
                    </div>
                    <code className="text-xs font-mono text-[var(--text-secondary)]">
                      {prodUrl}/api/gemini
                    </code>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Copy className="h-3.5 w-3.5" />}
                    onClick={() =>
                      copyToClipboard(
                        `${prodUrl}/api/gemini`,
                        'gemini-url',
                        'Copied Gemini Endpoint URL'
                      )
                    }
                  >
                    Copy URL
                  </Button>
                </div>

                <pre className="overflow-auto rounded-xl border border-[var(--border)] bg-[#141619] p-4 font-mono text-xs text-emerald-300 leading-relaxed">
{`import google.generativeai as genai
import requests

genai.configure(api_key="YOUR_GEMINI_API_KEY")

API_URL = "${prodUrl}/api/gemini"
HEADERS = {"Authorization": "Bearer ${showApiKey ? apiKey : maskedKey}"}

def search_vin(vin: str, includeTracking: bool = True):
    """Search for a vehicle shipment in Jacxi Shipping by VIN or lot number."""
    return requests.post(API_URL, headers=HEADERS, json={
        "name": "search_vin",
        "args": {"vin": vin, "includeTracking": includeTracking}
    }).json()

def search_container(containerNumber: str, includeShipments: bool = True):
    """Search for an ocean freight container by container number or booking ID."""
    return requests.post(API_URL, headers=HEADERS, json={
        "name": "search_container",
        "args": {"containerNumber": containerNumber, "includeShipments": includeShipments}
    }).json()

model = genai.GenerativeModel("gemini-1.5-pro", tools=[search_vin, search_container])
chat = model.start_chat(enable_automatic_function_calling=True)
response = chat.send_message("Where is container CAAU5189072 and what cars are inside?")
print(response.text)`}
                </pre>
              </div>
            </DashboardPanel>
          )}

          {/* 3. GROK CONFIGURATION */}
          {selectedPlatform === 'grok' && (
            <DashboardPanel
              title="Connect with xAI Grok (Grok 2 / Grok 3 API)"
              description="Use OpenAI-compatible tool definitions with xAI's API."
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3">
                  <div>
                    <div className="text-xs font-semibold text-[var(--text-primary)]">
                      Grok Tool Schemas Endpoint
                    </div>
                    <code className="text-xs font-mono text-[var(--text-secondary)]">
                      {prodUrl}/api/ai/schemas?format=grok
                    </code>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Copy className="h-3.5 w-3.5" />}
                    onClick={() =>
                      copyToClipboard(
                        `${prodUrl}/api/ai/schemas?format=grok`,
                        'grok-url',
                        'Copied Grok Schemas URL'
                      )
                    }
                  >
                    Copy URL
                  </Button>
                </div>

                <pre className="overflow-auto rounded-xl border border-[var(--border)] bg-[#141619] p-4 font-mono text-xs text-emerald-300 leading-relaxed">
{`import os, requests, json
from openai import OpenAI

client = OpenAI(api_key=os.environ["XAI_API_KEY"], base_url="https://api.x.ai/v1")
tools = requests.get("${prodUrl}/api/ai/schemas?format=grok").json()["tools"]

response = client.chat.completions.create(
    model="grok-beta",
    messages=[{"role": "user", "content": "Search VIN JTEBU5JR4A5011946 on Jacxi Shipping"}],
    tools=tools,
    tool_choice="auto"
)`}
                </pre>
              </div>
            </DashboardPanel>
          )}

          {/* 4. CLAUDE / CURSOR / ANTIGRAVITY NATIVE MCP */}
          {selectedPlatform === 'claude' && (
            <DashboardPanel
              title="Native MCP Configuration (Claude Desktop, Antigravity, Cursor)"
              description="Connect via Remote Streamable HTTP on Vercel or Local Stdio CLI."
              actions={
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Copy className="h-3.5 w-3.5" />}
                  onClick={() =>
                    copyToClipboard(
                      JSON.stringify(
                        {
                          mcpServers: {
                            jacxishipping: {
                              url: `${prodUrl}/api/mcp`,
                              headers: {
                                Authorization: `Bearer ${apiKey}`,
                              },
                            },
                          },
                        },
                        null,
                        2
                      ),
                      'mcp-remote-json',
                      'Copied mcp_config.json'
                    )
                  }
                >
                  Copy Remote Config
                </Button>
              }
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    Remote Vercel Streamable HTTP (mcp_config.json)
                  </div>
                  <pre className="overflow-auto rounded-xl border border-[var(--border)] bg-[#141619] p-4 font-mono text-xs text-emerald-300 leading-relaxed">
{`{
  "mcpServers": {
    "jacxishipping": {
      "url": "${prodUrl}/api/mcp",
      "headers": {
        "Authorization": "Bearer ${showApiKey ? apiKey : maskedKey}"
      }
    }
  }
}`}
                  </pre>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    Local Stdio Transport (Desktop CLI)
                  </div>
                  <pre className="overflow-auto rounded-xl border border-[var(--border)] bg-[#141619] p-4 font-mono text-xs text-emerald-300 leading-relaxed">
{`{
  "mcpServers": {
    "jacxishipping-local": {
      "command": "npm",
      "args": ["run", "mcp:server"],
      "env": {
        "MCP_API_KEY": "${showApiKey ? apiKey : maskedKey}"
      }
    }
  }
}`}
                  </pre>
                </div>
              </div>
            </DashboardPanel>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: API KEYS & AUTHENTICATION                                    */}
      {/* =================================================================== */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <DashboardPanel
              title="Master MCP API Key (MCP_API_KEY)"
              description="Used by ChatGPT Actions, Gemini, Grok, and remote MCP clients to authenticate requests."
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Active Secret Key
                    </div>
                    <div className="font-mono text-sm font-semibold text-[var(--text-primary)] break-all">
                      {showApiKey ? apiKey : maskedKey}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={
                        showApiKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )
                      }
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? 'Hide' : 'Reveal'}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Copy className="h-4 w-4" />}
                      onClick={() =>
                        copyToClipboard(apiKey, 'sec-key', 'API Key copied to clipboard')
                      }
                    >
                      Copy Key
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[var(--border)]">
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">
                      Rotate Master API Key
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      Generates a new cryptographically secure 256-bit key and immediately invalidates the previous key.
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={
                      <RotateCw
                        className={`h-4 w-4 ${rotatingKey ? 'animate-spin' : ''}`}
                      />
                    }
                    onClick={handleRotateKey}
                    disabled={rotatingKey}
                  >
                    {rotatingKey ? 'Rotating...' : 'Generate New Key'}
                  </Button>
                </div>
              </div>
            </DashboardPanel>

            <DashboardPanel
              title="Access Control Policy"
              description="Choose whether external AI agents must present a valid API key or customer login code."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleUpdateSettings({ authMode: 'required' })}
                  className={`flex flex-col rounded-xl border p-4 text-left transition-all ${
                    data.settings.authMode === 'required'
                      ? 'border-[var(--accent-gold)] bg-[rgba(var(--accent-gold-rgb),0.08)]'
                      : 'border-[var(--border)] bg-[var(--background)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Lock className="h-5 w-5 text-[var(--accent-gold)]" />
                    {data.settings.authMode === 'required' && (
                      <StatusBadge status="success" label="ACTIVE" />
                    )}
                  </div>
                  <div className="mt-3 font-semibold text-sm text-[var(--text-primary)]">
                    Strict Authentication (Recommended)
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    All MCP and AI endpoints require a valid Bearer token, X-API-Key header, or customer login code.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateSettings({ authMode: 'optional' })}
                  className={`flex flex-col rounded-xl border p-4 text-left transition-all ${
                    data.settings.authMode === 'optional'
                      ? 'border-[var(--accent-gold)] bg-[rgba(var(--accent-gold-rgb),0.08)]'
                      : 'border-[var(--border)] bg-[var(--background)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Unlock className="h-5 w-5 text-[var(--warning)]" />
                    {data.settings.authMode === 'optional' && (
                      <StatusBadge status="warning" label="ACTIVE" />
                    )}
                  </div>
                  <div className="mt-3 font-semibold text-sm text-[var(--text-primary)]">
                    Public Read Mode
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Allows public chatbots to query VIN and container tracking without requiring an API key header.
                  </p>
                </button>
              </div>
            </DashboardPanel>
          </div>

          <div className="lg:col-span-5">
            <DashboardPanel
              title="Supported Authentication Methods"
              description="Clients can pass the API key using any of these 4 standard methods:"
            >
              <div className="space-y-3 text-xs">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 space-y-1">
                  <div className="font-semibold text-[var(--text-primary)]">
                    1. HTTP Bearer Header (Standard for ChatGPT & MCP)
                  </div>
                  <code className="block font-mono text-[var(--text-secondary)]">
                    Authorization: Bearer {maskedKey}
                  </code>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 space-y-1">
                  <div className="font-semibold text-[var(--text-primary)]">
                    2. X-API-Key Header
                  </div>
                  <code className="block font-mono text-[var(--text-secondary)]">
                    X-API-Key: {maskedKey}
                  </code>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 space-y-1">
                  <div className="font-semibold text-[var(--text-primary)]">
                    3. URL Query Parameter (Simple Webhooks & cURL)
                  </div>
                  <code className="block font-mono text-[var(--text-secondary)]">
                    ?key={maskedKey}
                  </code>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 space-y-1">
                  <div className="font-semibold text-[var(--text-primary)]">
                    4. Customer 8-Character Login Code
                  </div>
                  <p className="text-[var(--text-secondary)]">
                    Customers can authenticate using their personal 8-character Jacxi{' '}
                    <code>loginCode</code>.
                  </p>
                </div>
              </div>
            </DashboardPanel>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: TOOLS CATALOG & ACTIVITY LOGS                                */}
      {/* =================================================================== */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          <DashboardPanel
            title="Recent MCP & AI Agent Activity Logs"
            description="Real-time audit trail of tool invocations across ChatGPT, Gemini, Grok, and the Playground."
          >
            {data.logs.length === 0 ? (
              <div className="py-8 text-center text-sm text-[var(--text-secondary)]">
                No MCP activity recorded yet. Run a tool in the Playground tab to see live logs.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Tool / Feature</th>
                      <th className="py-3 px-4">Source</th>
                      <th className="py-3 px-4">Query / Input</th>
                      <th className="py-3 px-4">Result Summary</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {data.logs.map((log) => (
                      <tr key={log.id} className="hover:bg-[var(--background)]/60">
                        <td className="py-3 px-4 text-xs text-[var(--text-secondary)] whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs font-semibold text-[var(--text-primary)]">
                          {log.model || log.feature}
                        </td>
                        <td className="py-3 px-4 text-xs text-[var(--text-secondary)]">
                          {log.provider}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-[var(--text-primary)] max-w-xs truncate">
                          {log.prompt}
                        </td>
                        <td className="py-3 px-4 text-xs text-[var(--text-secondary)]">
                          {log.response}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge
                            status={log.status === 'SUCCESS' ? 'success' : 'error'}
                            label={log.status}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DashboardPanel>

          {/* Resources & Prompts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DashboardPanel
              title="MCP Resources (3)"
              description="Read-only data streams exposed via the Model Context Protocol."
            >
              <div className="space-y-3">
                {data.resources.map((res) => (
                  <div
                    key={res.uri}
                    className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-[var(--text-primary)]">
                        {res.name}
                      </span>
                      <code className="text-xs font-mono text-[var(--accent-gold)]">
                        {res.uri}
                      </code>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {res.description}
                    </p>
                  </div>
                ))}
              </div>
            </DashboardPanel>

            <DashboardPanel
              title="MCP Prompt Templates (2)"
              description="Reusable prompt workflows for AI assistants."
            >
              <div className="space-y-3">
                {data.prompts.map((p) => (
                  <div
                    key={p.name}
                    className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                        /{p.name}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)]">
                        Args: {p.arguments.join(', ')}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {p.description}
                    </p>
                  </div>
                ))}
              </div>
            </DashboardPanel>
          </div>
        </div>
      )}
    </DashboardSurface>
  );
}

