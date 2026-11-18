'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Sparkles,
  X,
  Send,
  Bot,
  RotateCcw,
  ChevronRight,
  Car,
  Package,
  FileText,
  DollarSign,
  Truck,
  AlertTriangle,
  Loader2,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Building2,
  KeyRound,
  MessageSquare,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { toast } from '@/components/design-system';
import type { ActionCard } from '@/lib/ai/admin-copilot';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolExecuted?: string;
  actionCards?: ActionCard[];
  timestamp: string;
}

const CATEGORIES = [
  { id: 'all', label: 'All Actions' },
  { id: 'overview', label: '📊 Overview' },
  { id: 'shipments', label: '🚗 Shipments' },
  { id: 'containers', label: '🚢 Containers' },
  { id: 'dispatches', label: '🚚 Dispatches' },
  { id: 'carriers', label: '🏢 Carriers' },
  { id: 'whatsapp', label: '📱 WhatsApp' },
  { id: 'damage', label: '⚠️ Damage' },
];

const PROMPTS_BY_CATEGORY: Record<string, string[]> = {
  all: [
    '📊 System Overview',
    '🚢 Active Containers',
    '🚗 Search VIN',
    '🏢 List Carriers',
    '📱 Draft WhatsApp',
    '📋 Unpaid Invoices',
  ],
  overview: [
    '📊 Real-Time Operations Overview',
    '💵 Outstanding Customer Balances',
    '📈 Total Vehicles In-Transit',
  ],
  shipments: [
    '🚗 Search on-hand vehicles',
    '🔍 Look up VIN status',
    '📍 Find vehicles at yard',
  ],
  containers: [
    '🚢 List active ocean containers',
    '📦 Waiting for loading containers',
    '🌊 Vessel schedules & ETA',
  ],
  dispatches: [
    '🚚 Active towing dispatches',
    '🚛 Overland transit runs',
    '📍 Pending vehicle pickups',
  ],
  carriers: [
    '🏢 List all active carrier partners',
    '🚛 Find towing companies',
    '🚢 Ocean shipping line partners',
  ],
  whatsapp: [
    '📱 Draft WhatsApp arrival notification',
    '💬 Compose customs release message',
    '🚗 Send ocean sailing update',
  ],
  damage: [
    '⚠️ Show vehicles with damage cost',
    '📸 Inspect damage photos',
    '🔍 Yard intake condition reports',
  ],
};

function formatMarkdownMessage(content: string) {
  const lines = content.split('\n');
  return lines.map((line, idx) => {
    // Code block markers
    if (line.startsWith('```')) {
      return null;
    }

    // Headers
    if (line.startsWith('### ')) {
      return (
        <h4 key={idx} className="font-bold text-xs text-[var(--accent-gold)] mt-2 mb-1">
          {line.replace('### ', '')}
        </h4>
      );
    }
    if (line.startsWith('## ')) {
      return (
        <h3 key={idx} className="font-extrabold text-xs text-[var(--text-primary)] mt-2.5 mb-1">
          {line.replace('## ', '')}
        </h3>
      );
    }

    // Bullet points
    if (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('* ')) {
      const cleanLine = line.replace(/^[-•*]\s+/, '');
      return (
        <div key={idx} className="flex items-start gap-1.5 my-0.5 ml-1">
          <span className="text-[var(--accent-gold)] select-none shrink-0">•</span>
          <span>{renderInlineText(cleanLine)}</span>
        </div>
      );
    }

    // Default line
    return (
      <p key={idx} className={line.trim() === '' ? 'h-1.5' : 'my-0.5'}>
        {renderInlineText(line)}
      </p>
    );
  });
}

