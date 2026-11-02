'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Send,
  Globe,
  ShieldCheck,
  Webhook,
  Copy,
  Check,
  PhoneIncoming,
  PhoneOutgoing,
} from 'lucide-react';
import { toast } from '@/components/design-system';

export interface LiveVoiceCallContext {
  shipmentId?: string;
  customerName?: string;
  customerPhone?: string;
  vehicleDetails?: string;
  vin?: string;
  containerNumber?: string;
  portOfOrigin?: string;
  destinationPort?: string;
  eta?: string;
  balanceDue?: string | number;
  messagePreview?: string;
}

interface GoogleVoiceLiveCallPanelProps {
  context?: LiveVoiceCallContext;
  defaultLanguage?: 'en' | 'ps' | 'fa' | 'ar';
  compact?: boolean;
}

interface CallTurn {
  id: string;
  role: 'caller' | 'agent';
  text: string;
  time: string;
}

export function GoogleVoiceLiveCallPanel({
  context = {},
  defaultLanguage = 'en',
  compact = false,
}: GoogleVoiceLiveCallPanelProps) {
  const [callActive, setCallActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [dispatchingTwilioCall, setDispatchingTwilioCall] = useState(false);
  const [mutedSpeaker, setMutedSpeaker] = useState(false);
  const [language, setLanguage] = useState<'en' | 'ps' | 'fa' | 'ar'>(defaultLanguage);
  const [callSeconds, setCallSeconds] = useState(0);
  const [phoneInput, setPhoneInput] = useState(context.customerPhone || '+93704117413');
  const [manualInput, setManualInput] = useState('');
  const [turns, setTurns] = useState<CallTurn[]>([]);
  const [showWebhooks, setShowWebhooks] = useState(!compact);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [sessionMeta, setSessionMeta] = useState<{
    geminiLiveReady: boolean;
    geminiStandardReady: boolean;
    liveModel: string;
    googleVoiceNumber: string;
  } | null>(null);

  const [twilioWebhookData, setTwilioWebhookData] = useState<{
    webhooks: {
      receiveWebhookUrl: string;
      sentWebhookUrl: string;
      statusWebhookUrl: string;
      classicIvrWebhookUrl: string;
    };
    recentCalls: Array<{
      id: string;
      callSid: string;
      action: string;
      summary: string;
      createdAt: string;
    }>;
  } | null>(null);

  const recognitionRef = useRef<any>(null);
  const callActiveRef = useRef(false);
  const mutedSpeakerRef = useRef(false);

  useEffect(() => {
    if (context.customerPhone) {
      setPhoneInput(context.customerPhone);
    }
  }, [context.customerPhone]);

  useEffect(() => {
    setLanguage(defaultLanguage);
  }, [defaultLanguage]);

  useEffect(() => {
    mutedSpeakerRef.current = mutedSpeaker;
  }, [mutedSpeaker]);

  const loadWebhookAndStatusLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/voice/status', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.ok) {
        setTwilioWebhookData({
          webhooks: data.webhooks,
          recentCalls: data.recentCalls || [],
        });
      }
    } catch {
      // ignore
    }
  }, []);

  // Load session readiness and Twilio webhooks on mount
  useEffect(() => {
    let cancelled = false;
    async function loadMeta() {
      try {
        const params = new URLSearchParams();
        if (context.shipmentId) params.set('shipmentId', context.shipmentId);
        if (context.vin) params.set('vin', context.vin);
        const res = await fetch(`/api/voice/live-session?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.ok) {
          setSessionMeta({
            geminiLiveReady: Boolean(data.geminiLiveReady),
            geminiStandardReady: Boolean(data.geminiStandardReady),
            liveModel: data.liveModel || 'gemini-3.1-flash-live-preview',
            googleVoiceNumber: data.googleVoiceNumber || '+93704117413',
          });
        }
      } catch {
        // ignore
      }
    }
    loadMeta();
    void loadWebhookAndStatusLogs();
    return () => {
      cancelled = true;
    };
  }, [context.shipmentId, context.vin, loadWebhookAndStatusLogs]);

  // Call duration timer
  useEffect(() => {
    if (!callActive) {
      setCallSeconds(0);
      return;
    }
    const timer = setInterval(() => {
      setCallSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [callActive]);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const rem = (sec % 60).toString().padStart(2, '0');
    return `${mins}:${rem}`;
  };

  const speakText = useCallback(
    (text: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window) || mutedSpeakerRef.current) {
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang =
        language === 'ar'
          ? 'ar-SA'
          : language === 'fa'
            ? 'fa-IR'
            : language === 'ps'
              ? 'ps-AF'
              : 'en-US';
      utterance.rate = 1.02;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    },
    [language],
  );

  const sendVoiceTurn = useCallback(
    async (spokenText: string) => {
      const cleaned = spokenText.trim();
      if (!cleaned) return;

      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setTurns((prev) => [
        ...prev,
        { id: `caller-${Date.now()}`, role: 'caller', text: cleaned, time: nowStr },
      ]);

      setIsThinking(true);
      try {
        const res = await fetch('/api/voice/live-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript: cleaned,
            language,
            context,
          }),
        });
        const data = await res.json();
        const reply =
          data?.reply ||
          'I have checked the JACXI logistics system. Please let me know if you need the VIN or container status.';

        setTurns((prev) => [
          ...prev,
          {
            id: `agent-${Date.now()}`,
            role: 'agent',
            text: reply,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);

        speakText(reply);
      } catch {
        toast.error('Voice assistant turn failed');
      } finally {
        setIsThinking(false);
      }
    },
    [context, language, speakText],
  );

  const startMicRecognition = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      toast.info('Browser microphone speech-to-text unavailable — use the voice prompt bar below.');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang =
        language === 'ar'
          ? 'ar-SA'
          : language === 'fa'
            ? 'fa-IR'
            : language === 'ps'
              ? 'ps-AF'
              : 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event?.results?.[0]?.[0]?.transcript;
        if (transcript && callActiveRef.current) {
          void sendVoiceTurn(transcript);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  }, [language, sendVoiceTurn]);

  const handleStartLiveCall = () => {
    callActiveRef.current = true;
    setCallActive(true);
    const vehicle = context.vehicleDetails || 'your shipment';
    const vinInfo = context.vin && context.vin !== 'N/A' ? ` (VIN ${context.vin.slice(-6)})` : '';
    const containerInfo =
      context.containerNumber && context.containerNumber !== 'PENDING'
        ? ` in container ${context.containerNumber}`
        : '';

    const greeting =
      language === 'ps'
        ? `سلام! د جکسي بارچلاونې او ګوګل غږیز سیسټم ته ښه راغلاست. زه ستاسو د موټر ${vehicle} او کانټینر معلوماتو لپاره چمتو یم.`
        : language === 'fa'
          ? `سلام! به تماس صوتی زنده شرکت حمل و نقل جکسی خوش آمدید. من آماده پاسخگویی درباره موتر ${vehicle} و کانتینر شما هستم.`
          : language === 'ar'
            ? `مرحباً بكم في المكالمة الصوتية المباشرة لشركة جاكسي للشحن. كيف يمكنني مساعدتكم بخصوص ${vehicle}؟`
            : `Connected to JACXI Google Gemini Live Voice. I have ${vehicle}${vinInfo}${containerInfo} loaded on screen. Speak into your microphone or tap a prompt below.`;

    setTurns([
      {
        id: `greeting-${Date.now()}`,
        role: 'agent',
        text: greeting,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    speakText(greeting);
  };

  const handleEndLiveCall = () => {
    callActiveRef.current = false;
    setCallActive(false);
    setIsListening(false);
    setIsSpeaking(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      callActiveRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleLaunchGoogleVoiceCall = () => {
    const cleanPhone = (phoneInput || '').replace(/[^\d+]/g, '');
    const gvUrl = cleanPhone
      ? `https://voice.google.com/u/0/calls?a=nc,${encodeURIComponent(cleanPhone)}`
      : 'https://voice.google.com/u/0/calls';
    window.open(gvUrl, '_blank', 'noopener,noreferrer');
    toast.success(`Launched Google Voice dialer for ${cleanPhone || 'call'}`);
  };

  const handleLaunchGoogleVoiceSms = () => {
    if (context.messagePreview) {
      navigator.clipboard.writeText(context.messagePreview);
    }
    window.open('https://voice.google.com/u/0/messages', '_blank', 'noopener,noreferrer');
    toast.success('Message copied & opened Google Voice Messages');
  };

  const handleSendTwilioOutboundCall = async () => {
    const cleanPhone = (phoneInput || '').trim();
    if (!cleanPhone) {
      toast.error('Enter a phone number to call');
      return;
    }

    setDispatchingTwilioCall(true);
    try {
      const res = await fetch('/api/voice/sent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: cleanPhone,
          message:
            context.messagePreview ||
            `Hello ${context.customerName || 'Valued Customer'}, this is JACXI Shipping and Logistics calling with a live status update on your vehicle ${context.vehicleDetails || ''}.`,
          customerName: context.customerName,
          vin: context.vin,
          shipmentId: context.shipmentId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'Twilio outbound call failed');
      }
      toast.success(`Outbound Twilio AI Call sent to ${data.to} (SID: ${data.callSid})`);
      void loadWebhookAndStatusLogs();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to dispatch Twilio call');
    } finally {
      setDispatchingTwilioCall(false);
    }
  };

  const handleCopyUrl = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    toast.success('Webhook URL copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] overflow-hidden flex flex-col">
      {/* Top Bar: Google Voice & Gemini Live Status */}
      <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--panel)] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs ${
              callActive ? 'bg-emerald-600 animate-pulse' : 'bg-blue-600'
            }`}
          >
            <PhoneCall className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[var(--text-primary)]">
                Google Voice, Twilio Call Webhooks & Gemini Live Hub
              </span>
              <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25">
                Inbound + Outbound Ready
              </span>
            </div>
            <p className="text-[10px] text-[var(--text-secondary)]">
              {sessionMeta?.geminiLiveReady
                ? `Gemini Live (${sessionMeta.liveModel}) + Twilio Call Receive/Sent Webhooks Active`
                : 'Browser WebRTC Voice + Google Voice Dialer + Twilio Call Webhooks Active'}
            </p>
          </div>
        </div>

        {/* Voice Language Selector + Webhooks Toggle */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowWebhooks((s) => !s)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1"
          >
            <Webhook className="w-3 h-3 text-[var(--accent-gold)]" />
            {showWebhooks ? 'Hide Webhooks' : 'Twilio Webhooks'}
          </button>
          {[
            { id: 'en', label: 'EN' },
            { id: 'ps', label: 'پښتو' },
            { id: 'fa', label: 'دری' },
            { id: 'ar', label: 'العربية' },
          ].map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLanguage(l.id as any)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                language === l.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-[var(--background)] text-[var(--text-secondary)] border-[var(--border)]'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Body */}
      <div className={`p-4 space-y-4 ${compact ? '' : 'sm:p-5'}`}>
        {/* Section 1: Outbound Google Voice & Twilio Call Sent Dialer */}
        <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--panel)] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-500" />
              Outbound Call Dispatch (Google Voice Dialer + Twilio Automated AI Call)
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              E.164 Ready
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="+1 (555) 019-2834 or +93 70 411 7413"
              className="flex-1 px-3 py-2 text-xs font-mono rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              disabled={dispatchingTwilioCall}
              onClick={handleSendTwilioOutboundCall}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs shrink-0 disabled:opacity-50"
              title="Triggers POST /api/voice/sent to dial customer via Twilio and speak the live update"
            >
              <PhoneOutgoing className="w-3.5 h-3.5" />
              {dispatchingTwilioCall ? 'Calling...' : 'Send Twilio AI Call'}
            </button>
            <button
              type="button"
              onClick={handleLaunchGoogleVoiceCall}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs shrink-0"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              Google Voice
              <ExternalLink className="w-3 h-3 opacity-80" />
            </button>
            <button
              type="button"
              onClick={handleLaunchGoogleVoiceSms}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-500/20 transition-colors shrink-0"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              GV SMS
            </button>
          </div>
        </div>

        {/* Section 2: Interactive Live AI Voice Call Console */}
        <div className="p-4 rounded-2xl border border-blue-500/30 bg-gradient-to-b from-blue-500/5 to-emerald-500/5 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Radio className={`w-4 h-4 ${callActive ? 'text-emerald-500 animate-ping' : 'text-blue-500'}`} />
              <span className="text-xs font-bold text-[var(--text-primary)]">
                {callActive
                  ? `Live Voice Call Active • ${formatTimer(callSeconds)}`
                  : 'Google Gemini Live AI Voice Call (Two-Way Audio)'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {!callActive ? (
                <button
                  type="button"
                  onClick={handleStartLiveCall}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all shadow-md"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  Start Live Voice Call
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={startMicRecognition}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      isListening
                        ? 'bg-red-600 text-white border-red-600 animate-pulse'
                        : 'bg-[var(--panel)] text-[var(--text-primary)] border-[var(--border)] hover:border-blue-500'
                    }`}
                  >
                    {isListening ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                    {isListening ? 'Listening...' : 'Speak (Mic)'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMutedSpeaker((m) => !m);
                      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                        window.speechSynthesis.cancel();
                      }
                    }}
                    className="p-1.5 rounded-xl border border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    title={mutedSpeaker ? 'Unmute Voice Output' : 'Mute Voice Output'}
                  >
                    {mutedSpeaker ? (
                      <VolumeX className="w-4 h-4 text-red-500" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-emerald-500" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleEndLiveCall}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors"
                  >
                    <PhoneOff className="w-3.5 h-3.5" />
                    End Call
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Live Audio Equalizer / Status Indicator */}
          {callActive && (
            <div className="flex items-center justify-center gap-1.5 py-2">
              {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
                <span
                  key={bar}
                  className={`w-1.5 rounded-full transition-all duration-300 ${
                    isSpeaking
                      ? 'h-6 bg-emerald-500 animate-bounce'
                      : isListening
                        ? 'h-5 bg-red-500 animate-pulse'
                        : isThinking
                          ? 'h-4 bg-amber-500 animate-ping'
                          : 'h-2 bg-blue-500/40'
                  }`}
                  style={{ animationDelay: `${bar * 80}ms` }}
                />
              ))}
              <span className="ml-2 text-[11px] font-semibold text-[var(--text-secondary)]">
                {isSpeaking
                  ? 'JACXI Voice Agent Speaking...'
                  : isListening
                    ? 'Listening to your microphone...'
                    : isThinking
                      ? 'Checking live database...'
                      : 'Call active — click Speak (Mic) or ask below'}
              </span>
            </div>
          )}

          {/* Quick Voice Prompts */}
          <div className="flex flex-wrap gap-1.5">
            {[
              'Where is this vehicle right now?',
              'What is the container ETA and location?',
              'What is the customer balance status?',
              'Summarize a voice update I can read to the customer',
            ].map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  if (!callActive) handleStartLiveCall();
                  void sendVoiceTurn(prompt);
                }}
                className="px-2.5 py-1 text-[10px] font-semibold rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)] hover:border-blue-500 hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
              >
                <Sparkles className="w-2.5 h-2.5 text-blue-500" />
                {prompt}
              </button>
            ))}
          </div>

          {/* Live Call Transcript Feed */}
          {turns.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-2 p-2.5 rounded-xl bg-[var(--panel)] border border-[var(--border)]">
              {turns.map((turn) => (
                <div
                  key={turn.id}
                  className={`flex flex-col text-xs p-2 rounded-lg ${
                    turn.role === 'agent'
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-[var(--text-primary)]'
                      : 'bg-blue-500/10 border border-blue-500/20 text-[var(--text-primary)] self-end'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-bold mb-0.5 opacity-75">
                    <span>{turn.role === 'agent' ? '🔊 JACXI Live Voice Agent' : '🎙️ You'}</span>
                    <span>{turn.time}</span>
                  </div>
                  <p className="leading-relaxed">{turn.text}</p>
                </div>
              ))}
            </div>
          )}

          {/* Voice / Text Input Bar */}
          <div className="flex gap-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (!manualInput.trim()) return;
                  if (!callActive) handleStartLiveCall();
                  void sendVoiceTurn(manualInput);
                  setManualInput('');
                }
              }}
              placeholder="Speak with mic or type a question (e.g. Check VIN status or container ETA)..."
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--panel)] text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              disabled={isThinking || !manualInput.trim()}
              onClick={() => {
                if (!manualInput.trim()) return;
                if (!callActive) handleStartLiveCall();
                void sendVoiceTurn(manualInput);
                setManualInput('');
              }}
              className="px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1"
            >
              <Send className="w-3.5 h-3.5" />
              Ask Voice
            </button>
          </div>
        </div>

        {/* Section 3: Twilio Call Receive & Call Sent Webhooks + Recent Call Log */}
        {showWebhooks && twilioWebhookData && (
          <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--panel)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <Webhook className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                Twilio Call Receive & Call Sent Webhooks (`POST`)
              </span>
              <span className="text-[10px] text-[var(--text-secondary)]">
                Paste into Twilio Console → Phone Numbers → Voice Configuration
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {[
                {
                  key: 'receive',
                  label: '1. Call Receive Webhook (Inbound VoiceUrl)',
                  url: twilioWebhookData.webhooks.receiveWebhookUrl,
                  icon: PhoneIncoming,
                },
                {
                  key: 'sent',
                  label: '2. Call Sent Webhook (Outbound TwiML & API)',
                  url: twilioWebhookData.webhooks.sentWebhookUrl,
                  icon: PhoneOutgoing,
                },
                {
                  key: 'status',
                  label: '3. Call Status Callback Webhook',
                  url: twilioWebhookData.webhooks.statusWebhookUrl,
                  icon: Radio,
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.key}
                    className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] flex flex-col justify-between gap-1.5"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold text-[var(--text-primary)] flex items-center gap-1">
                        <Icon className="w-3 h-3 text-emerald-500" />
                        {item.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyUrl(item.key, item.url)}
                        className="text-[10px] font-semibold text-[var(--accent-gold)] hover:underline flex items-center gap-0.5"
                      >
                        {copiedKey === item.key ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedKey === item.key ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <code className="text-[10px] font-mono text-[var(--text-secondary)] break-all">
                      {item.url}
                    </code>
                  </div>
                );
              })}
            </div>

            {twilioWebhookData.recentCalls.length > 0 && (
              <div className="pt-2 border-t border-[var(--border)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1.5">
                  Recent Inbound & Outbound Twilio Calls
                </span>
                <div className="space-y-1 max-h-28 overflow-y-auto">
                  {twilioWebhookData.recentCalls.slice(0, 5).map((call) => (
                    <div
                      key={call.id}
                      className="flex items-center justify-between gap-2 text-[11px] px-2.5 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border)]"
                    >
                      <span className="truncate text-[var(--text-primary)] font-medium">{call.summary}</span>
                      <span className="text-[10px] text-[var(--text-secondary)] shrink-0">
                        {new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
