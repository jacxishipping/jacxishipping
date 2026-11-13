'use client';


import { Suspense, useCallback, useEffect, useMemo, useState, type ReactNode, forwardRef, type CSSProperties, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { JXBox } from '@jacxishippingorg/jx-ui-react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  User, 
  Bell, 
  Palette, 
  Shield, 
  Activity, 
  Sun, 
  Moon, 
  Database, 
  RefreshCw, 
  UploadCloud,
  PhoneCall,
  ArrowRight,
  FileText,
  DollarSign,
  Bot,
  CheckCircle2,
  PlugZap,
  XCircle,
  Mail,
  MessageSquare,
  Monitor,
  Check,
  Maximize2,
  Minimize2,
  Send,
  Radio,
  Smartphone,
  Globe,
  Sparkles,
  Eye,
  Layers,
  Car,
  Clock,
} from 'lucide-react';
import { useTheme, type ThemeMode, type DensityMode } from '@/hooks/useTheme';

import { 
  DashboardSurface, 
  DashboardPanel, 
  DashboardGrid 
} from '@/components/dashboard/DashboardSurface';
import { Button, FormField, FormPageSkeleton, PageHeader, Select, StatsCard, StatusBadge, toast } from '@/components/design-system';
import {
  DEFAULT_SHIPPING_RATE_CONFIG,
  normalizeShippingRateConfig,
  US_STATES,
  type ShippingRateCalculatorConfig,
} from '@/lib/shipping-rate-calculator';
import { TrackingApisTab } from '@/components/dashboard/settings/TrackingApisTab';
import { BackupDatabaseTab } from '@/components/dashboard/settings/BackupDatabaseTab';
import { BrandingSettingsCard } from '@/components/dashboard/settings/BrandingSettingsCard';
import { GoogleVoiceLiveCallPanel } from '@/components/voice/GoogleVoiceLiveCallPanel';

/** Bare input with the Jacxi field look (no label) — search fields, table-cell editors. */
const BareInput = forwardRef<HTMLInputElement | HTMLTextAreaElement, BareInputProps>(function BareInput(
  { leftIcon, rightIcon, rightElement, error = false, helperText, size = 'small', multiline = false, rows, minRows, inputProps, className, style, ...rest },
  ref,
) {
  const controlClass = [
    'w-full rounded-lg border bg-[var(--background)] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-secondary)]',
    size === 'small' ? 'px-2.5 py-1.5 text-[0.8125rem]' : 'px-3 py-2 text-[0.875rem]',
    leftIcon ? 'pl-9' : '',
    rightIcon || rightElement ? 'pr-9' : '',
    error
      ? 'border-[var(--error)] focus:border-[var(--error)] focus:ring-2 focus:ring-[rgba(var(--error-rgb),0.2)]'
      : 'border-[rgba(var(--border-rgb),0.9)] hover:border-[var(--border)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.2)]',
    rest.disabled ? 'opacity-50' : '',
    className,
  ].filter(Boolean).join(' ');
  return (
    <div>
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 text-[var(--text-secondary)]">{leftIcon}</span>
        )}
        {multiline ? (
          <textarea
            {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            {...(inputProps as unknown as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            ref={ref as React.Ref<HTMLTextAreaElement>}
            rows={rows ?? minRows ?? 3}
            aria-invalid={error || undefined}
            style={style}
            className={`${controlClass} min-h-[80px] resize-y leading-[1.5]`}
          />
        ) : (
          <input
            {...rest}
            {...inputProps}
            ref={ref as React.Ref<HTMLInputElement>}
            aria-invalid={error || undefined}
            style={style}
            className={controlClass}
          />
        )}
        {rightIcon && (
          <span className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 text-[var(--text-secondary)]">{rightIcon}</span>
        )}
        {rightElement && (
          <span className="absolute right-3 top-1/2 flex -translate-y-1/2 text-[var(--text-secondary)]">{rightElement}</span>
        )}
      </div>
      {helperText && (
        <p className="mt-0.5 text-[0.75rem]" style={{ color: error ? 'var(--error)' : 'var(--text-secondary)' }}>{helperText}</p>
      )}
    </div>
  );
});

type BareInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  /** Interactive element on the right (e.g. password visibility toggle). */
  rightElement?: ReactNode;
  error?: boolean;
  helperText?: ReactNode;
  size?: 'small' | 'medium';
  multiline?: boolean;
  rows?: number;
  minRows?: number;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
};


const DEFAULT_SETTINGS = {
  theme: 'light',
  accentColor: 'var(--accent-gold)',
  sidebarDensity: 'comfortable',
  animationsEnabled: true,
  notifyShipmentEmail: true,
  notifyShipmentPush: true,
  notifyPaymentEmail: true,
  notifyCriticalSms: false,
  twoFactorEnabled: false,
  language: 'en',
  calculatorConfig: DEFAULT_SHIPPING_RATE_CONFIG,
};

const baseSettingsTabSlugs = ['profile', 'preferences', 'notifications', 'security'];
const adminSettingsTabSlugs = ['ai', 'communications', 'call-agent', 'price-calculator', 'tracking-apis'];

function TabPanel({ children, value, index }: { children: ReactNode; value: number; index: number }) {
  return (
    <div role="tabpanel" hidden={value !== index} id={`settings-tabpanel-${index}`} aria-labelledby={`settings-tab-${index}`}>
      {value === index && <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, paddingTop: '16px'}}>{children}</JXBox>}
    </div>
  );
}

type ProfileData = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  createdAt: string;
  updatedAt: string;
};

type UserSettingsData = {
  theme: string;
  accentColor: string;
  sidebarDensity: string;
  animationsEnabled: boolean;
  notifyShipmentEmail: boolean;
  notifyShipmentPush: boolean;
  notifyPaymentEmail: boolean;
  notifyCriticalSms: boolean;
  twoFactorEnabled: boolean;
  language: string;
  calculatorConfig: ShippingRateCalculatorConfig;
  createdAt: string;
  updatedAt: string;
};

type BackupInfo = {
  lastBackupAt: string | null;
  backupPath: string | null;
};

type BackupState = {
  loading: boolean;
  running: boolean;
  info: BackupInfo | null;
};

type AiConnectivityStatus = {
  provider: string;
  configured: boolean;
  enabled?: boolean;
  model: string;
  chatCompletionsUrl?: string;
  modelsUrl?: string;
  maxTokens?: number;
  temperature?: number;
  maskedApiKey?: string;
  lookbackHours: number;
  stats: {
    totalRuns: number;
    providerRuns: number;
    tokenRouterRuns: number;
    fallbackRuns: number;
    successRuns: number;
    failedRuns: number;
    successRate: number | null;
  };
  latestLog: {
    provider: string;
    model: string | null;
    status: string;
    createdAt: string;
  } | null;
  latestSuccess: {
    provider: string;
    model: string | null;
    createdAt: string;
  } | null;
  latestFailure: {
    provider: string;
    model: string | null;
    status: string;
    reason: string | null;
    createdAt: string;
  } | null;
};

type AiProviderSettingsData = {
  enabled: boolean;
  provider: string;
  apiKey: string;
  apiKeyMasked: string;
  apiKeyConfigured: boolean;
  apiKeyNeedsReset: boolean;
  chatCompletionsUrl: string;
  modelsUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
};

type CommunicationSettingsData = {
  emailEnabled: boolean;
  emailProvider: string;
  emailApiKey: string;
  emailApiKeyConfigured: boolean;
  emailApiKeyMasked: string;
  emailFromAddress: string;
  emailReplyToAddress: string;
  emailConfigured: boolean;
  smsEnabled: boolean;
  smsProvider: string;
  smsAccountSid: string;
  smsAuthToken: string;
  smsAuthTokenConfigured: boolean;
  smsAuthTokenMasked: string;
  smsFromNumber: string;
  smsMessagingServiceSid: string;
  smsConfigured: boolean;
  whatsappEnabled: boolean;
  whatsappProvider: 'meta_cloud' | 'twilio' | 'wa_me';
  whatsappPhoneNumberId: string;
  whatsappBusinessAccountId: string;
  whatsappAccessToken: string;
  whatsappAccessTokenConfigured: boolean;
  whatsappAccessTokenMasked: string;
  whatsappFromNumber: string;
  whatsappDefaultCountryCode: string;
  whatsappBusinessName: string;
  whatsappTemplateName: string;
  whatsappVerifiedBadge: boolean;
  whatsappConfigured: boolean;
};

type CallAgentSettingsData = {
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioApiKey: string;
  twilioApiSecret: string;
  twilioPhoneNumber: string;
  twilioPhoneNumberSid: string;
  geminiApiKey: string;
  geminiLiveApiKey: string;
  geminiVoiceModel: string;
  geminiLiveModel: string;
};

type CallAgentConfig = {
  urls: {
    preferredBaseUrl: string;
    configuredBaseUrl: string | null;
    detectedBaseUrl: string;
    source: 'NEXT_PUBLIC_APP_URL' | 'request';
    webhookUrl: string;
    websocketUrl: string;
    webhookMethod: 'POST';
  };
  status: {
    voiceWebhookTokenConfigured: boolean;
    geminiStandardConfigured: boolean;
    geminiLiveConfigured: boolean;
    geminiVoiceModel: string;
    geminiLiveModel: string;
    twilioAccountSidConfigured: boolean;
    twilioAuthTokenConfigured: boolean;
    twilioApiKeyConfigured: boolean;
    twilioApiSecretConfigured: boolean;
    twilioAuthMode: 'auth-token' | 'api-key' | 'missing';
    twilioConfigured: boolean;
    twilioPhoneNumberConfigured: boolean;
    twilioPhoneNumberSidConfigured: boolean;
  };
  twilioValues: Pick<CallAgentSettingsData, 'twilioAccountSid' | 'twilioAuthToken' | 'twilioApiKey' | 'twilioApiSecret' | 'twilioPhoneNumber' | 'twilioPhoneNumberSid'>;
  geminiValues: Pick<CallAgentSettingsData, 'geminiApiKey' | 'geminiLiveApiKey' | 'geminiVoiceModel' | 'geminiLiveModel'>;
  twilioInspection: {
    inspected: boolean;
    matchesExpectedWebhook: boolean | null;
    phoneNumber: string | null;
    target: string | null;
    voiceUrl: string | null;
    voiceMethod: string | null;
    error: string | null;
  };
};

const DEFAULT_CALL_AGENT_SETTINGS: CallAgentSettingsData = {
  twilioAccountSid: '',
  twilioAuthToken: '',
  twilioApiKey: '',
  twilioApiSecret: '',
  twilioPhoneNumber: '',
  twilioPhoneNumberSid: '',
  geminiApiKey: '',
  geminiLiveApiKey: '',
  geminiVoiceModel: 'gemini-2.5-flash',
  geminiLiveModel: 'gemini-3.1-flash-live-preview',
};

const DEFAULT_COMMUNICATION_SETTINGS: CommunicationSettingsData = {
  emailEnabled: false,
  emailProvider: 'resend',
  emailApiKey: '',
  emailApiKeyConfigured: false,
  emailApiKeyMasked: '',
  emailFromAddress: 'notifications@jacxishipping.com',
  emailReplyToAddress: 'support@jacxishipping.com',
  emailConfigured: false,
  smsEnabled: false,
  smsProvider: 'twilio',
  smsAccountSid: '',
  smsAuthToken: '',
  smsAuthTokenConfigured: false,
  smsAuthTokenMasked: '',
  smsFromNumber: '',
  smsMessagingServiceSid: '',
  smsConfigured: false,
  whatsappEnabled: true,
  whatsappProvider: 'wa_me',
  whatsappPhoneNumberId: '',
  whatsappBusinessAccountId: '',
  whatsappAccessToken: '',
  whatsappAccessTokenConfigured: false,
  whatsappAccessTokenMasked: '',
  whatsappFromNumber: '+93704117413',
  whatsappDefaultCountryCode: '+93',
  whatsappBusinessName: 'JACXI Shipping & Logistics',
  whatsappTemplateName: '',
  whatsappVerifiedBadge: true,
  whatsappConfigured: true,
};

