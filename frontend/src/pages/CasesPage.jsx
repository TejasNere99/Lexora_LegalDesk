import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Briefcase, Calendar, ShieldCheck, Filter } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { LexBuddy } from '../components/mascot/LexBuddy';
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  MobileRecordCard,
  PageHeader,
  SearchInput,
  Select,
} from '../components/ui';
import { api } from '../lib/api';
import { formatDay, statusLabel } from '../utils/format';

const STATUS_TABS = [
  { id: '', label: 'All Matters' },
  { id: 'active', label: 'Active' },
  { id: 'pending', label: 'Pending' },
  { id: 'on_hold', label: 'On Hold' },
  { id: 'closed', label: 'Closed' },
  { id: 'archived', label: 'Archived' },
];

export default function CasesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [page, setPage] = useState(1);
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [priority, setPriority] = useState('');

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['cases', page, q, status, priority],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
      });
      if (q) params.set('q', q);
      if (status === 'archived') {
        params.set('archived', 'true');
      } else if (status) {
        params.set('status', status);
      }
      if (priority) params.set('priority', priority);

      const res = await api.get(`/cases?${params.toString()}`);
      return res.data;
    },
  });

  const cases = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 15) || 1;

  const priorityTones = {
    urgent: 'danger',
    high: 'warning',
    normal: 'default',
    low: 'default',
  };

  const statusTones = {
    active: 'success',
    pending: 'primary',
    on_hold: 'warning',
    closed: 'default',
    archived: 'danger',
  };

  const columns = [
    {
      key: 'internalId',
      header: 'Case ID',
      render: (c) => <span className="font-mono text-xs font-bold text-primary">{c.internalId}</span>,
    },
    {
      key: 'title',
      header: 'Matter Title',
      render: (c) => (
        <div>
          <p className="font-semibold text-navy">{c.title}</p>
          <p className="text-xs text-muted">
            {c.caseNumber ? `No: ${c.caseNumber} • ` : ''}
            {c.caseType || 'General'}
          </p>
        </div>
      ),
    },
    {
      key: 'clients',
      header: 'Client',
      render: (c) => {
        const names = (c.clientIds || []).map((cl) => (typeof cl === 'object' ? cl.name : 'Client')).join(', ');
        return <span className="text-sm font-medium">{names || '—'}</span>;
      },
    },
    {
      key: 'court',
      header: 'Court / Forum',
      render: (c) => c.court || '—',
    },
    {
      key: 'assigned',
      header: 'Lead Lawyer',
      render: (c) => c.assignedLawyerId?.name || 'Unassigned',
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (c) => (
        <Badge tone={priorityTones[c.priority] || 'default'}>
          {c.priority || 'normal'}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => (
        <Badge tone={statusTones[c.status] || 'default'}>
          {c.status}
        </Badge>
      ),
    },
    {
      key: 'nextHearing',
      header: 'Next Hearing',
      render: (c) => (c.nextHearingAt ? formatDay(c.nextHearingAt, user?.timezone) : '—'),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cases & Matters"
        subtitle="Confidential legal practice matters with role-scoped workspace access."
        actions={
          <Button onClick={() => navigate('/app/cases/new')} className="gap-2">
            <Plus size={16} /> Open New Case
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <Card className="space-y-4">
        {/* Status Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-line pb-3">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setStatus(tab.id);
                setPage(1);
              }}
              className={`rounded-control px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
                status === tab.id ? 'bg-primary text-white' : 'bg-white text-navy hover:bg-cream'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full max-w-sm">
            <SearchInput
              placeholder="Search title, case ID, or court number…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted">Priority:</span>
            <Select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
              className="min-h-9 w-32 text-xs"
            >
              <option value="">All</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Cases List */}
      {isLoading ? (
        <div className="space-y-3">
          <LoadingSkeleton />
          <LoadingSkeleton />
          <LoadingSkeleton />
        </div>
      ) : isError ? (
        <ErrorState message={error?.message || 'Failed to load case register.'} onRetry={refetch} />
      ) : cases.length === 0 ? (
        <EmptyState
          title={q ? 'No cases match your filters' : 'No legal matters registered'}
          body={
            q
              ? 'Try adjusting your search terms or clearing status filters.'
              : 'Open your first legal matter to track court hearings, assign team members, and manage deadlines.'
          }
          action={
            !q && !status ? (
              <Button onClick={() => navigate('/app/cases/new')}>Open First Case</Button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-4">
          {/* Desktop Table */}
          <DataTable
            columns={columns}
            rows={cases.map((c) => ({ ...c, id: c._id }))}
            onRowClick={(c) => navigate(`/app/cases/${c.id}`)}
          />

          {/* Mobile Cards */}
          <div className="space-y-2 md:hidden">
            {cases.map((c) => (
              <MobileRecordCard
                key={c._id}
                title={c.title}
                meta={`${c.internalId} • ${c.court || 'Court pending'} • Lawyer: ${c.assignedLawyerId?.name || 'Unassigned'}`}
                badge={<Badge tone={statusTones[c.status] || 'default'}>{c.status}</Badge>}
                onClick={() => navigate(`/app/cases/${c._id}`)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 ? (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted">
                Showing page {page} of {totalPages} ({total} matters)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  className="min-h-9 px-3 text-xs"
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  className="min-h-9 px-3 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
