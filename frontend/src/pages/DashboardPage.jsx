import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { LexBuddy } from '../components/mascot/LexBuddy';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  StatCard,
} from '../components/ui';
import { api } from '../lib/api';
import { useToast } from '../hooks/useToast';
import { formatDate, formatDay, statusLabel } from '../utils/format';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const res = await api.get('/dashboard/summary');
      return res.data;
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (taskId) => {
      return api.post(`/tasks/${taskId}/complete`, {});
    },
    onSuccess: () => {
      push('Task completed! Great progress.');
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err) => {
      push(err.message || 'Failed to complete task');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Practice Dashboard" subtitle="Loading your workspace insights…" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <LoadingSkeleton />
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
      <div className="space-y-6">
        <PageHeader title="Practice Dashboard" />
        <ErrorState message={error?.message || 'Unable to load practice dashboard.'} onRetry={refetch} />
      </div>
    );
  }

  const {
    activeCases = 0,
    todayHearings = 0,
    pendingTasks = 0,
    overdueTasks = 0,
    followUps = 0,
    cards = {},
  } = data || {};

  const todayHearingsList = cards.todayHearings || [];
  const overdueTasksList = cards.overdueTasks || [];
  const upcomingHearingsList = cards.upcomingHearings || [];
  const followUpsList = cards.followUps || [];
  const recentCasesList = cards.recentCases || [];

  // Determine contextual mascot mood and message
  let mascotMood = 'happy';
  let mascotMsg = `Welcome back, ${user?.name || 'Advocate'}! One workspace, every case, team in sync.`;
  if (overdueTasks > 0) {
    mascotMood = 'reminder';
    mascotMsg = `You have ${overdueTasks} overdue ${overdueTasks === 1 ? 'task' : 'tasks'} requiring attention today.`;
  } else if (todayHearings > 0) {
    mascotMood = 'focused';
    mascotMsg = `You have ${todayHearings} court ${todayHearings === 1 ? 'hearing' : 'hearings'} scheduled today. Let's make sure you're ready!`;
  }

  return (
    <div className="space-y-6">
      {/* Top greeting with LexBuddy */}
      <Card className="flex flex-col items-start justify-between gap-4 border-l-4 border-primary sm:flex-row sm:items-center">
        <LexBuddy mood={mascotMood} size="md" showMessage message={mascotMsg} />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => navigate('/app/cases/new')} className="gap-1.5 text-xs sm:text-sm">
            <Plus size={16} /> New Case
          </Button>
          <Button variant="secondary" onClick={() => navigate('/app/tasks')} className="gap-1.5 text-xs sm:text-sm">
            <Plus size={16} /> Add Task
          </Button>
        </div>
      </Card>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Active Cases" value={activeCases} onClick={() => navigate('/app/cases')} />
        <StatCard label="Today's Hearings" value={todayHearings} onClick={() => navigate('/app/hearings')} />
        <StatCard label="Pending Tasks" value={pendingTasks} onClick={() => navigate('/app/tasks')} />
        <StatCard label="Overdue Tasks" value={overdueTasks} onClick={() => navigate('/app/tasks')} />
        <StatCard label="Client Follow-ups" value={followUps} onClick={() => navigate('/app/clients')} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Hearings */}
        <Card>
          <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="text-primary" size={20} />
              <h2 className="font-display text-lg font-bold">Today's Hearings</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/app/hearings')}
              className="text-xs font-semibold text-primary hover:underline"
            >
              View all hearings
            </button>
          </div>

          {todayHearingsList.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No court hearings scheduled for today.</p>
          ) : (
            <div className="divide-y divide-line">
              {todayHearingsList.map((h) => (
                <div key={h._id} className="flex items-start justify-between py-3">
                  <div>
                    <button
                      type="button"
                      onClick={() => navigate(`/app/cases/${h.caseId?._id}`)}
                      className="font-semibold text-navy hover:text-primary hover:underline"
                    >
                      {h.caseId?.title || 'Matter'}
                    </button>
                    <p className="text-xs text-muted">
                      {h.caseId?.internalId} • {h.court || 'Court specified on file'}
                    </p>
                  </div>
                  <Badge tone="primary">{formatDate(h.scheduledAt, user?.timezone)}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Urgent & Overdue Tasks */}
        <Card>
          <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-warning" size={20} />
              <h2 className="font-display text-lg font-bold">Overdue & Immediate Tasks</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/app/tasks')}
              className="text-xs font-semibold text-primary hover:underline"
            >
              View all tasks
            </button>
          </div>

          {overdueTasksList.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <CheckCircle2 className="text-success" size={28} />
              <p className="mt-2 text-sm font-medium text-navy">All clear! No overdue tasks.</p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {overdueTasksList.map((t) => (
                <div key={t._id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label="Mark task complete"
                      onClick={() => completeMutation.mutate(t._id)}
                      disabled={completeMutation.isPending}
                      className="h-5 w-5 rounded border border-line hover:border-success hover:bg-emerald-50"
                    />
                    <div>
                      <p className="text-sm font-semibold">{t.title}</p>
                      <p className="text-xs text-danger">Due: {formatDay(t.dueAt, user?.timezone)}</p>
                    </div>
                  </div>
                  <Badge tone={t.priority === 'urgent' ? 'danger' : 'warning'}>
                    {t.priority}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Schedule & Hearings */}
        <Card>
          <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <Clock className="text-primary" size={20} />
              <h2 className="font-display text-lg font-bold">Upcoming Court Dates (7 Days)</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/app/hearings')}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Open calendar
            </button>
          </div>

          {upcomingHearingsList.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No upcoming court hearings in the next 7 days.</p>
          ) : (
            <div className="divide-y divide-line">
              {upcomingHearingsList.map((h) => (
                <div key={h._id} className="flex items-center justify-between py-3">
                  <div>
                    <button
                      type="button"
                      onClick={() => navigate(`/app/cases/${h.caseId?._id}`)}
                      className="text-sm font-semibold hover:text-primary hover:underline"
                    >
                      {h.caseId?.title || 'Case'}
                    </button>
                    <p className="text-xs text-muted">
                      {h.caseId?.internalId} • {h.court || 'Court specified on file'}
                    </p>
                  </div>
                  <Badge tone="default">{formatDay(h.scheduledAt, user?.timezone)}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recently Updated Cases */}
        <Card>
          <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <Briefcase className="text-primary" size={20} />
              <h2 className="font-display text-lg font-bold">Recently Updated Cases</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/app/cases')}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Browse all
            </button>
          </div>

          {recentCasesList.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No cases registered yet.</p>
          ) : (
            <div className="divide-y divide-line">
              {recentCasesList.map((c) => (
                <div
                  key={c._id}
                  onClick={() => navigate(`/app/cases/${c._id}`)}
                  className="group flex cursor-pointer items-center justify-between py-3 hover:bg-cream/40"
                >
                  <div>
                    <p className="text-sm font-semibold group-hover:text-primary">{c.title}</p>
                    <p className="text-xs text-muted">{c.internalId}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={c.status === 'active' ? 'success' : 'default'}>
                      {c.status}
                    </Badge>
                    <ArrowRight size={14} className="text-muted group-hover:text-primary" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Client Follow-ups bar */}
      {followUpsList.length > 0 ? (
        <Card className="border border-line bg-amber-50/40">
          <div className="flex items-center gap-2 pb-2">
            <UserCheck className="text-warning" size={18} />
            <h3 className="font-display text-sm font-bold text-navy">Pending Client Follow-ups</h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {followUpsList.map((client) => (
              <div
                key={client._id}
                onClick={() => navigate(`/app/clients/${client._id}`)}
                className="cursor-pointer rounded-control bg-white p-3 shadow-sm hover:border-primary"
              >
                <p className="text-sm font-semibold">{client.name}</p>
                <p className="text-xs text-muted">Follow-up: {formatDay(client.nextFollowUpAt, user?.timezone)}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
