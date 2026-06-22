import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, LogOut, Plane, UserCheck, UserX, Users, X } from 'lucide-react';
import { api } from '../lib/api';
import { cn } from '../lib/utils';

interface LiveActivity {
  serverTime: string;
  totalActive: number;
  present: number;
  stillWorking: number;
  signedOut: number;
  late: number;
  onLeave: number;
  notCheckedIn: number;
  attendanceRate: number;
}

interface LiveActivityEntry {
  id: string;
  name: string;
  code: string;
  meta: string;
}

const rows = [
  { key: 'stillWorking', label: 'Currently working', icon: UserCheck, tone: 'text-emerald-300' },
  { key: 'present', label: 'Present today', icon: Users, tone: 'text-secondary' },
  { key: 'signedOut', label: 'Signed out', icon: LogOut, tone: 'text-sky-300' },
  { key: 'onLeave', label: 'On leave', icon: Plane, tone: 'text-amber-300' },
  { key: 'late', label: 'Late arrivals', icon: Clock, tone: 'text-orange-300' },
  { key: 'notCheckedIn', label: 'Not checked in', icon: UserX, tone: 'text-white/50' },
] as const;

export const LiveActivityPanel = () => {
  const [clock, setClock] = useState(() => new Date());
  const [openCategory, setOpenCategory] = useState<{ key: string; label: string } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics-live'],
    queryFn: async () => {
      const response = await api.get('/analytics/live');
      return response.data.data as LiveActivity;
    },
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const detailQuery = useQuery({
    queryKey: ['analytics-live-detail', openCategory?.key],
    enabled: Boolean(openCategory),
    queryFn: async () => {
      const response = await api.get(`/analytics/live/${openCategory!.key}`);
      return response.data.data as LiveActivityEntry[];
    },
  });

  const timeString = clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const dateString = clock.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' });

  return (
    <>
      <aside className="flex h-fit flex-col gap-4 rounded-3xl border border-white/12 bg-[linear-gradient(180deg,rgba(127,99,244,0.16),rgba(255,255,255,0.03))] p-5 text-white shadow-panel">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Live</p>
          </div>
          <p className="text-xs text-white/45">{dateString}</p>
        </div>

        <div>
          <p className="font-mono text-3xl font-bold tracking-tight text-white">{timeString}</p>
          <p className="mt-1 text-xs text-white/45">Company activity, synchronized in real time</p>
        </div>

        {isError ? (
          <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200">
            Live data is unavailable right now.
          </p>
        ) : (
          <>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/45">Attendance</p>
                  <p className="mt-1 text-2xl font-bold text-white">{data?.attendanceRate ?? 0}%</p>
                </div>
                <p className="text-sm text-white/50">
                  {data?.present ?? 0}/{data?.totalActive ?? 0} in
                </p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-700"
                  style={{ width: `${data?.attendanceRate ?? 0}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              {rows.map((row) => {
                const Icon = row.icon;
                const value = data ? data[row.key] : 0;
                return (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() => setOpenCategory({ key: row.key, label: row.label })}
                    className="flex w-full items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-left transition hover:border-secondary/50 hover:bg-white/[0.06]"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={cn('grid h-7 w-7 place-items-center rounded-lg bg-white/6', row.tone)}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-sm text-white/70">{row.label}</span>
                    </div>
                    <span className={cn('text-base font-bold tabular-nums', row.tone)}>{isLoading ? '—' : value}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-center text-[0.65rem] text-white/35">Tap any item to see who&apos;s in it</p>
          </>
        )}
      </aside>

      {openCategory ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setOpenCategory(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-[color:var(--color-card-border)] bg-[color:var(--color-card-bg)] p-5 text-[color:var(--color-text)] shadow-[0_28px_80px_rgba(8,6,18,0.5)] backdrop-blur-sm"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold">{openCategory.label}</h4>
                <p className="text-xs text-white/45">{detailQuery.data?.length ?? 0} employee(s)</p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpenCategory(null)}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 max-h-[60vh] space-y-2 overflow-y-auto">
              {detailQuery.isLoading ? (
                <p className="text-sm text-white/50">Loading...</p>
              ) : detailQuery.isError ? (
                <p className="text-sm text-rose-300">Could not load this list.</p>
              ) : (detailQuery.data ?? []).length === 0 ? (
                <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">
                  No employees in this category right now.
                </p>
              ) : (
                (detailQuery.data ?? []).map((employee) => (
                  <div
                    key={employee.id}
                    className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{employee.name}</p>
                      {employee.code ? <p className="text-xs text-white/45">{employee.code}</p> : null}
                    </div>
                    {employee.meta ? <span className="ml-3 shrink-0 text-xs text-white/60">{employee.meta}</span> : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