const DEFAULT_AI_PROVIDER_SETTINGS: AiProviderSettingsData = {
  enabled: true,
  provider: 'tokenrouter-ai',
  apiKey: '',
  apiKeyMasked: '',
  apiKeyConfigured: false,
  apiKeyNeedsReset: false,
  chatCompletionsUrl: 'https://api.tokenrouter.com/v1/chat/completions',
  modelsUrl: 'https://api.tokenrouter.com/v1/models',
  model: 'MiniMax-M3',
  maxTokens: 500,
  temperature: 0.3,
};

const formatRelativeTime = (value?: string | null) => {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes <= 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString();
};

const parseJsonResponse = async (response: Response) => {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {
      message: text.startsWith('<!DOCTYPE')
        ? `Server returned an HTML error page with status ${response.status}`
        : text || `Request failed with status ${response.status}`,
    };
  }
};

function SettingsPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdmin = session?.user?.role === 'admin';
  const [activeTab, setActiveTab] = useState(0);
  const { 
    theme: currentTheme, 
    setTheme: setGlobalTheme,
    density: currentDensity,
    setDensity: setGlobalDensity
  } = useTheme();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', address: '', city: '', country: '' });
  const [settings, setSettings] = useState<UserSettingsData | null>(null);
  const [settingsForm, setSettingsForm] = useState(DEFAULT_SETTINGS);
  const [backupState, setBackupState] = useState<BackupState>({
    loading: true,
    running: false,
    info: null,
  });
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [ratePdfFile, setRatePdfFile] = useState<File | null>(null);
  const [rateConfig, setRateConfig] = useState<ShippingRateCalculatorConfig>(DEFAULT_SHIPPING_RATE_CONFIG);
  const [aiConnectivity, setAiConnectivity] = useState<AiConnectivityStatus | null>(null);
  const [aiProviderSettings, setAiProviderSettings] = useState<AiProviderSettingsData>(DEFAULT_AI_PROVIDER_SETTINGS);
  const [communicationSettings, setCommunicationSettings] = useState<CommunicationSettingsData>(DEFAULT_COMMUNICATION_SETTINGS);
  const [communicationTestTarget, setCommunicationTestTarget] = useState({ email: '', sms: '', whatsapp: '+93704117413' });
  const [callAgentConfig, setCallAgentConfig] = useState<CallAgentConfig | null>(null);
  const [callAgentSettings, setCallAgentSettings] = useState<CallAgentSettingsData>(DEFAULT_CALL_AGENT_SETTINGS);
  const [aiTestResult, setAiTestResult] = useState<{
    latencyMs: number;
    responsePreview: string;
    model: string;
    testedAt: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [savingRates, setSavingRates] = useState(false);
  const [importingRates, setImportingRates] = useState(false);
  const [refreshingAiConnectivity, setRefreshingAiConnectivity] = useState(false);
  const [testingAiConnectivity, setTestingAiConnectivity] = useState(false);
  const [savingAiProviderSettings, setSavingAiProviderSettings] = useState(false);
  const [savingCommunicationSettings, setSavingCommunicationSettings] = useState(false);
  const [testingCommunicationChannel, setTestingCommunicationChannel] = useState<'email' | 'sms' | 'whatsapp' | null>(null);
  const [savingCallAgentSettings, setSavingCallAgentSettings] = useState(false);

  // Milestone Alerts State
  const [milestoneConfig, setMilestoneConfig] = useState({
    enabled: true,
    enableWhatsApp: true,
    enableTelegram: false,
    enableSms: true,
    telegramBotToken: '',
    telegramChatId: '',
    whatsAppPhoneNumber: '',
    webhookUrl: '',
    customTemplates: {} as Record<string, string>,
  });
  const [defaultMilestoneTemplates, setDefaultMilestoneTemplates] = useState<any>({});
  const [savingMilestoneConfig, setSavingMilestoneConfig] = useState(false);
  const [testingMilestone, setTestingMilestone] = useState<string | null>(null);

  useEffect(() => {
    const slugs = isAdmin ? [...baseSettingsTabSlugs, ...adminSettingsTabSlugs] : baseSettingsTabSlugs;
    const tab = searchParams.get('tab');
    const resolvedTab = tab === 'branding' || tab === 'logo' ? 'preferences' : tab;
    const index = resolvedTab ? slugs.indexOf(resolvedTab) : -1;
    if (index >= 0 && index !== activeTab) setActiveTab(index);
  }, [activeTab, isAdmin, searchParams]);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.replace('/auth/signin?callbackUrl=/dashboard/settings');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const [profileRes, settingsRes, backupRes, aiConnectivityRes, aiProviderRes, communicationRes, callAgentRes, milestoneRes] = await Promise.all([
          fetch('/api/profile'),
          fetch('/api/settings'),
          isAdmin ? fetch('/api/settings/backup', { cache: 'no-store' }) : Promise.resolve(null),
          isAdmin ? fetch('/api/settings/ai-connectivity', { cache: 'no-store' }) : Promise.resolve(null),
          isAdmin ? fetch('/api/settings/ai-provider', { cache: 'no-store' }) : Promise.resolve(null),
          isAdmin ? fetch('/api/settings/communications', { cache: 'no-store' }) : Promise.resolve(null),
          isAdmin ? fetch('/api/settings/call-agent', { cache: 'no-store' }) : Promise.resolve(null),
          isAdmin ? fetch('/api/notifications/milestone-alerts', { cache: 'no-store' }) : Promise.resolve(null),
        ]);

        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile(data.user);
          setProfileForm({
            name: data.user.name ?? '',
            phone: data.user.phone ?? '',
            address: data.user.address ?? '',
            city: data.user.city ?? '',
            country: data.user.country ?? '',
          });
        }

        if (settingsRes.ok) {
          const data = await settingsRes.json();
          const values = data.settings;
          const calculatorConfig = normalizeShippingRateConfig(values.calculatorConfig);
          setSettings(values);
          setSettingsForm({
            theme: values.theme,
            accentColor: values.accentColor,
            sidebarDensity: values.sidebarDensity,
            animationsEnabled: values.animationsEnabled,
            notifyShipmentEmail: values.notifyShipmentEmail,
            notifyShipmentPush: values.notifyShipmentPush,
            notifyPaymentEmail: values.notifyPaymentEmail,
            notifyCriticalSms: values.notifyCriticalSms,
            twoFactorEnabled: values.twoFactorEnabled,
            language: values.language,
            calculatorConfig,
          });
          setRateConfig(calculatorConfig);
        }

        if (backupRes?.ok) {
          const data = await backupRes.json();
          setBackupState(prev => ({
            ...prev,
            info: {
              lastBackupAt: data.lastBackupAt ?? null,
              backupPath: data.backupPath ?? null,
            },
            loading: false
          }));
        } else {
          setBackupState(prev => ({
            ...prev,
            loading: false,
          }));
        }

        if (aiConnectivityRes?.ok) {
          const data = await aiConnectivityRes.json();
          setAiConnectivity(data);
        }

        if (aiProviderRes?.ok) {
          const data = await aiProviderRes.json();
          setAiProviderSettings({ ...DEFAULT_AI_PROVIDER_SETTINGS, ...data.settings });
        }

        if (communicationRes?.ok) {
          const data = await communicationRes.json();
          setCommunicationSettings({ ...DEFAULT_COMMUNICATION_SETTINGS, ...data.settings });
        }

        if (callAgentRes?.ok) {
          const data = await callAgentRes.json() as CallAgentConfig;
          setCallAgentConfig(data);
          setCallAgentSettings({
            ...DEFAULT_CALL_AGENT_SETTINGS,
            ...data.twilioValues,
            ...data.geminiValues,
          });
        }

        if (milestoneRes?.ok) {
          const data = await milestoneRes.json();
          if (data.config) setMilestoneConfig((prev) => ({ ...prev, ...data.config }));
          if (data.defaultTemplates) setDefaultMilestoneTemplates(data.defaultTemplates);
        }
      } catch (error) {
        console.error('Error fetching settings data:', error);
        toast.error('Failed to load settings data');
        setBackupState(prev => ({
          ...prev,
          loading: false,
        }));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAdmin, session, status, router]);

  const handleProfileFieldChange = (field: keyof typeof profileForm, value: string) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingProfile(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });
      if (!response.ok) throw new Error('Failed to update profile');
      const data = await response.json();
      setProfile(data.user);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error(error);
      toast.error('Unable to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const updateSettings = async (fields: Partial<typeof settingsForm>, successMessage: string) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      if (!response.ok) throw new Error('Failed to update settings');
      const data = await response.json();
      setSettings(data.settings);
      setSettingsForm(prev => ({ ...prev, ...fields }));
      toast.success(successMessage);
    } catch (error) {
      console.error(error);
      toast.error('Unable to update settings');
    }
  };

  const handleSavePreferences = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingPreferences(true);
    await updateSettings(
      {
        theme: settingsForm.theme,
        accentColor: settingsForm.accentColor,
        sidebarDensity: settingsForm.sidebarDensity,
        animationsEnabled: settingsForm.animationsEnabled,
        language: settingsForm.language,
      },
      'Preferences saved'
    );
    setSavingPreferences(false);
  };

  const handleSaveNotifications = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingNotifications(true);
    await updateSettings(
      {
        notifyShipmentEmail: settingsForm.notifyShipmentEmail,
        notifyShipmentPush: settingsForm.notifyShipmentPush,
        notifyPaymentEmail: settingsForm.notifyPaymentEmail,
        notifyCriticalSms: settingsForm.notifyCriticalSms,
      },
      'Notification preferences saved'
    );
    setSavingNotifications(false);
  };

  const handleToggleTwoFactor = async () => {
    setSavingSecurity(true);
    await updateSettings(
      { twoFactorEnabled: !settingsForm.twoFactorEnabled },
      settingsForm.twoFactorEnabled ? 'Two-factor authentication disabled' : 'Two-factor authentication enabled'
    );
    setSavingSecurity(false);
  };

  const handleCreateBackup = async () => {
    setBackupState(prev => ({ ...prev, running: true }));
    try {
      const response = await fetch('/api/settings/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'backup' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Failed to create backup');
      
      setBackupState(prev => ({
        ...prev,
        info: {
          lastBackupAt: data.lastBackupAt ?? prev.info?.lastBackupAt ?? null,
          backupPath: data.backupPath ?? prev.info?.backupPath ?? null,
        },
      }));
      toast.success('Backup created successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to create backup');
    } finally {
      setBackupState(prev => ({ ...prev, running: false }));
    }
  };

  const handleRestoreBackup = async () => {
    if (!backupFile) {
      toast.error('Please select a backup file');
      return;
    }
    
    setBackupState(prev => ({ ...prev, running: true }));
    try {
      const content = await backupFile.text();
      const response = await fetch('/api/settings/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', backupContent: content }),
      });
      
      if (!response.ok) throw new Error('Failed to restore backup');
      toast.success('Database restored successfully');
      setBackupFile(null);
    } catch (error) {
      console.error(error);
      toast.error('Failed to restore database');
    } finally {
      setBackupState(prev => ({ ...prev, running: false }));
    }
  };

  const handleRateConfigChange = <T extends keyof ShippingRateCalculatorConfig>(
    field: T,
    value: ShippingRateCalculatorConfig[T],
  ) => {
    setRateConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleStateRateChange = (stateCode: string, value: string) => {
    const parsed = Number(value);
    setRateConfig(prev => ({
      ...prev,
      stateRates: {
        ...prev.stateRates,
        [stateCode]: Number.isFinite(parsed) ? parsed : 0,
      },
    }));
  };

  const handleSaveRates = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingRates(true);
    try {
      const response = await fetch('/api/settings/shipping-rates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rateConfig),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Failed to save rate settings');
      setRateConfig(data.config);
      setSettingsForm(prev => ({ ...prev, calculatorConfig: data.config }));
      toast.success('Calculator rates saved');
    } catch (error) {
      console.error(error);
      toast.error('Unable to save calculator rates');
    } finally {
      setSavingRates(false);
    }
  };

  const handleImportRatesPdf = async () => {
    if (!ratePdfFile) {
      toast.error('Select a rate PDF first');
      return;
    }

    setImportingRates(true);
    try {
      const formData = new FormData();
      formData.append('file', ratePdfFile);
      const response = await fetch('/api/settings/shipping-rates/import-pdf', {
        method: 'POST',
        body: formData,
      });
      const data = await parseJsonResponse(response);
      if (!response.ok) throw new Error(data?.message || 'Failed to import PDF rates');
      setRateConfig(data.config);
      setSettingsForm(prev => ({ ...prev, calculatorConfig: data.config }));
      setRatePdfFile(null);
      toast.success(`Imported ${data.importedAuctionRateCount || data.importedCount} rates from PDF`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Unable to import PDF rates');
    } finally {
      setImportingRates(false);
    }
  };

  const refreshAiConnectivity = async (showToastOnError = true) => {
    try {
      setRefreshingAiConnectivity(true);
      const response = await fetch('/api/settings/ai-connectivity', { cache: 'no-store' });
      const data = await parseJsonResponse(response);
      if (!response.ok) throw new Error(data?.message || 'Failed to load AI connectivity');
      setAiConnectivity(data);
      return true;
    } catch (error) {
      if (showToastOnError) {
        toast.error(error instanceof Error ? error.message : 'Unable to refresh AI connectivity');
      }
      return false;
    } finally {
      setRefreshingAiConnectivity(false);
    }
  };

  const handleTestAiConnectivity = async () => {
    try {
      setTestingAiConnectivity(true);
      const response = await fetch('/api/settings/ai-connectivity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await parseJsonResponse(response);

      if (!response.ok) {
        if (data?.status) setAiConnectivity(data.status);
        throw new Error(data?.message || 'AI connectivity test failed');
      }

      setAiConnectivity(data.status);
      setAiTestResult({
        latencyMs: data.latencyMs,
        responsePreview: data.responsePreview,
        model: data.model,
        testedAt: new Date().toISOString(),
      });
      toast.success('AI connectivity test passed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'AI connectivity test failed');
    } finally {
      setTestingAiConnectivity(false);
    }
  };

  const handleAiProviderFieldChange = <T extends keyof AiProviderSettingsData>(
    field: T,
    value: AiProviderSettingsData[T],
  ) => {
    setAiProviderSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveAiProviderSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSavingAiProviderSettings(true);
      const response = await fetch('/api/settings/ai-provider', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: aiProviderSettings.enabled,
          provider: aiProviderSettings.provider,
          apiKey: aiProviderSettings.apiKey,
          chatCompletionsUrl: aiProviderSettings.chatCompletionsUrl,
          modelsUrl: aiProviderSettings.modelsUrl,
          model: aiProviderSettings.model,
          maxTokens: Number(aiProviderSettings.maxTokens),
          temperature: Number(aiProviderSettings.temperature),
        }),
      });
      const data = await parseJsonResponse(response);
      if (!response.ok) throw new Error(data?.message || 'Failed to save AI provider settings');
      setAiProviderSettings({ ...DEFAULT_AI_PROVIDER_SETTINGS, ...data.settings });
      await refreshAiConnectivity(false);
      toast.success('AI provider settings saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save AI provider settings');
    } finally {
      setSavingAiProviderSettings(false);
    }
  };

  const handleCommunicationFieldChange = <T extends keyof CommunicationSettingsData>(
    field: T,
    value: CommunicationSettingsData[T],
  ) => {
    setCommunicationSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveCommunicationSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSavingCommunicationSettings(true);
      const response = await fetch('/api/settings/communications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailEnabled: communicationSettings.emailEnabled,
          emailProvider: communicationSettings.emailProvider,
          emailApiKey: communicationSettings.emailApiKey,
          emailFromAddress: communicationSettings.emailFromAddress,
          emailReplyToAddress: communicationSettings.emailReplyToAddress,
          smsEnabled: communicationSettings.smsEnabled,
          smsProvider: communicationSettings.smsProvider,
          smsAccountSid: communicationSettings.smsAccountSid,
          smsAuthToken: communicationSettings.smsAuthToken,
          smsFromNumber: communicationSettings.smsFromNumber,
          smsMessagingServiceSid: communicationSettings.smsMessagingServiceSid,
          whatsappEnabled: communicationSettings.whatsappEnabled,
          whatsappProvider: communicationSettings.whatsappProvider,
          whatsappPhoneNumberId: communicationSettings.whatsappPhoneNumberId,
          whatsappBusinessAccountId: communicationSettings.whatsappBusinessAccountId,
          whatsappAccessToken: communicationSettings.whatsappAccessToken,
          whatsappFromNumber: communicationSettings.whatsappFromNumber,
          whatsappDefaultCountryCode: communicationSettings.whatsappDefaultCountryCode,
          whatsappBusinessName: communicationSettings.whatsappBusinessName,
          whatsappTemplateName: communicationSettings.whatsappTemplateName,
          whatsappVerifiedBadge: communicationSettings.whatsappVerifiedBadge,
        }),
      });
      const data = await parseJsonResponse(response);
      if (!response.ok) throw new Error(data?.message || 'Failed to save communication settings');
      setCommunicationSettings({ ...DEFAULT_COMMUNICATION_SETTINGS, ...data.settings });
      toast.success('Communication settings saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save communication settings');
    } finally {
      setSavingCommunicationSettings(false);
    }
  };

  const handleTestCommunication = async (channel: 'email' | 'sms' | 'whatsapp') => {
    const to = communicationTestTarget[channel].trim();
    if (!to) {
      toast.error(channel === 'email' ? 'Enter a test email address' : 'Enter a test phone number');
      return;
    }

    try {
      setTestingCommunicationChannel(channel);
      const response = await fetch('/api/settings/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, to }),
      });
      const data = await parseJsonResponse(response);
      if (!response.ok) throw new Error(data?.message || 'Communication test failed');
      if (channel === 'whatsapp' && data.deliveryMode === 'wa_me_deep_link' && data.waMeUrl) {
        window.open(data.waMeUrl, '_blank', 'noopener,noreferrer');
        toast.success('Opened WhatsApp Business test message');
      } else {
        toast.success(`${channel === 'whatsapp' ? 'WhatsApp Business' : channel === 'email' ? 'Email' : 'SMS'} test sent`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Communication test failed');
    } finally {
      setTestingCommunicationChannel(null);
    }
  };

  const handleCallAgentFieldChange = <T extends keyof CallAgentSettingsData>(
    field: T,
    value: CallAgentSettingsData[T],
  ) => {
    setCallAgentSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveCallAgentSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSavingCallAgentSettings(true);
      const response = await fetch('/api/settings/call-agent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(callAgentSettings),
      });
      const data = await parseJsonResponse(response);
      if (!response.ok) throw new Error(data?.message || 'Failed to save live call agent settings');

      const config = data as CallAgentConfig;
      setCallAgentConfig(config);
      setCallAgentSettings({
        ...DEFAULT_CALL_AGENT_SETTINGS,
        ...config.twilioValues,
        ...config.geminiValues,
      });
      toast.success('Live call agent settings saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save live call agent settings');
    } finally {
      setSavingCallAgentSettings(false);
    }
  };

  const handleSaveMilestoneConfig = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingMilestoneConfig(true);
    try {
      const res = await fetch('/api/notifications/milestone-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_config',
          config: milestoneConfig,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save milestone alert configuration.');
      }

      toast.success('Shipment Milestone Alert settings saved successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Could not save milestone settings.');
    } finally {
      setSavingMilestoneConfig(false);
    }
  };

  const handleTestMilestoneTrigger = async (milestone: string, customerPhone?: string) => {
    setTestingMilestone(milestone);
    try {
      const res = await fetch('/api/notifications/milestone-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'trigger',
          milestone,
          customerPhone: customerPhone || communicationTestTarget.sms || '+15555555555',
          customerName: 'Ahmad Al-Mansoor',
          vehicleInfo: '2023 Mercedes-Benz GLE 450',
          vin: '4JGFF5KE7PA194821',
          lotNumber: '58291048',
          containerNumber: 'MSKU9048123',
          vesselName: 'MAERSK VOYAGER',
          originPort: 'Port of Newark (USNWK)',
          destinationPort: 'Port of Jebel Ali (AEJEA)',
          etaDate: 'Oct 15, 2026',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Test trigger failed.');
      }

      const successfulDispatches = (data.dispatches || []).filter((d: any) => d.success).map((d: any) => d.channel);
      if (successfulDispatches.length > 0) {
        toast.success(`Milestone alert sent via: ${successfulDispatches.join(', ')}`);
      } else {
        toast.warning('Milestone simulated (check channel credentials).');
      }
    } catch (err: any) {
      toast.error(err.message || 'Milestone test dispatch failed.');
    } finally {
      setTestingMilestone(null);
    }
  };

  const notificationSummary = useMemo(() => {
    const channels = [];
    if (settingsForm.notifyShipmentEmail || settingsForm.notifyPaymentEmail) channels.push('Email');
    if (settingsForm.notifyShipmentPush) channels.push('Push');
    if (settingsForm.notifyCriticalSms) channels.push('SMS');
    return channels.length ? channels.join(' + ') : 'Disabled';
  }, [settingsForm]);

  const settingsTabs = useMemo(() => {
    const tabs = [
      { label: 'Profile', icon: <User className="h-4 w-4" /> },
      { label: 'Preferences', icon: <Palette className="h-4 w-4" /> },
      { label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
      { label: isAdmin ? 'Security & Backup' : 'Security', icon: <Shield className="h-4 w-4" /> },
    ];

    if (isAdmin) {
      tabs.push(
        { label: 'AI', icon: <Bot className="h-4 w-4" /> },
        { label: 'Communications', icon: <Mail className="h-4 w-4" /> },
        { label: 'Call Agent', icon: <PhoneCall className="h-4 w-4" /> },
        { label: 'Price Calculator', icon: <DollarSign className="h-4 w-4" /> },
        { label: 'Tracking APIs', icon: <Radio className="h-4 w-4" /> },
      );
    }

    return tabs;
  }, [isAdmin]);

  if (status === 'loading' || loading) {
    return <FormPageSkeleton />;
  }

  return (
    <DashboardSurface>
      <PageHeader 
        showBreadcrumbs
        title={isAdmin ? 'Admin Settings' : 'Settings'} 
        description={isAdmin ? 'Manage your profile, preferences, and system configuration' : 'Manage your profile, preferences, and account settings'}
      />

      <JXBox padding="none" border={false} style={{position: 'sticky', top: '0px', zIndex: 15, border: '1px solid var(--border)', borderRadius: '12px', backgroundColor: 'var(--panel)', boxShadow: '0 12px 28px rgba(var(--text-primary-rgb),0.08)', overflow: 'hidden'}}>
        <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-[var(--border)]">
          {settingsTabs.map((tab, index) => (
            <button
              key={tab.label}
              type="button"
              role="tab"
              id={`settings-tab-${index}`}
              aria-selected={activeTab === index}
              aria-controls={`settings-tabpanel-${index}`}
              onClick={() => { const newValue = index; setActiveTab(newValue);
            const slugs = isAdmin ? [...baseSettingsTabSlugs, ...adminSettingsTabSlugs] : baseSettingsTabSlugs;
            const nextParams = new URLSearchParams(searchParams.toString());
            nextParams.set('tab', slugs[newValue] || slugs[0]);
            router.replace(`?${nextParams.toString()}`, { scroll: false }); }}
              className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === index ? 'border-[var(--accent-gold)] text-[var(--accent-gold-text)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        
        </div>
      </JXBox>

      {/* Tab 0: Profile */}
      <TabPanel value={activeTab} index={0}>
        <div className="space-y-6">
          <DashboardGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              icon={<Shield style={{ fontSize: 18 }} />}
              title="Security Score"
              value={settingsForm.twoFactorEnabled ? '92%' : '68%'}
              variant={settingsForm.twoFactorEnabled ? 'success' : 'warning'}
              size="md"
            />
            <StatsCard
              icon={<Bell style={{ fontSize: 18 }} />}
              title="Notifications"
              value={settingsForm.notifyShipmentEmail ? 'Active' : 'Paused'}
              subtitle={notificationSummary}
              variant="info"
              size="md"
            />
            <StatsCard
              icon={isAdmin ? <Activity style={{ fontSize: 18 }} /> : <Palette style={{ fontSize: 18 }} />}
              title={isAdmin ? 'Last Backup' : 'Theme'}
              value={isAdmin ? (backupState.info?.lastBackupAt ? new Date(backupState.info.lastBackupAt).toLocaleDateString() : 'None') : settingsForm.theme}
              variant={isAdmin ? (backupState.info?.lastBackupAt ? 'success' : 'error') : 'default'}
              size="md"
            />
            <StatsCard
              icon={<User style={{ fontSize: 18 }} />}
              title="Profile Status"
              value={profile?.name ? 'Complete' : 'Incomplete'}
              variant="default"
              size="md"
            />
          </DashboardGrid>

          <DashboardPanel 
            title="Profile & Identity" 
            description="Update your personal information"
          >
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="Full Name"
                  value={profileForm.name}
                  onChange={(e) => handleProfileFieldChange('name', e.target.value)}
                  placeholder="John Doe"
                />
                <FormField
                  label="Phone Number"
                  value={profileForm.phone}
                  onChange={(e) => handleProfileFieldChange('phone', e.target.value)}
                  placeholder="+1 234 567 8900"
                />
                <FormField
                  label="Address"
                  value={profileForm.address}
                  onChange={(e) => handleProfileFieldChange('address', e.target.value)}
                  placeholder="123 Main St"
                />
                <FormField
                  label="City"
                  value={profileForm.city}
                  onChange={(e) => handleProfileFieldChange('city', e.target.value)}
                  placeholder="New York"
                />
                <FormField
                  label="Country"
                  value={profileForm.country}
                  onChange={(e) => handleProfileFieldChange('country', e.target.value)}
                  placeholder="USA"
                />
                <FormField
                  label="Email"
                  value={session?.user?.email ?? ''}
                  disabled
                  helperText="Contact admin to change email"
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={savingProfile} variant="primary">
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </form>
          </DashboardPanel>
        </div>
      </TabPanel>

      {/* Tab 1: Preferences */}
      <TabPanel value={activeTab} index={1}>
        <div className="max-w-4xl space-y-6">
          <BrandingSettingsCard canEdit={isAdmin} />

          {/* Live Interactive Visual Preview Studio */}
          <DashboardPanel
            title={
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[var(--accent-gold)]" />
                  <span>Live Interface Preview</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-[rgba(var(--accent-gold-rgb),0.15)] text-[var(--accent-gold)] border border-[rgba(var(--accent-gold-rgb),0.3)] uppercase tracking-wider">
                    {settingsForm.theme || currentTheme} mode
                  </span>
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-[var(--background)] text-[var(--text-secondary)] border border-[var(--border)] capitalize">
                    {settingsForm.sidebarDensity || currentDensity} scale
                  </span>
                </div>
              </div>
            }
            description="Real-time preview of your selected theme, density scale, and typography"
          >
            <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--background)] space-y-4">
              {/* Preview Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Sample Stats Card */}
                <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-sm">
                  <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1">
                    <span className="font-semibold uppercase tracking-wider text-[10px]">Active Freight</span>
                    <Car className="w-4 h-4 text-[var(--accent-gold)]" />
                  </div>
                  <div className="text-xl font-black text-[var(--text-primary)]">
                    42 Vehicles
                  </div>
                  <div className="text-xs text-emerald-600 font-medium mt-0.5">
                    ↑ 18% vs last month
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-sm">
                  <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1">
                    <span className="font-semibold uppercase tracking-wider text-[10px]">Total Revenue</span>
                    <DollarSign className="w-4 h-4 text-[var(--info)]" />
                  </div>
                  <div className="text-xl font-black text-[var(--text-primary)]">
                    $148,500.00
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                    12 pending invoices
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-sm">
                  <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1">
                    <span className="font-semibold uppercase tracking-wider text-[10px]">Container ETA</span>
                    <Clock className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-xl font-black text-[var(--text-primary)]">
                    4 On Water
                  </div>
                  <div className="text-xs text-amber-500 font-medium mt-0.5">
                    Jebel Ali Port in 6 days
                  </div>
                </div>
              </div>

              {/* Sample Table Row Preview */}
              <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--panel)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[rgba(var(--accent-gold-rgb),0.12)] border border-[rgba(var(--accent-gold-rgb),0.3)] flex items-center justify-center text-[var(--accent-gold)] font-bold text-xs">
                    VIN
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                      2024 Lexus RX 350 Premium
                    </div>
                    <div className="text-[11px] font-mono text-[var(--text-secondary)]">
                      JTJ11BKZ0R204891 • Lot #8492019
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <StatusBadge status="IN_TRANSIT" size="sm" />
                  <span className="text-xs font-bold text-[var(--accent-gold)] px-2 py-1 rounded bg-[rgba(var(--accent-gold-rgb),0.08)] border border-[rgba(var(--accent-gold-rgb),0.2)]">
                    $4,250.00
                  </span>
                  <button
                    type="button"
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] hover:border-[var(--accent-gold)] transition-colors"
                  >
                    Quick Peek
                  </button>
                </div>
              </div>
            </div>
          </DashboardPanel>

          {/* Preferences Configuration Form */}
          <DashboardPanel 
            title="Interface & Layout Customization" 
            description="Adjust your theme, display density, motion animations, and regional options"
          >
            <form onSubmit={handleSavePreferences} className="space-y-6">
              {/* Visual Theme Selector */}
              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2.5">
                  Theme Appearance
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'light',
                      name: 'Light Mode',
                      desc: 'Clean daylight enterprise view with soft gray backgrounds',
                      icon: Sun,
                    },
                    {
                      id: 'dark',
                      name: 'Dark Mode',
                      desc: 'Deep high contrast for low-light environments and long shifts',
                      icon: Moon,
                    },
                    {
                      id: 'system',
                      name: 'System Default',
                      desc: 'Automatically synchronizes with your device operating system setting',
                      icon: Monitor,
                    },
                  ].map((item) => {
                    const isSelected = (settingsForm.theme || currentTheme) === item.id;
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSettingsForm((prev) => ({ ...prev, theme: item.id }));
                          setGlobalTheme(item.id as ThemeMode);
                        }}
                        className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? 'border-[var(--accent-gold)] bg-[var(--panel)] shadow-md ring-2 ring-[var(--accent-gold)]/20'
                            : 'border-[var(--border)] bg-[var(--panel)] hover:border-[var(--accent-gold)]/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div
                            className={`p-2 rounded-lg ${
                              isSelected
                                ? 'bg-[var(--accent-gold)] text-white'
                                : 'bg-[var(--background)] text-[var(--text-secondary)]'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-[var(--accent-gold)] text-white flex items-center justify-center">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-bold text-[var(--text-primary)]">
                          {item.name}
                        </span>
                        <span className="text-xs text-[var(--text-secondary)] mt-1">
                          {item.desc}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Visual UI Density & Layout Selector */}
              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2.5">
                  Layout Density & Theme Scale
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: 'comfortable',
                      name: 'Comfort Theme (Relaxed / 8px)',
                      desc: 'Spacious 16-24px padding, standard row heights, and optimal readability across all screens',
                      icon: Maximize2,
                      tag: 'Standard',
                    },
                    {
                      id: 'compact',
                      name: 'Compact Theme (High-Density / 5px)',
                      desc: 'Condensed 4-8px table cells, tighter card margins, and maximum visible data for fleet dispatchers',
                      icon: Minimize2,
                      tag: 'Power Users',
                    },
                  ].map((item) => {
                    const isSelected = (settingsForm.sidebarDensity || currentDensity) === item.id;
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSettingsForm((prev) => ({ ...prev, sidebarDensity: item.id }));
                          setGlobalDensity(item.id as DensityMode);
                        }}
                        className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? 'border-[var(--accent-gold)] bg-[var(--panel)] shadow-md ring-2 ring-[var(--accent-gold)]/20'
                            : 'border-[var(--border)] bg-[var(--panel)] hover:border-[var(--accent-gold)]/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div
                              className={`p-2 rounded-lg ${
                                isSelected
                                  ? 'bg-[var(--accent-gold)] text-white'
                                  : 'bg-[var(--background)] text-[var(--text-secondary)]'
                              }`}
                            >
                              <Icon className="w-5 h-5" />
                            </div>
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[var(--background)] text-[var(--text-secondary)] border border-[var(--border)]">
                              {item.tag}
                            </span>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-[var(--accent-gold)] text-white flex items-center justify-center">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-bold text-[var(--text-primary)]">
                          {item.name}
                        </span>
                        <span className="text-xs text-[var(--text-secondary)] mt-1">
                          {item.desc}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Motion & Transition Behavior */}
              <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--background)] flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[var(--panel)] border border-[var(--border)] text-[var(--accent-gold)]">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[var(--text-primary)] block">
                      Smooth Motion & Inertia Transitions
                    </span>
                    <span className="text-xs text-[var(--text-secondary)] block mt-0.5">
                      Enables Lenis smooth scrolling, subtle card lifts, and micro-animations for interactive elements.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settingsForm.animationsEnabled}
                  onClick={() => setSettingsForm(prev => ({ ...prev, animationsEnabled: !(settingsForm.animationsEnabled) }))}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${settingsForm.animationsEnabled ? 'bg-[var(--accent-gold)]' : 'bg-[var(--border)]'} disabled:opacity-50`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${settingsForm.animationsEnabled ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
              
              {/* Regional & Language Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Display Language"
                  value={settingsForm.language}
                  onChange={(value) => setSettingsForm(prev => ({ ...prev, language: String(value) }))}
                  options={[
                    { value: 'en', label: 'English (US)' },
                    { value: 'ar', label: 'Arabic (العربية)' },
                    { value: 'fr', label: 'French (Français)' },
                  ]}
                />
                <Select
                  label="Default Workspace"
                  value="/dashboard"
                  onChange={() => {}}
                  options={[
                    { value: '/dashboard', label: 'Overview / KPI Dashboard' },
                    { value: '/dashboard/shipments', label: 'Shipments Fleet' },
                    { value: '/dashboard/operations', label: 'Operations Command Board' },
                    { value: '/dashboard/containers', label: 'Ocean Containers' },
                    { value: '/dashboard/finance', label: 'Accounting & Ledgers' },
                  ]}
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                <span className="text-xs text-[var(--text-secondary)]">
                  Preferences are stored in your secure account profile.
                </span>
                <Button type="submit" disabled={savingPreferences} variant="primary">
                  {savingPreferences ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>
            </form>
          </DashboardPanel>
        </div>
      </TabPanel>

      {/* Tab 2: Notifications */}
      <TabPanel value={activeTab} index={2}>
        <div className="max-w-3xl">
          <DashboardPanel 
            title="Notification Rules" 
            description="Manage your alert preferences — configure per-channel and per-event type"
          >
            <form onSubmit={handleSaveNotifications} className="space-y-5">
              {/* Channel Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--background)]">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-500/10 text-blue-500">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[var(--text-primary)]">Email</div>
                    <div className="text-[10px] text-[var(--text-secondary)]">
                      {['notifyShipmentEmail', 'notifyPaymentEmail'].filter(k => settingsForm[k as keyof typeof settingsForm]).length}/2 enabled
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--background)]">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-500/10 text-amber-500">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[var(--text-primary)]">Push</div>
                    <div className="text-[10px] text-[var(--text-secondary)]">
                      {settingsForm.notifyShipmentPush ? '1/1 enabled' : '0/1 enabled'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--background)]">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-500">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[var(--text-primary)]">SMS</div>
                    <div className="text-[10px] text-[var(--text-secondary)]">
                      {settingsForm.notifyCriticalSms ? '1/1 enabled' : '0/1 enabled'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Email Events */}
              <div className="rounded-lg border border-[var(--border)] overflow-hidden">
                <div className="px-4 py-2.5 bg-[var(--background)] border-b border-[var(--border)] flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-semibold text-[var(--text-primary)]">Email Notifications</span>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {[
                    { key: 'notifyShipmentEmail', label: 'Shipment Updates', desc: 'Status changes, dispatch, transit, and delivery events' },
                    { key: 'notifyPaymentEmail', label: 'Payment Reminders', desc: 'Invoice due dates, overdue notices, and payment confirmations' },
                    { key: 'notifyMilestoneEmail', label: 'Milestone Alerts', desc: 'Key container milestones and tracking events' },
                    { key: 'notifyDocumentEmail', label: 'Document Updates', desc: 'New documents, photos, or damage reports added' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between px-4 py-3 hover:bg-[var(--background)]/50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-relaxed font-semibold text-[var(--text-primary)]">
                          {item.label}
                        </p>
                        <span className="text-xs text-[var(--text-secondary)] text-[var(--text-secondary)]">
                          {item.desc}
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={!!(settingsForm[item.key as keyof typeof settingsForm] ?? false)}
                          onChange={() => setSettingsForm(prev => ({
                            ...prev,
                            [item.key]: !prev[item.key as keyof typeof settingsForm],
                          }))}
                        />
                        <div className="w-9 h-5 rounded-full peer bg-[var(--border)] peer-checked:bg-blue-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Push Events */}
              <div className="rounded-lg border border-[var(--border)] overflow-hidden">
                <div className="px-4 py-2.5 bg-[var(--background)] border-b border-[var(--border)] flex items-center gap-2">
                  <Bell className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-semibold text-[var(--text-primary)]">Push Notifications</span>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {[
                    { key: 'notifyShipmentPush', label: 'Shipment Updates', desc: 'Real-time status changes and workflow events' },
                    { key: 'notifyTrackingPush', label: 'Tracking Events', desc: 'Container tracking milestones and AIS position updates' },
                    { key: 'notifyPaymentPush', label: 'Payment Alerts', desc: 'Payment confirmations and invoice status changes' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between px-4 py-3 hover:bg-[var(--background)]/50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-relaxed font-semibold text-[var(--text-primary)]">
                          {item.label}
                        </p>
                        <span className="text-xs text-[var(--text-secondary)] text-[var(--text-secondary)]">
                          {item.desc}
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={!!(settingsForm[item.key as keyof typeof settingsForm] ?? false)}
                          onChange={() => setSettingsForm(prev => ({
                            ...prev,
                            [item.key]: !prev[item.key as keyof typeof settingsForm],
                          }))}
                        />
                        <div className="w-9 h-5 rounded-full peer bg-[var(--border)] peer-checked:bg-amber-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* SMS Events */}
              <div className="rounded-lg border border-[var(--border)] overflow-hidden">
                <div className="px-4 py-2.5 bg-[var(--background)] border-b border-[var(--border)] flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-semibold text-[var(--text-primary)]">SMS Notifications</span>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {[
                    { key: 'notifyCriticalSms', label: 'Critical Alerts', desc: 'Urgent issues requiring immediate attention' },
                    { key: 'notifyShipmentSms', label: 'Shipment SMS', desc: 'Key shipment status milestones via text message' },
                    { key: 'notifyPaymentSms', label: 'Payment SMS', desc: 'Payment confirmations and overdue reminders' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between px-4 py-3 hover:bg-[var(--background)]/50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-relaxed font-semibold text-[var(--text-primary)]">
                          {item.label}
                        </p>
                        <span className="text-xs text-[var(--text-secondary)] text-[var(--text-secondary)]">
                          {item.desc}
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={!!(settingsForm[item.key as keyof typeof settingsForm] ?? false)}
                          onChange={() => setSettingsForm(prev => ({
                            ...prev,
                            [item.key]: !prev[item.key as keyof typeof settingsForm],
                          }))}
                        />
                        <div className="w-9 h-5 rounded-full peer bg-[var(--border)] peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={savingNotifications} variant="primary">
                  {savingNotifications ? 'Saving...' : 'Save Rules'}
                </Button>
              </div>
            </form>
          </DashboardPanel>
        </div>
      </TabPanel>

      {/* Tab 3: Security & Backup */}
      <TabPanel value={activeTab} index={3}>
        <div className="space-y-6">
          <DashboardPanel 
            title="Account Security" 
            description="Manage authentication and account security controls"
          >
            <div className="p-4 border border-[var(--border)] rounded-lg bg-[var(--background)]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">Two-Factor Authentication</p>
                <Button 
                  variant={settingsForm.twoFactorEnabled ? 'primary' : 'outline'} 
                  size="sm"
                  onClick={handleToggleTwoFactor}
                  disabled={savingSecurity}
                >
                  {settingsForm.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
              <span className="text-xs text-[var(--text-secondary)] text-[var(--text-secondary)]">
                {isAdmin ? 'Require authenticator verification for admin dashboard sign-in.' : 'Require extra verification for your account sign-in.'}
              </span>
            </div>
          </DashboardPanel>

          {isAdmin && <BackupDatabaseTab />}
        </div>
      </TabPanel>

      {/* Tab 4: AI Connectivity */}
      <TabPanel value={activeTab} index={4}>
      {isAdmin ? (
        <DashboardPanel
          title="AI Connectivity"
          description="TokenRouter provider status, recent usage, fallbacks, and a live connectivity test."
          actions={
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
              <Button
                variant="outline"
                size="sm"
                icon={<RefreshCw className="w-4 h-4" />}
                onClick={() => void refreshAiConnectivity()}
                loading={refreshingAiConnectivity}
              >
                Refresh
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<PlugZap className="w-4 h-4" />}
                onClick={() => void handleTestAiConnectivity()}
                loading={testingAiConnectivity}
              >
                Test AI
              </Button>
            </JXBox>
          }
        >
          <div className="space-y-4">
            <JXBox padding="none" border={false} component="form" onSubmit={handleSaveAiProviderSettings} style={{padding: '16px', border: '1px solid var(--border)', borderRadius: '16px', backgroundColor: 'var(--background)', display: 'flex', flexDirection: 'column', gap: '16px'}}>
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between', gap: '16px'}} className="items-start md:items-center flex-col md:flex-row">
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                  <p className="text-sm leading-relaxed" style={{fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)'}}>
                    Editable AI Provider
                  </p>
                  <p className="text-sm leading-relaxed" style={{fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px'}}>
                    These values power dashboard AI, document extraction, OCR, and price-list parsing. Environment variables are only used as fallback defaults.
                  </p>
                </JXBox>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <p className="text-sm leading-relaxed" style={{fontSize: '0.82rem', color: 'var(--text-secondary)'}}>
                    {aiProviderSettings.enabled ? 'Enabled' : 'Disabled'}
                  </p>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={aiProviderSettings.enabled}
                    disabled={savingAiProviderSettings}
                    onClick={() => handleAiProviderFieldChange('enabled', !(aiProviderSettings.enabled))}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${aiProviderSettings.enabled ? 'bg-[var(--accent-gold)]' : 'bg-[var(--border)]'} disabled:opacity-50`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${aiProviderSettings.enabled ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </JXBox>
              </JXBox>

              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px'}} className="grid-cols-1 md:grid-cols-2">
                <FormField label="Provider" value={aiProviderSettings.provider} onChange={(event) => handleAiProviderFieldChange('provider', event.target.value)} disabled={savingAiProviderSettings} size="small" />
                <FormField label="Model" value={aiProviderSettings.model} onChange={(event) => handleAiProviderFieldChange('model', event.target.value)} disabled={savingAiProviderSettings} size="small" />
                <FormField label="API Key" type="password" value={aiProviderSettings.apiKey} onChange={(event) => handleAiProviderFieldChange('apiKey', event.target.value)} placeholder={aiProviderSettings.apiKeyConfigured ? `Saved: ${aiProviderSettings.apiKeyMasked}` : 'Paste API key'} helperText={
                    aiProviderSettings.apiKeyNeedsReset
                      ? 'Stored key cannot be decrypted with the current app secret. Paste the API key again and save.'
                      : aiProviderSettings.apiKeyConfigured
                      ? 'Leave blank to keep the saved encrypted key.'
                      : 'Saved encrypted using the app secret.'
                  } disabled={savingAiProviderSettings} size="small" />
                <FormField label="Max Tokens" type="number" value={aiProviderSettings.maxTokens} onChange={(event) => handleAiProviderFieldChange('maxTokens', Number(event.target.value))} inputProps={{ min: 1, max: 4000 }} disabled={savingAiProviderSettings} size="small" />
                <FormField label="Chat Completions URL" value={aiProviderSettings.chatCompletionsUrl} onChange={(event) => handleAiProviderFieldChange('chatCompletionsUrl', event.target.value)} disabled={savingAiProviderSettings} size="small" />
                <FormField label="Models URL" value={aiProviderSettings.modelsUrl} onChange={(event) => handleAiProviderFieldChange('modelsUrl', event.target.value)} disabled={savingAiProviderSettings} size="small" />
                <FormField label="Temperature" type="number" value={aiProviderSettings.temperature} onChange={(event) => handleAiProviderFieldChange('temperature', Number(event.target.value))} inputProps={{ min: 0, max: 2, step: 0.1 }} disabled={savingAiProviderSettings} size="small" />
              </JXBox>

              {aiProviderSettings.apiKeyNeedsReset ? (
                <JXBox padding="none" border={false} style={{border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '16px', backgroundColor: 'rgba(245, 158, 11, 0.12)', paddingLeft: '12px', paddingRight: '12px', paddingTop: '8px', paddingBottom: '8px'}}>
                  <p className="text-sm leading-relaxed" style={{fontSize: '0.8rem', fontWeight: 700, color: 'rgb(146, 64, 14)'}}>
                    AI key needs reset
                  </p>
                  <p className="text-sm leading-relaxed" style={{fontSize: '0.78rem', color: 'rgb(146, 64, 14)'}}>
                    The saved AI API key cannot be decrypted in this environment. Re-enter the key in the API Key field and save.
                  </p>
                </JXBox>
              ) : null}

              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap'}}>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={savingAiProviderSettings}
                  icon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Save AI Settings
                </Button>
              </JXBox>
            </JXBox>

            <DashboardGrid className="grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
              <StatsCard
                icon={aiConnectivity?.configured ? <CheckCircle2 style={{ fontSize: 18 }} /> : <XCircle style={{ fontSize: 18 }} />}
                title="TokenRouter"
                value={aiConnectivity?.configured ? 'Configured' : 'Needs Setup'}
                subtitle={aiConnectivity?.model || 'MiniMax-M3'}
                variant={aiConnectivity?.configured ? 'success' : 'error'}
                size="md"
              />
              <StatsCard
                icon={<Bot style={{ fontSize: 18 }} />}
                title="24h AI Runs"
                value={aiConnectivity ? String(aiConnectivity.stats.providerRuns) : '0'}
                subtitle={`${aiConnectivity?.stats.tokenRouterRuns ?? 0} TokenRouter`}
                variant="info"
                size="md"
              />
              <StatsCard
                icon={<Activity style={{ fontSize: 18 }} />}
                title="24h Success"
                value={aiConnectivity?.stats.successRate === null || aiConnectivity?.stats.successRate === undefined ? 'No Runs' : `${aiConnectivity.stats.successRate}%`}
                subtitle={`${aiConnectivity?.stats.failedRuns ?? 0} failed`}
                variant={(aiConnectivity?.stats.failedRuns ?? 0) > 0 ? 'warning' : 'success'}
                size="md"
              />
              <StatsCard
                icon={<RefreshCw style={{ fontSize: 18 }} />}
                title="Fallbacks"
                value={aiConnectivity ? String(aiConnectivity.stats.fallbackRuns) : '0'}
                subtitle={`Last ${aiConnectivity?.lookbackHours ?? 24} hours`}
                variant={(aiConnectivity?.stats.fallbackRuns ?? 0) > 0 ? 'warning' : 'default'}
                size="md"
              />
            </DashboardGrid>

            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px'}} className="grid-cols-1 grid lg:grid-cols-[1fr_1fr]">
              <JXBox padding="none" border={false} style={{padding: '16px', border: '1px solid var(--border)', borderRadius: '16px', backgroundColor: 'var(--background)'}}>
                <p className="text-sm leading-relaxed" style={{fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)', marginBottom: '8px'}}>
                  Latest activity
                </p>
                <p className="text-sm leading-relaxed" style={{fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)'}}>
                  {aiConnectivity?.latestLog
                    ? `${aiConnectivity.latestLog.provider} · ${aiConnectivity.latestLog.status}`
                    : 'No AI activity logged yet'}
                </p>
                <p className="text-sm leading-relaxed" style={{fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '6px'}}>
                  {aiConnectivity?.latestLog
                    ? `${aiConnectivity.latestLog.model || 'Unknown model'} · ${formatRelativeTime(aiConnectivity.latestLog.createdAt)}`
                    : 'Run a dashboard brief, document extraction, shipment draft, or connectivity test to create a log.'}
                </p>
              </JXBox>

              {aiConnectivity?.latestFailure?.reason && (
                <JXBox padding="none" border={false} style={{padding: '16px', border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: '16px', backgroundColor: 'rgba(245, 158, 11, 0.08)'}} className="col-start-1 lg:col-span-full">
                  <p className="text-sm leading-relaxed" style={{fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgb(146, 64, 14)', marginBottom: '6px'}}>
                    Latest AI failure reason
                  </p>
                  <p className="text-sm leading-relaxed" style={{fontSize: '0.88rem', color: 'rgb(146, 64, 14)'}}>
                    {aiConnectivity.latestFailure.reason}
                  </p>
                </JXBox>
              )}

              <JXBox padding="none" border={false} style={{padding: '16px', border: '1px solid var(--border)', borderRadius: '16px', backgroundColor: 'var(--background)'}}>
                <p className="text-sm leading-relaxed" style={{fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)', marginBottom: '8px'}}>
                  Last test result
                </p>
                <p className="text-sm leading-relaxed" style={{fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)'}}>
                  {aiTestResult ? `${aiTestResult.latencyMs} ms · ${aiTestResult.model}` : 'No test run this session'}
                </p>
                <p className="text-sm leading-relaxed" style={{fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '6px'}}>
                  {aiTestResult
                    ? `${aiTestResult.responsePreview} · ${formatRelativeTime(aiTestResult.testedAt)}`
                    : aiConnectivity?.configured
                      ? 'Use Test AI to verify live provider connectivity.'
                      : 'Save an API key in Settings > AI to enable live testing.'}
                </p>
              </JXBox>
            </JXBox>
          </div>
        </DashboardPanel>
      ) : null}
      </TabPanel>

      {/* Tab 5: Communications */}
      <TabPanel value={activeTab} index={5}>
      {isAdmin ? (
        <DashboardPanel
          title="Communications & WhatsApp Business Hub"
          description="Configure official WhatsApp Business (Meta Cloud API / Twilio / Direct wa.me), Email, and SMS providers for customer notifications."
          actions={
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
              <Button
                variant="outline"
                size="sm"
                icon={<MessageSquare className="w-4 h-4 text-emerald-500" />}
                onClick={() => void handleTestCommunication('whatsapp')}
                loading={testingCommunicationChannel === 'whatsapp'}
                disabled={!communicationSettings.whatsappEnabled}
              >
                Test WhatsApp
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<Mail className="w-4 h-4" />}
                onClick={() => void handleTestCommunication('email')}
                loading={testingCommunicationChannel === 'email'}
                disabled={!communicationSettings.emailConfigured}
              >
                Test Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<Smartphone className="w-4 h-4" />}
                onClick={() => void handleTestCommunication('sms')}
                loading={testingCommunicationChannel === 'sms'}
                disabled={!communicationSettings.smsConfigured}
              >
                Test SMS
              </Button>
            </JXBox>
          }
        >
          <JXBox padding="none" border={false} component="form" onSubmit={handleSaveCommunicationSettings} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '24px'}}>
            <DashboardGrid className="grid-cols-1 md:grid-cols-3">
              <StatsCard
                icon={communicationSettings.whatsappConfigured ? <CheckCircle2 style={{ fontSize: 18 }} /> : <XCircle style={{ fontSize: 18 }} />}
                title="WhatsApp Business"
                value={communicationSettings.whatsappEnabled ? (communicationSettings.whatsappProvider === 'meta_cloud' ? 'Meta Cloud API' : communicationSettings.whatsappProvider === 'twilio' ? 'Twilio WhatsApp' : 'Direct wa.me Hub') : 'Disabled'}
                subtitle={communicationSettings.whatsappFromNumber || '+93 70 411 7413'}
                variant={communicationSettings.whatsappConfigured ? 'success' : 'warning'}
                size="md"
              />
              <StatsCard
                icon={communicationSettings.emailConfigured ? <CheckCircle2 style={{ fontSize: 18 }} /> : <XCircle style={{ fontSize: 18 }} />}
                title="Email Provider"
                value={communicationSettings.emailConfigured ? 'Configured' : 'Needs Setup'}
                subtitle={communicationSettings.emailProvider}
                variant={communicationSettings.emailConfigured ? 'success' : 'warning'}
                size="md"
              />
              <StatsCard
                icon={communicationSettings.smsConfigured ? <CheckCircle2 style={{ fontSize: 18 }} /> : <XCircle style={{ fontSize: 18 }} />}
                title="SMS Provider"
                value={communicationSettings.smsConfigured ? 'Configured' : 'Needs Setup'}
                subtitle={communicationSettings.smsProvider}
                variant={communicationSettings.smsConfigured ? 'success' : 'warning'}
                size="md"
              />
            </DashboardGrid>

            {/* WhatsApp Business Hub Configuration Card */}
            <JXBox padding="none" border={false} style={{padding: '20px', border: '1px solid rgba(16, 185, 129, 0.35)', borderRadius: '16px', backgroundColor: 'var(--background)'}}>
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '16px'}} className="items-start md:items-center flex-col md:flex-row">
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                  <p className="text-sm leading-relaxed" style={{fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <MessageSquare className="w-4 h-4 text-emerald-500" />
                    WhatsApp Business Integration
                  </p>
                  <p className="text-sm leading-relaxed" style={{fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px'}}>
                    Powers the multi-lingual WhatsApp Business Studio, signed PDF document sharing, and automated milestone dispatches.
                  </p>
                </JXBox>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <p className="text-sm leading-relaxed" style={{fontSize: '0.82rem', color: 'var(--text-secondary)'}}>
                    {communicationSettings.whatsappEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={communicationSettings.whatsappEnabled}
                    disabled={savingCommunicationSettings}
                    onClick={() => handleCommunicationFieldChange('whatsappEnabled', !(communicationSettings.whatsappEnabled))}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${communicationSettings.whatsappEnabled ? 'bg-[var(--accent-gold)]' : 'bg-[var(--border)]'} disabled:opacity-50`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${communicationSettings.whatsappEnabled ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </JXBox>
              </JXBox>

              {/* Provider Mode Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
                {[
                  {
                    id: 'wa_me',
                    title: 'Direct WhatsApp App / Web (wa.me)',
                    desc: 'Instant 1-click launch into WhatsApp Business Desktop or Mobile with E.164 formatting',
                  },
                  {
                    id: 'meta_cloud',
                    title: 'Meta WhatsApp Cloud API (v21.0)',
                    desc: 'Official Graph API server-side dispatch using your Meta WABA & Phone Number ID',
                  },
                  {
                    id: 'twilio',
                    title: 'Twilio WhatsApp Business API',
                    desc: 'Automated server-side WhatsApp messaging using your Twilio WhatsApp sender',
                  },
                ].map((mode) => {
                  const isSel = communicationSettings.whatsappProvider === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => handleCommunicationFieldChange('whatsappProvider', mode.id as any)}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        isSel
                          ? 'border-emerald-500 bg-emerald-500/10 shadow-xs'
                          : 'border-[var(--border)] bg-[var(--panel)] hover:border-emerald-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-[var(--text-primary)]">{mode.title}</span>
                        {isSel && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] leading-snug">{mode.desc}</p>
                    </button>
                  );
                })}
              </div>

              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px'}} className="grid-cols-1 md:grid-cols-3">
                <FormField label="Business Display Name" value={communicationSettings.whatsappBusinessName} onChange={(event) => handleCommunicationFieldChange('whatsappBusinessName', event.target.value)} placeholder="JACXI Shipping & Logistics" disabled={savingCommunicationSettings} size="small" />
                <FormField label="WhatsApp Business Sender Number" value={communicationSettings.whatsappFromNumber} onChange={(event) => handleCommunicationFieldChange('whatsappFromNumber', event.target.value)} placeholder="+93704117413" disabled={savingCommunicationSettings} size="small" />
                <FormField label="Default Country Code (E.164)" value={communicationSettings.whatsappDefaultCountryCode} onChange={(event) => handleCommunicationFieldChange('whatsappDefaultCountryCode', event.target.value)} placeholder="+93" helperText="Used when normalizing local numbers (e.g. +93, +971, +1)" disabled={savingCommunicationSettings} size="small" />

                {communicationSettings.whatsappProvider === 'meta_cloud' && (
                  <>
                    <FormField label="Meta Phone Number ID" value={communicationSettings.whatsappPhoneNumberId} onChange={(event) => handleCommunicationFieldChange('whatsappPhoneNumberId', event.target.value)} placeholder="109283746510293" disabled={savingCommunicationSettings} size="small" />
                    <FormField label="WhatsApp Business Account ID (WABA)" value={communicationSettings.whatsappBusinessAccountId} onChange={(event) => handleCommunicationFieldChange('whatsappBusinessAccountId', event.target.value)} placeholder="203948576192834" disabled={savingCommunicationSettings} size="small" />
                    <FormField label="Meta Permanent Access Token" type="password" value={communicationSettings.whatsappAccessToken} onChange={(event) => handleCommunicationFieldChange('whatsappAccessToken', event.target.value)} placeholder={
                        communicationSettings.whatsappAccessTokenConfigured
                          ? `Saved: ${communicationSettings.whatsappAccessTokenMasked}`
                          : 'EAA...'
                      } helperText={
                        communicationSettings.whatsappAccessTokenConfigured
                          ? 'Leave blank to keep encrypted token.'
                          : 'Encrypted at rest using app secret.'
                      } disabled={savingCommunicationSettings} size="small" />
                  </>
                )}

                <FormField label="Test WhatsApp Recipient Phone" value={communicationTestTarget.whatsapp} onChange={(event) => setCommunicationTestTarget((prev) => ({ ...prev, whatsapp: event.target.value }))} placeholder="+93704117413" size="small" />
              </JXBox>
            </JXBox>

            <JXBox padding="none" border={false} style={{padding: '16px', border: '1px solid var(--border)', borderRadius: '16px', backgroundColor: 'var(--background)'}}>
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '16px'}} className="items-start md:items-center flex-col md:flex-row">
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                  <p className="text-sm leading-relaxed" style={{fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <Mail className="w-4 h-4" />
                    Email API
                  </p>
                  <p className="text-sm leading-relaxed" style={{fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px'}}>
                    Used by invoice generation, payment reminders, shipment emails, and invoice templates.
                  </p>
                </JXBox>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <p className="text-sm leading-relaxed" style={{fontSize: '0.82rem', color: 'var(--text-secondary)'}}>{communicationSettings.emailEnabled ? 'Enabled' : 'Disabled'}</p>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={communicationSettings.emailEnabled}
                    disabled={savingCommunicationSettings}
                    onClick={() => handleCommunicationFieldChange('emailEnabled', !(communicationSettings.emailEnabled))}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${communicationSettings.emailEnabled ? 'bg-[var(--accent-gold)]' : 'bg-[var(--border)]'} disabled:opacity-50`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${communicationSettings.emailEnabled ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </JXBox>
              </JXBox>

              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px'}} className="grid-cols-1 md:grid-cols-2">
                <FormField label="Email Provider" value={communicationSettings.emailProvider} onChange={(event) => handleCommunicationFieldChange('emailProvider', event.target.value)} disabled={savingCommunicationSettings} size="small" />
                <FormField label="Resend API Key" type="password" value={communicationSettings.emailApiKey} onChange={(event) => handleCommunicationFieldChange('emailApiKey', event.target.value)} placeholder={communicationSettings.emailApiKeyConfigured ? `Saved: ${communicationSettings.emailApiKeyMasked}` : 'Paste API key'} helperText={communicationSettings.emailApiKeyConfigured ? 'Leave blank to keep the saved encrypted key.' : 'Saved encrypted using the app secret.'} disabled={savingCommunicationSettings} size="small" />
                <FormField label="From Email" value={communicationSettings.emailFromAddress} onChange={(event) => handleCommunicationFieldChange('emailFromAddress', event.target.value)} disabled={savingCommunicationSettings} size="small" />
                <FormField label="Reply-To Email" value={communicationSettings.emailReplyToAddress} onChange={(event) => handleCommunicationFieldChange('emailReplyToAddress', event.target.value)} disabled={savingCommunicationSettings} size="small" />
                <FormField label="Test Email Recipient" value={communicationTestTarget.email} onChange={(event) => setCommunicationTestTarget((prev) => ({ ...prev, email: event.target.value }))} placeholder="admin@example.com" size="small" />
              </JXBox>
            </JXBox>

            <JXBox padding="none" border={false} style={{padding: '16px', border: '1px solid var(--border)', borderRadius: '16px', backgroundColor: 'var(--background)'}}>
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '16px'}} className="items-start md:items-center flex-col md:flex-row">
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                  <p className="text-sm leading-relaxed" style={{fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <Smartphone className="w-4 h-4" />
                    SMS / Cellular Messages
                  </p>
                  <p className="text-sm leading-relaxed" style={{fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px'}}>
                    Used for critical alerts and Twilio WhatsApp fallback credentials.
                  </p>
                </JXBox>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <p className="text-sm leading-relaxed" style={{fontSize: '0.82rem', color: 'var(--text-secondary)'}}>{communicationSettings.smsEnabled ? 'Enabled' : 'Disabled'}</p>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={communicationSettings.smsEnabled}
                    disabled={savingCommunicationSettings}
                    onClick={() => handleCommunicationFieldChange('smsEnabled', !(communicationSettings.smsEnabled))}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${communicationSettings.smsEnabled ? 'bg-[var(--accent-gold)]' : 'bg-[var(--border)]'} disabled:opacity-50`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${communicationSettings.smsEnabled ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </JXBox>
              </JXBox>

              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px'}} className="grid-cols-1 md:grid-cols-2">
                <FormField label="SMS Provider" value={communicationSettings.smsProvider} onChange={(event) => handleCommunicationFieldChange('smsProvider', event.target.value)} disabled={savingCommunicationSettings} size="small" />
                <FormField label="Twilio Account SID" value={communicationSettings.smsAccountSid} onChange={(event) => handleCommunicationFieldChange('smsAccountSid', event.target.value)} disabled={savingCommunicationSettings} size="small" />
                <FormField label="Twilio Auth Token" type="password" value={communicationSettings.smsAuthToken} onChange={(event) => handleCommunicationFieldChange('smsAuthToken', event.target.value)} placeholder={communicationSettings.smsAuthTokenConfigured ? `Saved: ${communicationSettings.smsAuthTokenMasked}` : 'Paste auth token'} helperText={communicationSettings.smsAuthTokenConfigured ? 'Leave blank to keep the saved encrypted token.' : 'Saved encrypted using the app secret.'} disabled={savingCommunicationSettings} size="small" />
                <FormField label="From Number" value={communicationSettings.smsFromNumber} onChange={(event) => handleCommunicationFieldChange('smsFromNumber', event.target.value)} disabled={savingCommunicationSettings} size="small" />
                <FormField label="Messaging Service SID" value={communicationSettings.smsMessagingServiceSid} onChange={(event) => handleCommunicationFieldChange('smsMessagingServiceSid', event.target.value)} disabled={savingCommunicationSettings} size="small" />
                <FormField label="Test Phone Number" value={communicationTestTarget.sms} onChange={(event) => setCommunicationTestTarget((prev) => ({ ...prev, sms: event.target.value }))} placeholder="+15555555555" size="small" />
              </JXBox>
            </JXBox>

            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'flex-end'}}>
              <Button type="submit" variant="primary" loading={savingCommunicationSettings} icon={<CheckCircle2 className="w-4 h-4" />}>
                Save Communications
              </Button>
            </JXBox>
          </JXBox>

          {/* Automated Shipment Milestone Alerts Subpanel */}
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border)'}}>
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '16px'}}>
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                <p className="text-sm leading-relaxed" style={{fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <Smartphone className="w-5 h-5 text-[var(--accent-gold)]" />
                  Automated WhatsApp & SMS Milestone Alerts
                </p>
                <p className="text-sm leading-relaxed" style={{fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px'}}>
                  Automatic trigger notifications dispatched to clients as vehicle cargo advances through global milestones.
                </p>
              </JXBox>
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '12px'}}>
                <p className="text-sm leading-relaxed" style={{fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)'}}>
                  {milestoneConfig.enabled ? 'Automations Active' : 'Automations Paused'}
                </p>
                <button
                  type="button"
                  role="switch"
                  aria-checked={milestoneConfig.enabled}
                  onClick={() => setMilestoneConfig(prev => ({ ...prev, enabled: !(milestoneConfig.enabled) }))}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${milestoneConfig.enabled ? 'bg-[var(--accent-gold)]' : 'bg-[var(--border)]'} disabled:opacity-50`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${milestoneConfig.enabled ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </JXBox>
            </JXBox>

            <form onSubmit={handleSaveMilestoneConfig} className="space-y-4">
              {/* Channel Toggles Grid */}
              <DashboardGrid className="grid-cols-1 sm:grid-cols-3">
                <JXBox padding="none" border={false} style={{padding: '16px', borderRadius: '16px', border: '1px solid var(--border)', backgroundColor: 'var(--background)'}}>
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px'}}>
                    <p className="text-sm leading-relaxed" style={{fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)'}}>
                      WhatsApp Business
                    </p>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={milestoneConfig.enableWhatsApp}
                      onClick={() => setMilestoneConfig(prev => ({ ...prev, enableWhatsApp: !(milestoneConfig.enableWhatsApp) }))}
                      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${milestoneConfig.enableWhatsApp ? 'bg-[var(--accent-gold)]' : 'bg-[var(--border)]'} disabled:opacity-50`}
                    >
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${milestoneConfig.enableWhatsApp ? 'left-[18px]' : 'left-0.5'}`} />
                    </button>
                  </JXBox>
                  <p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
                    Direct WhatsApp notifications via Meta Cloud API / Twilio.
                  </p>
                </JXBox>

                <JXBox padding="none" border={false} style={{padding: '16px', borderRadius: '16px', border: '1px solid var(--border)', backgroundColor: 'var(--background)'}}>
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px'}}>
                    <p className="text-sm leading-relaxed" style={{fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)'}}>
                      Twilio SMS
                    </p>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={milestoneConfig.enableSms}
                      onClick={() => setMilestoneConfig(prev => ({ ...prev, enableSms: !(milestoneConfig.enableSms) }))}
                      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${milestoneConfig.enableSms ? 'bg-[var(--accent-gold)]' : 'bg-[var(--border)]'} disabled:opacity-50`}
                    >
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${milestoneConfig.enableSms ? 'left-[18px]' : 'left-0.5'}`} />
                    </button>
                  </JXBox>
                  <p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
                    Cellular text messaging for instant mobile notifications.
                  </p>
                </JXBox>

                <JXBox padding="none" border={false} style={{padding: '16px', borderRadius: '16px', border: '1px solid var(--border)', backgroundColor: 'var(--background)'}}>
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px'}}>
                    <p className="text-sm leading-relaxed" style={{fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)'}}>
                      Telegram Bot
                    </p>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={milestoneConfig.enableTelegram}
                      onClick={() => setMilestoneConfig(prev => ({ ...prev, enableTelegram: !(milestoneConfig.enableTelegram) }))}
                      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${milestoneConfig.enableTelegram ? 'bg-[var(--accent-gold)]' : 'bg-[var(--border)]'} disabled:opacity-50`}
                    >
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${milestoneConfig.enableTelegram ? 'left-[18px]' : 'left-0.5'}`} />
                    </button>
                  </JXBox>
                  <p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
                    Instant dispatch to company Telegram bot / channels.
                  </p>
                </JXBox>
              </DashboardGrid>

              {/* Webhook & Telegram Optional Credentials */}
              <JXBox padding="none" border={false} style={{padding: '16px', border: '1px solid var(--border)', borderRadius: '16px', backgroundColor: 'var(--background)'}}>
                <p className="text-sm leading-relaxed" style={{fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px'}}>
                  Telegram & Webhook Integrations
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <FormField label="Telegram Bot Token" value={milestoneConfig.telegramBotToken || ''} onChange={(e) => setMilestoneConfig(prev => ({ ...prev, telegramBotToken: e.target.value }))} placeholder="bot123456:ABC-DEF..." size="small" />
                  <FormField label="Telegram Chat / Channel ID" value={milestoneConfig.telegramChatId || ''} onChange={(e) => setMilestoneConfig(prev => ({ ...prev, telegramChatId: e.target.value }))} placeholder="-100123456789" size="small" />
                  <FormField label="Custom Webhook URL" value={milestoneConfig.webhookUrl || ''} onChange={(e) => setMilestoneConfig(prev => ({ ...prev, webhookUrl: e.target.value }))} placeholder="https://hooks.zapier.com/..." size="small" />
                </div>
              </JXBox>

              {/* Milestone Template Cards */}
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}} className="space-y-6">
                <p className="text-sm leading-relaxed" style={{fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px'}}>
                  Configurable Milestone Message Templates
                </p>
                <p className="text-sm leading-relaxed" style={{fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '16px'}}>
                  Click any variable token inside a card to insert it into the WhatsApp/SMS template.
                </p>

                <div className="space-y-3">
                  {[
                    { key: 'VEHICLE_PICKED_UP', label: '1. Vehicle Picked Up (Auction/Gate Pass)' },
                    { key: 'CONTAINER_LOADED', label: '2. Container Loaded & Sealed' },
                    { key: 'VESSEL_DEPARTED', label: '3. Ocean Vessel Departed (AIS Active)' },
                    { key: 'ARRIVED_AT_PORT', label: '4. Arrived at Destination Port' },
                    { key: 'CUSTOMS_CLEARED', label: '5. Customs Cleared & Ready for Pickup' },
                  ].map((m) => {
                    const currentVal = milestoneConfig.customTemplates[m.key] || defaultMilestoneTemplates[m.key]?.defaultTemplate || '';
                    return (
                      <JXBox padding="none" border={false} key={m.key} style={{padding: '16px', border: '1px solid var(--border)', borderRadius: '16px', backgroundColor: 'var(--background)'}}>
                        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px'}}>
                          <p className="text-sm leading-relaxed" style={{fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)'}}>
                            {m.label}
                          </p>
                          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
                            {milestoneConfig.customTemplates[m.key] && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="text-xs"
                                onClick={() =>
                                  setMilestoneConfig((prev) => {
                                    const nextCustom = { ...prev.customTemplates };
                                    delete nextCustom[m.key];
                                    return { ...prev, customTemplates: nextCustom };
                                  })
                                }
                              >
                                Reset Default
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              icon={<Send className="w-3.5 h-3.5" />}
                              onClick={() => handleTestMilestoneTrigger(m.key, communicationTestTarget.whatsapp)}
                              loading={testingMilestone === m.key}
                            >
                              Send Test
                            </Button>
                          </JXBox>
                        </JXBox>

                        <div className="flex flex-wrap gap-1 mb-2">
                          {[
                            '{customerName}',
                            '{vehicle}',
                            '{vin}',
                            '{lotNumber}',
                            '{containerNumber}',
                            '{vesselName}',
                            '{originPort}',
                            '{destinationPort}',
                            '{etaDate}',
                            '{trackingUrl}',
                          ].map((token) => (
                            <button
                              key={token}
                              type="button"
                              onClick={() =>
                                setMilestoneConfig((prev) => ({
                                  ...prev,
                                  customTemplates: {
                                    ...prev.customTemplates,
                                    [m.key]: `${currentVal} ${token}`,
                                  },
                                }))
                              }
                              className="px-2 py-0.5 text-[10px] font-mono rounded bg-[var(--panel)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-emerald-500 hover:text-emerald-600 transition-colors"
                            >
                              + {token}
                            </button>
                          ))}
                        </div>

                        <div className="min-w-0 flex-1"><BareInput multiline rows={2} value={currentVal} onChange={(e) => {
                            const val = e.target.value;
                            setMilestoneConfig(prev => ({
                              ...prev,
                              customTemplates: {
                                ...prev.customTemplates,
                                [m.key]: val,
                              },
                            }));
                          }} size="small" /></div>
                      </JXBox>
                    );
                  })}
                </div>
              </JXBox>

              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'flex-end', paddingTop: '8px'}}>
                <Button type="submit" variant="primary" loading={savingMilestoneConfig} icon={<CheckCircle2 className="w-4 h-4" />}>
                  Save Milestone Automations
                </Button>
              </JXBox>
            </form>
          </JXBox>
        </DashboardPanel>
      ) : null}
      </TabPanel>

      {/* Tab 6: Live Call Agent */}
      <TabPanel value={activeTab} index={6}>
      {isAdmin ? (
        <DashboardPanel
          title="Live Call Agent"
          description="Configure Twilio voice routing, Gemini Live audio, and webhook readiness from one place."
          actions={
            <Link href="/dashboard/settings/call-agent" style={{ textDecoration: 'none' }}>
              <Button variant="outline" size="sm" icon={<ArrowRight className="w-4 h-4" />}>
                Advanced View
              </Button>
            </Link>
          }
        >
          <div className="mb-6">
            <GoogleVoiceLiveCallPanel />
          </div>
          <JXBox padding="none" border={false} component="form" onSubmit={handleSaveCallAgentSettings} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '24px'}}>
            <DashboardGrid className="grid-cols-1 md:grid-cols-4">
              <StatsCard
                icon={callAgentConfig?.status.geminiLiveConfigured ? <CheckCircle2 style={{ fontSize: 18 }} /> : <XCircle style={{ fontSize: 18 }} />}
                title="Gemini Live"
                value={callAgentConfig?.status.geminiLiveConfigured ? 'Ready' : 'Needs Setup'}
                subtitle={callAgentConfig?.status.geminiLiveModel || callAgentSettings.geminiLiveModel}
                variant={callAgentConfig?.status.geminiLiveConfigured ? 'success' : 'warning'}
                size="md"
              />
              <StatsCard
                icon={callAgentConfig?.status.geminiStandardConfigured ? <CheckCircle2 style={{ fontSize: 18 }} /> : <XCircle style={{ fontSize: 18 }} />}
                title="Fallback AI"
                value={callAgentConfig?.status.geminiStandardConfigured ? 'Ready' : 'Needs Setup'}
                subtitle={callAgentConfig?.status.geminiVoiceModel || callAgentSettings.geminiVoiceModel}
                variant={callAgentConfig?.status.geminiStandardConfigured ? 'success' : 'warning'}
                size="md"
              />
              <StatsCard
                icon={callAgentConfig?.status.twilioConfigured ? <CheckCircle2 style={{ fontSize: 18 }} /> : <XCircle style={{ fontSize: 18 }} />}
                title="Twilio API"
                value={callAgentConfig?.status.twilioConfigured ? 'Configured' : 'Manual Only'}
                subtitle={callAgentConfig?.status.twilioAuthMode === 'auth-token' ? 'Auth token mode' : callAgentConfig?.status.twilioAuthMode === 'api-key' ? 'API key mode' : 'No API credentials'}
                variant={callAgentConfig?.status.twilioConfigured ? 'success' : 'warning'}
                size="md"
              />
              <StatsCard
                icon={callAgentConfig?.status.voiceWebhookTokenConfigured ? <CheckCircle2 style={{ fontSize: 18 }} /> : <XCircle style={{ fontSize: 18 }} />}
                title="Webhook Token"
                value={callAgentConfig?.status.voiceWebhookTokenConfigured ? 'Protected' : 'Missing'}
                subtitle={callAgentConfig?.urls.source === 'NEXT_PUBLIC_APP_URL' ? 'Fixed app URL' : 'Request host'}
                variant={callAgentConfig?.status.voiceWebhookTokenConfigured ? 'success' : 'warning'}
                size="md"
              />
            </DashboardGrid>

            <DashboardGrid className="grid-cols-1 lg:grid-cols-2">
              <JXBox padding="none" border={false} style={{padding: '16px', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--background)'}}>
                <p className="text-sm leading-relaxed" style={{fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px'}}>
                  <PhoneCall className="w-4 h-4" />
                  Twilio Voice
                </p>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px'}} className="grid-cols-1 grid md:grid-cols-[1fr_1fr]">
                  <FormField label="Account SID" value={callAgentSettings.twilioAccountSid} onChange={(event) => handleCallAgentFieldChange('twilioAccountSid', event.target.value)} disabled={savingCallAgentSettings} size="small" />
                  <FormField label="Auth Token" type="password" value={callAgentSettings.twilioAuthToken} onChange={(event) => handleCallAgentFieldChange('twilioAuthToken', event.target.value)} disabled={savingCallAgentSettings} size="small" />
                  <FormField label="API Key" value={callAgentSettings.twilioApiKey} onChange={(event) => handleCallAgentFieldChange('twilioApiKey', event.target.value)} disabled={savingCallAgentSettings} size="small" />
                  <FormField label="API Secret" type="password" value={callAgentSettings.twilioApiSecret} onChange={(event) => handleCallAgentFieldChange('twilioApiSecret', event.target.value)} disabled={savingCallAgentSettings} size="small" />
                  <FormField label="Phone Number" value={callAgentSettings.twilioPhoneNumber} onChange={(event) => handleCallAgentFieldChange('twilioPhoneNumber', event.target.value)} disabled={savingCallAgentSettings} size="small" />
                  <FormField label="Phone Number SID" value={callAgentSettings.twilioPhoneNumberSid} onChange={(event) => handleCallAgentFieldChange('twilioPhoneNumberSid', event.target.value)} disabled={savingCallAgentSettings} size="small" />
                </JXBox>
                <p className="text-sm leading-relaxed" style={{fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '16px', lineHeight: 1.6}}>
                  Use either Account SID + Auth Token or Account SID + API Key + API Secret. The phone number fields help the app inspect the live Twilio webhook target.
                </p>
              </JXBox>

              <JXBox padding="none" border={false} style={{padding: '16px', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--background)'}}>
                <p className="text-sm leading-relaxed" style={{fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px'}}>
                  <Bot className="w-4 h-4" />
                  Gemini Live
                </p>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px'}} className="grid-cols-1 grid md:grid-cols-[1fr_1fr]">
                  <FormField label="Gemini API Key" type="password" value={callAgentSettings.geminiApiKey} onChange={(event) => handleCallAgentFieldChange('geminiApiKey', event.target.value)} disabled={savingCallAgentSettings} size="small" />
                  <FormField label="Gemini Live API Key" type="password" value={callAgentSettings.geminiLiveApiKey} onChange={(event) => handleCallAgentFieldChange('geminiLiveApiKey', event.target.value)} disabled={savingCallAgentSettings} size="small" />
                  <FormField label="Fallback Voice Model" value={callAgentSettings.geminiVoiceModel} onChange={(event) => handleCallAgentFieldChange('geminiVoiceModel', event.target.value)} disabled={savingCallAgentSettings} size="small" />
                  <FormField label="Live Audio Model" value={callAgentSettings.geminiLiveModel} onChange={(event) => handleCallAgentFieldChange('geminiLiveModel', event.target.value)} disabled={savingCallAgentSettings} size="small" />
                </JXBox>
                <p className="text-sm leading-relaxed" style={{fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '16px', lineHeight: 1.6}}>
                  The live key and model power the caller audio bridge. The fallback key/model handle the IVR assistant when live audio is unavailable.
                </p>
              </JXBox>
            </DashboardGrid>

            <JXBox padding="none" border={false} style={{padding: '16px', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--background)', display: 'grid', gap: '16px'}}>
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                <p className="text-sm leading-relaxed" style={{fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase'}}>Inbound Voice Webhook</p>
                <p className="text-sm leading-relaxed" style={{fontSize: '0.86rem', color: 'var(--text-primary)', wordBreak: 'break-all', marginTop: '4px'}}>
                  {callAgentConfig?.urls.webhookUrl || 'Load settings to see the webhook URL'}
                </p>
                <p className="text-sm leading-relaxed" style={{fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px'}}>Method: {callAgentConfig?.urls.webhookMethod || 'POST'}</p>
              </JXBox>
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                <p className="text-sm leading-relaxed" style={{fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase'}}>Live Media WebSocket</p>
                <p className="text-sm leading-relaxed" style={{fontSize: '0.86rem', color: 'var(--text-primary)', wordBreak: 'break-all', marginTop: '4px'}}>
                  {callAgentConfig?.urls.websocketUrl || 'Load settings to see the WebSocket URL'}
                </p>
              </JXBox>
              {callAgentConfig?.twilioInspection.error ? (
                <p className="text-sm leading-relaxed" style={{fontSize: '0.82rem', color: 'var(--warning)', lineHeight: 1.6}}>
                  Twilio inspection: {callAgentConfig.twilioInspection.error}
                </p>
              ) : (
                <p className="text-sm leading-relaxed" style={{fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6}}>
                  Twilio inspection: {callAgentConfig?.twilioInspection.inspected ? `${callAgentConfig.twilioInspection.phoneNumber || callAgentConfig.twilioInspection.target || 'Configured number'} is ${callAgentConfig.twilioInspection.matchesExpectedWebhook ? 'pointing to this webhook' : 'not pointing to this webhook yet'}.` : 'Add Twilio credentials and a phone target to inspect webhook routing.'}
                </p>
              )}
            </JXBox>

            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'flex-end'}}>
              <Button type="submit" variant="primary" loading={savingCallAgentSettings}>
                Save Live Call Agent
              </Button>
            </JXBox>
          </JXBox>
        </DashboardPanel>
      ) : null}
      </TabPanel>

      {/* Tab 7: Price Calculator */}
      <TabPanel value={activeTab} index={7}>
      {isAdmin ? (
        <DashboardPanel
          title="Price Calculator"
          description="Configure dashboard calculator rates and import state prices from PDF sheets."
        >
          <form onSubmit={handleSaveRates} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                label="Destination"
                value={rateConfig.destinationLabel}
                onChange={(e) => handleRateConfigChange('destinationLabel', e.target.value)}
                placeholder="Jebel Ali, UAE"
              />
              <FormField
                label="Fallback Rate"
                type="number"
                value={rateConfig.fallbackRate}
                onChange={(e) => handleRateConfigChange('fallbackRate', Number(e.target.value))}
                leftIcon={<DollarSign className="w-4 h-4" />}
              />
              <FormField
                label="Currency"
                value={rateConfig.currency}
                onChange={(e) => handleRateConfigChange('currency', e.target.value.toUpperCase())}
                placeholder="USD"
              />
            </div>

            <div className="p-4 border border-[var(--border)] rounded-lg bg-[var(--background)]">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Import Rates From PDF</p>
                  <span className="block text-xs text-[var(--text-secondary)] text-[var(--text-secondary)]">
                    Reads rows like CA $1300, California 1300, or similar state/rate pairs.
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setRatePdfFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="rate-pdf-upload"
                  />
                  <label htmlFor="rate-pdf-upload">
                    <Button component="span" variant="outline" icon={<FileText className="w-4 h-4" />}>
                      {ratePdfFile ? ratePdfFile.name : 'Select PDF'}
                    </Button>
                  </label>
                  <Button
                    type="button"
                    onClick={handleImportRatesPdf}
                    disabled={!ratePdfFile || importingRates}
                    loading={importingRates}
                    variant="primary"
                  >
                    Import PDF
                  </Button>
                </div>
              </div>
              {rateConfig.updatedFromPdfName ? (
                <span className="block text-xs text-[var(--text-secondary)] text-[var(--text-secondary)]" style={{marginTop: '16px'}}>
                  Last imported from {rateConfig.updatedFromPdfName}
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {US_STATES.map((state) => (
                <FormField
                  key={state.code}
                  label={`${state.code} Rate`}
                  type="number"
                  value={rateConfig.stateRates[state.code] ?? ''}
                  onChange={(e) => handleStateRateChange(state.code, e.target.value)}
                  helperText={state.name}
                />
              ))}
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={savingRates} loading={savingRates} variant="primary">
                Save Calculator
              </Button>
            </div>
          </form>
        </DashboardPanel>
      ) : null}
      </TabPanel>

      {/* Tab 8: Tracking APIs */}
      <TabPanel value={activeTab} index={8}>
        {isAdmin ? <TrackingApisTab /> : null}
      </TabPanel>
    </DashboardSurface>
  );
}

// useSearchParams() must sit under a Suspense boundary or static
// prerendering fails (missing-suspense-with-csr-bailout).
export default function SettingsPage() {
  return (
    <Suspense fallback={<div aria-busy="true" style={{ minHeight: '50vh' }} />}>
      <SettingsPageContent />
    </Suspense>
  );
}
