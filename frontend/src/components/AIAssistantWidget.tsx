import { useEffect, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Send, Sparkles, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { getApiBaseUrl, getPortalLabelFromPath, type PortalConfig } from '../lib/constants';
import { playUiTone } from '../lib/sound';
import { cn, getApiErrorMessage } from '../lib/utils';
import { useAuthStore } from '../store/authStore';

interface AssistantMetricSnapshot {
  activeEmployees: number;
  pendingLeaves: number;
  checkedInToday: number;
  pendingPayrollRuns: number;
  activeProjects: number;
  unreadNotifications: number;
}

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  actions?: string[];
}

const rolePrompts: Record<string, string[]> = {
  superAdmin: ['What needs executive attention?', 'Help me create secure credentials', 'Review access risks'],
  admin: ['Help me add an employee', 'Check leave approval steps', 'Guide payroll processing'],
  manager: ['Review my team priorities', 'Help approve leave', 'How should I update projects?'],
  employee: ['How do I apply for leave?', 'Help me update project status', 'Where is my payslip?'],
  recruiter: ['Help move candidates', 'How do I publish a job?', 'What hiring tasks are pending?'],
};

const AssistantMascot = ({ small = false }: { small?: boolean }) => (
  <span className={cn('assistant-bot', small && 'assistant-bot--sm')} aria-hidden="true">
    <span className="assistant-bot-antenna" />
    <span className="assistant-bot-face">
      <span className="assistant-bot-eyes">
        <span className="assistant-bot-eye" />
        <span className="assistant-bot-eye" />
      </span>
      <span className="assistant-bot-mouth" />
    </span>
  </span>
);

const buildIntro = (portalLabel: string, pageLabel: string, firstName?: string) =>
  `Hi${firstName ? ` ${firstName}` : ''}. I’m your NEXUS assistant for the ${portalLabel}. I can help with ${pageLabel.toLowerCase()} tasks, explain what to do next, and guide you through the right HRMS workflow.`;

const metricLabels: Array<{ key: keyof AssistantMetricSnapshot; label: string }> = [
  { key: 'activeEmployees', label: 'Employees' },
  { key: 'pendingLeaves', label: 'Leaves' },
  { key: 'checkedInToday', label: 'Checked in' },
  { key: 'activeProjects', label: 'Projects' },
  { key: 'unreadNotifications', label: 'Alerts' },
];

