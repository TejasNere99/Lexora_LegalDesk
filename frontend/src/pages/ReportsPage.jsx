import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Briefcase, CheckCircle2, Clock, Users, Calendar, AlertTriangle } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { LexBuddy } from '../components/mascot/LexBuddy';
import {
  Badge,
  Card,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  Select,
} from '../components/ui';
import { api } from '../lib/api';
import { formatDay } from '../utils/format';

const TIMEFRAMES = [
  { id: '7', label: 'Last 7 Days', days: 7 },
  { id: '30', label: 'Last 30 Days', days: 30 },
  { id: '90', label: 'Last Quarter (90 Days)', days: 90 },
  { id: '365', label: 'Past Year', days: 365 },
];

export default function ReportsPage() {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState('30');
  const isAdmin = user?.role === 'admin';

  // Calculate from & to
  const days = Number(timeframe) || 30;
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const to = new Date().toISOString();

  // Fetch Reports
  const {
    data: reportData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['reports', timeframe],
    queryFn: async () => {
      const res = await api.get(`/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      return res.data;
    },
  });

  // Fetch Team Members to map workload IDs to names
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const res = await api.get('/team/members');
      return res.data.items || [];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Practice Reports & Analytics" />
        <div className="grid gap-4 sm:grid-cols-3">
          <LoadingSkeleton />
          <LoadingSkeleton />
          <LoadingSkeleton />
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <PageHeader title="Practice Reports & Analytics" />
        <ErrorState message={error?.message || 'Unable to load report data.'} onRetry={refetch} />
      </div>
    );
  }

  const { byStatus = {}, completed = 0, overdue = 0, workload = [] } = reportData || {};

  const totalCases = Object.values(byStatus).reduce((a, b) => a + b, 0);
  const activeCases = byStatus.active || 0;
  const pendingCases = byStatus.pending || 0;
  const onHoldCases = byStatus.on_hold || 0;
  const closedCases = byStatus.closed || 0;

  // Workload mapping
  const memberNameMap = {};
  teamMembers.forEach((m) => {
    memberNameMap[m._id] = m.name;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          title="Practice Insights & Workload"
          subtitle="Calm, permission-aware metrics for the five-lawyer chambers."
        />
        <div className="flex items-center gap-2 pb-6">
          <span className="text-xs text-muted">Period:</span>
          <Select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="min-h-9 w-48 text-xs font-semibold"
          >
            {TIMEFRAMES.map((tf) => (
              <option key={tf.id} value={tf.id}>
                {tf.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Top Banner / Philosophy */}
      <Card className="flex items-center gap-4 border-l-4 border-primary">
        <LexBuddy mood="focused" size="sm" />
        <p className="text-xs text-muted leading-relaxed sm:text-sm">
          Lexora practice insights prioritize matter quality, client responsiveness, and workload balance. We intentionally avoid competitive streaks and leaderboards that encourage rushed legal filings.
        </p>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Active Matter Portfolio</span>
            <Briefcase size={18} className="text-primary" />
          </div>
          <p className="mt-2 font-display text-3xl font-extrabold text-navy">{activeCases + pendingCases}</p>
          <p className="mt-1 text-xs text-muted">
            {activeCases} ongoing litigation • {pendingCases} pending filings
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Tasks Completed In Period</span>
            <CheckCircle2 size={18} className="text-success" />
          </div>
          <p className="mt-2 font-display text-3xl font-extrabold text-success">{completed}</p>
          <p className="mt-1 text-xs text-muted">Completed filings, memos, and client updates</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Overdue Tasks</span>
            <AlertTriangle size={18} className="text-warning" />
          </div>
          <p className="mt-2 font-display text-3xl font-extrabold text-danger">{overdue}</p>
          <p className="mt-1 text-xs text-muted">Action items requiring immediate attention</p>
        </Card>
      </div>

      {/* Case Portfolio Distribution */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="text-primary" size={20} />
            <h2 className="font-display text-lg font-bold">Matter Status Breakdown</h2>
          </div>
          <span className="text-xs text-muted">{totalCases} Total Matters Tracked</span>
        </div>

        {totalCases === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No cases registered yet.</p>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-success">Active Litigation ({activeCases})</span>
                <span>{Math.round((activeCases / totalCases) * 100)}%</span>
              </div>
              <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-cream">
                <div
                  className="h-full bg-success transition-all"
                  style={{ width: `${(activeCases / totalCases) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-primary">Pending / Pre-notice ({pendingCases})</span>
                <span>{Math.round((pendingCases / totalCases) * 100)}%</span>
              </div>
              <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-cream">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(pendingCases / totalCases) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-warning">On Hold / Stayed ({onHoldCases})</span>
                <span>{Math.round((onHoldCases / totalCases) * 100)}%</span>
              </div>
              <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-cream">
                <div
                  className="h-full bg-warning transition-all"
                  style={{ width: `${(onHoldCases / totalCases) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-muted">Closed / Disposed ({closedCases})</span>
                <span>{Math.round((closedCases / totalCases) * 100)}%</span>
              </div>
              <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-cream">
                <div
                  className="h-full bg-muted/60 transition-all"
                  style={{ width: `${(closedCases / totalCases) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Admin Workload Distribution */}
      {isAdmin ? (
        <Card className="space-y-4">
          <div className="flex items-center gap-2 border-b border-line pb-3">
            <Users className="text-primary" size={20} />
            <h2 className="font-display text-lg font-bold">Team Workload Distribution (Active Tasks)</h2>
          </div>
          <p className="text-xs text-muted">
            Monitored by practice administrators to prevent colleague burnout and ensure balanced court briefs.
          </p>

          {workload.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No open tasks assigned across the practice.</p>
          ) : (
            <div className="divide-y divide-line">
              {workload.map((w) => {
                const lawyerName = memberNameMap[w._id] || 'Unassigned / Former Member';
                return (
                  <div key={w._id} className="flex items-center justify-between py-3">
                    <span className="text-sm font-semibold text-navy">{lawyerName}</span>
                    <Badge tone={w.openTasks > 5 ? 'warning' : 'primary'}>
                      {w.openTasks} open {w.openTasks === 1 ? 'task' : 'tasks'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      ) : null}
    </div>
  );
}
