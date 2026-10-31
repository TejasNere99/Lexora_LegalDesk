import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, UserCircle2, Phone, Mail, Calendar } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { LexBuddy } from '../components/mascot/LexBuddy';
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingSkeleton,
  MobileRecordCard,
  PageHeader,
  SearchInput,
  Select,
  Textarea,
} from '../components/ui';
import { api } from '../lib/api';
import { useToast } from '../hooks/useToast';
import { formatDay } from '../utils/format';

export default function ClientsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [nextFollowUpAt, setNextFollowUpAt] = useState('');
  const [assignedLawyerId, setAssignedLawyerId] = useState('');
  const [formError, setFormError] = useState('');

  // Fetch team members for assignment
  const { data: teamData } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const res = await api.get('/team/members');
      return res.data.items || [];
    },
  });
  const lawyers = (teamData || []).filter((m) => m.isActive);

  // Fetch clients
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['clients', page, q, showArchived],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        archived: showArchived ? 'true' : 'false',
      });
      if (q) params.set('q', q);
      const res = await api.get(`/clients?${params.toString()}`);
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      return api.post('/clients', payload);
    },
    onSuccess: (res) => {
      push('Client created successfully');
      setShowCreateModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      navigate(`/app/clients/${res.data.client._id}`);
    },
    onError: (err) => {
      setFormError(err.message || 'Failed to create client');
    },
  });

  function resetForm() {
    setName('');
    setEmail('');
    setPhone('');
    setNotes('');
    setNextFollowUpAt('');
    setAssignedLawyerId('');
    setFormError('');
  }

  function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Client name is required');
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      notes: notes.trim() || undefined,
      assignedLawyerId: assignedLawyerId || undefined,
      nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt).toISOString() : undefined,
    });
  }

  const clients = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 15) || 1;

  const columns = [
    {
      key: 'name',
      header: 'Client Name',
      render: (c) => (
        <div>
          <p className="font-semibold text-navy">{c.name}</p>
          {c.notes ? <p className="line-clamp-1 text-xs text-muted">{c.notes}</p> : null}
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (c) => (
        <div className="space-y-0.5 text-xs text-muted">
          {c.phone ? <p className="flex items-center gap-1"><Phone size={12} /> {c.phone}</p> : null}
          {c.email ? <p className="flex items-center gap-1"><Mail size={12} /> {c.email}</p> : null}
          {!c.phone && !c.email ? '—' : null}
        </div>
      ),
    },
    {
      key: 'assigned',
      header: 'Assigned Lawyer',
      render: (c) => c.assignedLawyerId?.name || 'Unassigned',
    },
    {
      key: 'followUp',
      header: 'Next Follow-up',
      render: (c) => (c.nextFollowUpAt ? formatDay(c.nextFollowUpAt, user?.timezone) : '—'),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => (
        <Badge tone={c.archivedAt ? 'danger' : 'success'}>
          {c.archivedAt ? 'Archived' : 'Active'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        subtitle="Manage client details, contact history, and practice follow-ups."
        actions={
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus size={16} /> New Client
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full max-w-sm">
          <SearchInput
            placeholder="Search by client name…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowArchived(false);
              setPage(1);
            }}
            className={`rounded-control px-3 py-1.5 text-sm font-semibold transition ${
              !showArchived ? 'bg-primary text-white' : 'bg-white text-navy hover:bg-cream'
            }`}
          >
            Active ({total && !showArchived ? total : '•'})
          </button>
          <button
            type="button"
            onClick={() => {
              setShowArchived(true);
              setPage(1);
            }}
            className={`rounded-control px-3 py-1.5 text-sm font-semibold transition ${
              showArchived ? 'bg-primary text-white' : 'bg-white text-navy hover:bg-cream'
            }`}
          >
            Archived
          </button>
        </div>
      </Card>

      {/* Main Content */}
      {isLoading ? (
        <div className="space-y-3">
          <LoadingSkeleton />
          <LoadingSkeleton />
          <LoadingSkeleton />
        </div>
      ) : isError ? (
        <ErrorState message={error?.message || 'Failed to load client directory.'} onRetry={refetch} />
      ) : clients.length === 0 ? (
        <EmptyState
          title={q ? 'No clients match your search' : showArchived ? 'No archived clients' : 'No clients registered yet'}
          body={
            q
              ? 'Try modifying your search query to find the client.'
              : 'Add your practice clients to manage matters, schedule follow-ups, and track contact notes in one place.'
          }
          action={
            !q && !showArchived ? (
              <Button onClick={() => setShowCreateModal(true)}>Register First Client</Button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-4">
          {/* Desktop Table */}
          <DataTable
            columns={columns}
            rows={clients.map((c) => ({ ...c, id: c._id }))}
            onRowClick={(c) => navigate(`/app/clients/${c.id}`)}
          />

          {/* Mobile Cards */}
          <div className="space-y-2 md:hidden">
            {clients.map((c) => (
              <MobileRecordCard
                key={c._id}
                title={c.name}
                meta={`${c.phone || c.email || 'No contact'} • Lawyer: ${c.assignedLawyerId?.name || 'Unassigned'}`}
                badge={<Badge tone={c.archivedAt ? 'danger' : 'success'}>{c.archivedAt ? 'Archived' : 'Active'}</Badge>}
                onClick={() => navigate(`/app/clients/${c._id}`)}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 ? (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted">
                Showing page {page} of {totalPages} ({total} total)
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

      {/* Create Client Modal */}
      {showCreateModal ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-card bg-white p-6 shadow-card">
            <h2 className="font-display text-xl font-bold">Register New Client</h2>
            <p className="mt-1 text-sm text-muted">
              Add contact and assignment details. You can link this client to legal cases later.
            </p>

            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <Field label="Client / Entity Name *" error={formError}>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Patel or Apex Logistics Ltd"
                  required
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Phone Number">
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </Field>
                <Field label="Email Address">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="client@example.com"
                  />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Assigned Lawyer">
                  <Select value={assignedLawyerId} onChange={(e) => setAssignedLawyerId(e.target.value)}>
                    <option value="">Default (Current User)</option>
                    {lawyers.map((l) => (
                      <option key={l._id} value={l._id}>
                        {l.name} ({l.role})
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Next Follow-up Date">
                  <Input
                    type="date"
                    value={nextFollowUpAt}
                    onChange={(e) => setNextFollowUpAt(e.target.value)}
                  />
                </Field>
              </div>

              <Field label="Internal Practice Notes">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Initial consultation summary, referral details, or matter context…"
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={createMutation.isPending}>
                  Save Client
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