export const AIAssistantWidget = ({ portal }: { portal: PortalConfig }) => {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const pageLabel = getPortalLabelFromPath(user, location.pathname);
  const [isOpen, setIsOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [draft, setDraft] = useState('');
  const [metrics, setMetrics] = useState<AssistantMetricSnapshot | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>(rolePrompts[user?.role ?? 'employee'] ?? rolePrompts.employee);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'assistant-intro',
      role: 'assistant',
      text: buildIntro(portal.label, pageLabel, user?.firstName),
    },
  ]);

  useEffect(() => {
    setMessages((current) => {
      if (current.length > 1) {
        return current;
      }
      return [
        {
          id: 'assistant-intro',
          role: 'assistant',
          text: buildIntro(portal.label, pageLabel, user?.firstName),
        },
      ];
    });
  }, [pageLabel, portal.label, user?.firstName]);

  const streamMessage = async (message: string) => {
    const assistantId = `assistant-${Date.now()}`;
    setMessages((current) => [...current, { id: assistantId, role: 'assistant', text: '' }]);
    setIsStreaming(true);

    const appendText = (token: string) =>
      setMessages((current) =>
        current.map((item) => (item.id === assistantId ? { ...item, text: item.text + token } : item)),
      );

    try {
      const response = await fetch(`${getApiBaseUrl()}/assistant/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ message, portal: portal.label, pageLabel, pathname: location.pathname }),
      });

      if (!response.ok || !response.body) {
        throw new Error('The assistant service is unavailable.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let received = false;

      for (;;) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const event of events) {
          const dataLine = event.split('\n').find((line) => line.startsWith('data: '));
          if (!dataLine) {
            continue;
          }

          const payload = JSON.parse(dataLine.slice(6)) as {
            type: 'start' | 'token' | 'done' | 'error';
            value?: string;
            message?: string;
            actions?: string[];
            suggestions?: string[];
            context?: { metrics: AssistantMetricSnapshot };
          };

          if (payload.type === 'start' && payload.context?.metrics) {
            setMetrics(payload.context.metrics);
          } else if (payload.type === 'token' && payload.value) {
            received = true;
            appendText(payload.value);
          } else if (payload.type === 'done') {
            if (payload.context?.metrics) {
              setMetrics(payload.context.metrics);
            }
            if (payload.suggestions) {
              setSuggestions(payload.suggestions);
            }
            if (payload.actions) {
              setMessages((current) =>
                current.map((item) => (item.id === assistantId ? { ...item, actions: payload.actions } : item)),
              );
            }
          } else if (payload.type === 'error') {
            appendText(payload.message ?? 'Something went wrong.');
          }
        }
      }

      if (received) {
        playUiTone('success');
      } else {
        appendText('I could not generate a response just now. Please try again.');
      }
    } catch (error) {
      setMessages((current) =>
        current.map((item) =>
          item.id === assistantId
            ? { ...item, text: getApiErrorMessage(error, 'I could not reach the assistant service. Please try again.') }
            : item,
        ),
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const submitMessage = (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || isStreaming) {
      return;
    }

    setMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        text: trimmed,
      },
    ]);
    setDraft('');
    void streamMessage(trimmed);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitMessage(draft);
  };

  const toggleOpen = () => {
    setIsOpen((current) => !current);
    playUiTone('soft');
  };

  return (
    <div className="fixed bottom-5 right-5 z-[90]">
      <AnimatePresence>
        {isOpen ? (
          <motion.section
            initial={{ opacity: 0, y: 28, scale: 0.94, rotateX: -10 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, y: 22, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 220, damping: 24 }}
            className="mb-4 flex max-h-[calc(100vh-7rem)] w-[min(calc(100vw-2rem),24rem)] flex-col overflow-hidden rounded-3xl border border-[color:var(--color-card-border)] bg-[color:var(--color-card-bg)] text-[color:var(--color-text)] shadow-[0_28px_80px_rgba(8,6,18,0.45)] backdrop-blur-2xl"
          >
            <div className="shrink-0 border-b border-white/10 bg-white/[0.045] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="assistant-mini-orb">
                    <AssistantMascot small />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">NEXUS AI Assistant</p>
                    <p className="text-xs text-white/50">{portal.label} - {pageLabel}</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close assistant"
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {metrics ? (
                <div className="mt-4 grid grid-cols-5 gap-2">
                  {metricLabels.map((metric) => (
                    <div key={metric.key} className="rounded-xl border border-white/8 bg-white/[0.045] px-2 py-2 text-center">
                      <p className="text-sm font-semibold text-accent">{metrics[metric.key]}</p>
                      <p className="mt-0.5 truncate text-[0.62rem] uppercase tracking-[0.14em] text-white/40">{metric.label}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((message) => (
                <div key={message.id} className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6',
                      message.role === 'user'
                        ? 'bg-primary text-white shadow-glow'
                        : 'border border-white/10 bg-white/[0.055] text-white/78',
                    )}
                  >
                    <p>{message.text}</p>
                    {message.actions?.length ? (
                      <div className="mt-3 space-y-1.5">
                        {message.actions.map((action) => (
                          <div key={action} className="flex items-center gap-2 text-xs text-white/55">
                            <Sparkles className="h-3.5 w-3.5 text-accent" />
                            <span>{action}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
              {isStreaming && messages[messages.length - 1]?.text === '' ? (
                <div className="flex items-center gap-2 text-sm text-white/50">
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  Reading live HRMS context...
                </div>
              ) : null}
            </div>

            <div className="shrink-0 border-t border-white/10 p-4">
              <div className="mb-3 flex flex-wrap gap-2">
                {suggestions.slice(0, 3).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs text-white/62 transition hover:border-secondary/60 hover:text-white"
                    onClick={() => submitMessage(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              <form className="flex items-end gap-2" onSubmit={handleSubmit}>
                <textarea
                  value={draft}
                  rows={2}
                  placeholder="Ask about this page, your role, or what to do next..."
                  className="min-h-[3.25rem] flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-secondary"
                  onChange={(event) => setDraft(event.target.value)}
                />
                <Button type="submit" className="h-[3.25rem] rounded-2xl px-4" disabled={isStreaming || !draft.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      {!isOpen ? (
        <motion.button
          type="button"
          aria-label="Open AI assistant"
          className="assistant-fab"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleOpen}
        >
          <AssistantMascot />
        </motion.button>
      ) : null}
    </div>
  );
};