function renderInlineText(text: string) {
  // Regex to split on bold (**text**) and code (`text`)
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-[var(--text-primary)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="rounded bg-black/40 px-1 py-0.5 font-mono text-[10px] text-amber-300 border border-amber-500/20"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export function AdminCopilotDrawer() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize with welcome message
  useEffect(() => {
    const welcomeMsg: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content:
        '👋 Welcome to the **JACXI Admin Copilot**! I can search and update shipments, check container manifests, query customer ledgers, draft WhatsApp milestone alerts, manage dispatches, and check damage reports across the entire platform.\n\nType a command or pick a quick action below:',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([welcomeMsg]);
  }, []);

  // Global listeners (Keyboard shortcut Ctrl+J & CustomEvents)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    const handleToggle = () => setIsOpen((prev) => !prev);
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('toggle-admin-copilot', handleToggle);
    window.addEventListener('open-admin-copilot', handleOpen);
    window.addEventListener('close-admin-copilot', handleClose);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('toggle-admin-copilot', handleToggle);
      window.removeEventListener('open-admin-copilot', handleOpen);
      window.removeEventListener('close-admin-copilot', handleClose);
    };
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/admin/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history,
          context: {
            currentPath: pathname,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process request');
      }

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Task executed.',
        toolExecuted: data.toolExecuted,
        actionCards: data.actionCards,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Admin Copilot error:', err);
      toast.error(err.message || 'Error executing admin copilot action');
      const errorMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ ${err.message || 'An error occurred while executing the task.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardAction = async (card: ActionCard, isPrimary: boolean) => {
    const action = isPrimary ? card.primaryAction : card.secondaryAction;
    if (!action) return;

    if (action.href) {
      if (action.href.startsWith('http')) {
        window.open(action.href, '_blank', 'noopener,noreferrer');
      } else {
        router.push(action.href);
      }
      return;
    }

    if (action.actionId) {
      if (action.actionId === 'copy_text' && card.data?.messageText) {
        await navigator.clipboard.writeText(card.data.messageText);
        toast.success('WhatsApp text copied to clipboard!');
        return;
      }

      if (action.actionId === 'copy_token' && card.metrics?.[0]?.value) {
        await navigator.clipboard.writeText(card.metrics[0].value);
        toast.success('Release token copied to clipboard!');
        return;
      }

      if (action.actionId === 'prompt_status_update') {
        const targetVin = action.payload?.vin || action.payload?.shipmentId;
        setInput(`Update status of ${targetVin} to `);
        inputRef.current?.focus();
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch('/api/admin/copilot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actionId: action.actionId,
            payload: action.payload,
            context: { currentPath: pathname },
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Action failed');

        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          toolExecuted: data.toolExecuted,
          actionCards: data.actionCards,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err: any) {
        toast.error(err.message || 'Action failed');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCopyMessage = async (msgId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(msgId);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: '🔄 Chat session cleared. How can I assist you with platform operations?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const currentPrompts = PROMPTS_BY_CATEGORY[activeCategory] || PROMPTS_BY_CATEGORY.all;

  return (
    <>
      {/* Floating Trigger Button (Bottom-Right) */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-40 hidden sm:block">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="Open Admin AI Copilot"
            className="group relative flex items-center gap-2.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 px-4 py-2.5 text-white shadow-lg shadow-amber-500/25 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-amber-500/35 active:scale-95"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
              <Sparkles className="h-4 w-4 animate-pulse text-white" />
            </div>
            <div className="text-left">
              <p className="text-xs font-extrabold tracking-wide uppercase text-white">Admin Copilot</p>
              <p className="text-[10px] font-semibold text-white/90">Press Ctrl+J</p>
            </div>
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500 border border-white"></span>
            </span>
          </button>
        </div>
      )}

      {/* Drawer Overlay Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-Over Drawer Container */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex flex-col bg-[var(--background)] border-l border-[var(--border)] shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } ${isExpanded ? 'w-full md:w-[720px]' : 'w-full sm:w-[480px]'}`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-sm shadow-amber-500/20">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Admin Copilot</h3>
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-emerald-400 border border-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Platform
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">Direct Operations & Task Orchestrator</p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[var(--text-secondary)]">
            <button
              type="button"
              onClick={handleResetChat}
              title="Reset Chat"
              className="rounded-lg p-1.5 hover:bg-[var(--background)] hover:text-[var(--text-primary)] transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'Collapse' : 'Expand width'}
              className="hidden md:inline-flex rounded-lg p-1.5 hover:bg-[var(--background)] hover:text-[var(--text-primary)] transition-colors"
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              title="Close Copilot (Esc)"
              className="rounded-lg p-1.5 hover:bg-[var(--background)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Category Selector Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-[var(--border)] bg-[var(--card)]/60 px-3 py-1.5 text-xs no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                activeCategory === cat.id
                  ? 'bg-[var(--accent-gold)] text-white shadow-xs font-bold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Quick Suggestion Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[var(--border)] bg-[var(--background)] px-4 py-2 text-xs no-scrollbar">
          {currentPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleSendMessage(prompt.replace(/^[^\w\s]+\s*/, ''))}
              className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] hover:border-[var(--accent-gold)]/60 hover:text-[var(--text-primary)] transition-all shadow-xs"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] font-semibold text-[var(--text-secondary)]">
                {m.role === 'user' ? (
                  <>
                    <span>You</span>
                    <span>·</span>
                    <span>{m.timestamp}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3 text-amber-400" />
                    <span>JACXI Copilot</span>
                    {m.toolExecuted && (
                      <span className="rounded bg-amber-500/10 px-1 py-0.2 text-[9px] font-mono text-amber-400 border border-amber-500/20">
                        {m.toolExecuted}
                      </span>
                    )}
                    <span>·</span>
                    <span>{m.timestamp}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyMessage(m.id, m.content)}
                      title="Copy response"
                      className="ml-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      {copiedId === m.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </>
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`rounded-2xl px-4 py-3 text-xs leading-relaxed max-w-[94%] shadow-sm ${
                  m.role === 'user'
                    ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white font-medium'
                    : 'bg-[var(--card)] text-[var(--text-primary)] border border-[var(--border)]'
                }`}
              >
                <div>{m.role === 'user' ? m.content : formatMarkdownMessage(m.content)}</div>

                {/* Render Action Cards */}
                {m.actionCards && m.actionCards.length > 0 && (
                  <div className="mt-3 space-y-2.5 border-t border-[var(--border)]/70 pt-2.5">
                    {m.actionCards.map((card, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-[11px] space-y-2 shadow-xs transition-all hover:border-[var(--accent-gold)]/50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {card.type === 'SHIPMENT' && <Car className="h-4 w-4 text-cyan-400 shrink-0" />}
                            {card.type === 'CONTAINER' && <Package className="h-4 w-4 text-blue-400 shrink-0" />}
                            {card.type === 'DISPATCH' && <Truck className="h-4 w-4 text-purple-400 shrink-0" />}
                            {card.type === 'TRANSIT' && <Truck className="h-4 w-4 text-amber-400 shrink-0" />}
                            {card.type === 'LEDGER' && <DollarSign className="h-4 w-4 text-emerald-400 shrink-0" />}
                            {card.type === 'INVOICE' && <FileText className="h-4 w-4 text-yellow-400 shrink-0" />}
                            {card.type === 'CARRIER' && <Building2 className="h-4 w-4 text-indigo-400 shrink-0" />}
                            {card.type === 'DAMAGE' && <ShieldAlert className="h-4 w-4 text-red-400 shrink-0" />}
                            {card.type === 'WHATSAPP' && <MessageSquare className="h-4 w-4 text-emerald-400 shrink-0" />}
                            {card.type === 'TOKEN' && <KeyRound className="h-4 w-4 text-amber-400 shrink-0" />}

                            <div>
                              <p className="font-bold text-[var(--text-primary)] text-xs">{card.title}</p>
                              {card.subtitle && (
                                <p className="text-[10px] text-[var(--text-secondary)]">{card.subtitle}</p>
                              )}
                            </div>
                          </div>

                          {card.badge && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                card.badge.tone === 'success'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : card.badge.tone === 'warning'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : card.badge.tone === 'danger'
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              }`}
                            >
                              {card.badge.label}
                            </span>
                          )}
                        </div>

                        {card.metrics && card.metrics.length > 0 && (
                          <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px]">
                            {card.metrics.map((met, mIdx) => (
                              <div key={mIdx} className="rounded bg-[var(--card)] px-2 py-1 border border-[var(--border)]/40">
                                <span className="text-[var(--text-secondary)] block text-[9px]">{met.label}</span>
                                <span className="font-semibold text-[var(--text-primary)]">{met.value}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-1 border-t border-[var(--border)]/50">
                          {card.primaryAction && (
                            <button
                              type="button"
                              onClick={() => handleCardAction(card, true)}
                              className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent-gold)] px-2.5 py-1 text-[10px] font-bold text-white hover:brightness-110 transition-all shadow-xs"
                            >
                              <span>{card.primaryAction.label}</span>
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          )}
                          {card.secondaryAction && (
                            <button
                              type="button"
                              onClick={() => handleCardAction(card, false)}
                              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition-all"
                            >
                              <span>{card.secondaryAction.label}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white">
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-xs text-[var(--text-secondary)] flex items-center gap-2">
                <span>Executing operations task...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="border-t border-[var(--border)] bg-[var(--card)] p-3.5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything or execute tasks (e.g. search VIN, draft WhatsApp, active containers, carriers...)"
              className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)]/70 focus:border-[var(--accent-gold)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-gold)] transition-all"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-white hover:brightness-110 disabled:opacity-40 transition-all shadow-md shadow-amber-500/20 shrink-0"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Send className="h-4 w-4 text-white" />}
            </button>
          </form>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-[var(--text-secondary)] px-1">
            <span>Powered by JACXI AI Operations Engine</span>
            <span>Shortcut: <strong>Ctrl + J</strong></span>
          </div>
        </div>
      </div>
    </>
  );
}
export default AdminCopilotDrawer;
