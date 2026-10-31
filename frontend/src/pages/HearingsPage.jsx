import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  Plus,
  Clock,
  MapPin,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Edit,
} from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { LexBuddy } from '../components/mascot/LexBuddy';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingSkeleton,
  PageHeader,
  Select,
  Textarea,
} from '../components/ui';
import { api } from '../lib/api';
import { useToast } from '../hooks/useToast';
import { formatDate, formatDay } from '../utils/format';

export default function HearingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();
  const queryClient = useQueryClient();

  const [scope, setScope] = useState('upcoming'); // 'upcoming' | 'past' | ''
  const [page, setPage] = useState(1);

  // Modals
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingHearing, setEditingHearing] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  // Schedule form state
  const [schedCaseId, setSchedCaseId] = useState('');
  const [schedDate, setSchedDate] = useState('');
  const [schedCourt, setSchedCourt] = useState('');
  const [schedType, setSchedType] = useState('Hearing');
  const [schedNotes, setSchedNotes] = useState('');

  // Reschedule / Edit form state
  const [editDate, setEditDate] = useState('');
  const [editCourt, setEditCourt] = useState('');
  const [editType, setEditType] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editOutcome, setEditOutcome] = useState('');

  // Fetch Cases for selector
  const { data: casesData } = useQuery({
    queryKey: ['cases-for-hearings'],
    queryFn: async () => {
      const res = await api.get('/cases?limit=100');
      return res.data.items || [];
    },
  });

  // Fetch Hearings
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['hearings', scope, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
      });
      if (scope) params.set('scope', scope);
      const res = await api.get(`/hearings?${params.toString()}`);
      return res.data;
    },
  });

  // Mutations
  const scheduleMutation = useMutation({
    mutationFn: async (payload) => {
      return api.post('/hearings', payload);
    },
    onSuccess: () => {
      push('Court hearing scheduled');
      setShowScheduleModal(false);
      resetScheduleForm();
      queryClient.invalidateQueries({ queryKey: ['hearings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err) => push(err.message || 'Failed to schedule hearing'),
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      return api.patch(`/hearings/${id}`, payload);
    },
    onSuccess: () => {
      push('Hearing details updated');
      setEditingHearing(null);
      queryClient.invalidateQueries({ queryKey: ['hearings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err) => push(err.message || 'Failed to update hearing'),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id) => {
      return api.post(`/hearings/${id}/cancel`, {});
    },
    onSuccess: () => {
      push('Hearing marked cancelled');
      setCancellingId(null);
      queryClient.invalidateQueries({ queryKey: ['hearings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err) => push(err.message || 'Failed to cancel hearing'),
  });

  function resetScheduleForm() {
    setSchedCaseId('');
    setSchedDate('');
    setSchedCourt('');
    setSchedType('Hearing');
    setSchedNotes('');
  }

  function handleScheduleSubmit(e) {
    e.preventDefault();
    if (!schedCaseId || !schedDate) return;
    scheduleMutation.mutate({
      caseId: schedCaseId,
      scheduledAt: new Date(schedDate).toISOString(),
      court: schedCourt,
      hearingType: schedType,
      notes: schedNotes,
    });
  }

  function openEdit(hearing) {
    setEditingHearing(hearing);
    setEditDate(
      hearing.scheduledAt ? new Date(hearing.scheduledAt).toISOString().slice(0, 16) : '',
    );
    setEditCourt(hearing.court || '');
    setEditType(hearing.hearingType || 'Hearing');
    setEditNotes(hearing.notes || '');
    setEditOutcome(hearing.outcome || '');
  }

  function handleEditSubmit(e) {
    e.preventDefault();
    if (!editingHearing) return;
    editMutation.mutate({
      id: editingHearing._id,
      payload: {
        scheduledAt: editDate ? new Date(editDate).toISOString() : undefined,
        court: editCourt,
        hearingType: editType,
        notes: editNotes,
        outcome: editOutcome,
      },
    });
  }

  const hearings = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 15) || 1;
  const cases = casesData || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hearings & Court Calendar"
        subtitle="Track upcoming court listings, past orders, and preserve full date modification history."
        actions={
          <Button onClick={() => setShowScheduleModal(true)} className="gap-2">
            <Plus size={16} /> Schedule Hearing
          </Button>
        }
      />

      {/* Tabs */}
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setScope('upcoming');
              setPage(1);
            }}
            className={`rounded-control px-4 py-2 text-sm font-semibold transition ${
              scope === 'upcoming' ? 'bg-primary text-white' : 'bg-white text-navy hover:bg-cream'
            }`}
          >
            Upcoming Dates
          </button>
          <button
            type="button"
            onClick={() => {
              setScope('past');
              setPage(1);
            }}
            className={`rounded-control px-4 py-2 text-sm font-semibold transition ${
              scope === 'past' ? 'bg-primary text-white' : 'bg-white text-navy hover:bg-cream'
            }`}
          >
            Past Listings & Orders
          </button>
          <button
            type="button"
            onClick={() => {
              setScope('');
              setPage(1);
            }}
            className={`rounded-control px-4 py-2 text-sm font-semibold transition ${
              scope === '' ? 'bg-primary text-white' : 'bg-white text-navy hover:bg-cream'
            }`}
          >
            All Records
          </button>
        </div>

        <span className="text-xs text-muted">
          Showing {hearings.length} of {total} records
        </span>
      </Card>

      {/* Main Hearings List */}
      {isLoading ? (
        <div className="space-y-3">
          <LoadingSkeleton />
          <LoadingSkeleton />
          <LoadingSkeleton />
        </div>
      ) : isError ? (
        <ErrorState message={error?.message || 'Failed to load hearings.'} onRetry={refetch} />
      ) : hearings.length === 0 ? (
        <EmptyState
          title={
            scope === 'upcoming'
              ? 'No upcoming hearings scheduled'
              : scope === 'past'
              ? 'No past hearing records found'
              : 'No court hearings recorded'
          }
          body="All scheduled court dates appear in your practice calendar. Once recorded, changes to listing dates are strictly preserved."
          action={<Button onClick={() => setShowScheduleModal(true)}>Schedule Hearing</Button>}
        />
      ) : (
        <div className="space-y-3">
          {hearings.map((h) => {
            const isPast = new Date(h.scheduledAt) < new Date();
            const isCancelled = Boolean(h.cancelledAt);

            return (
              <Card key={h._id} className="transition hover:border-line">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">
                        {h.caseId?.internalId}
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate(`/app/cases/${h.caseId?._id}`)}
                        className="font-display text-base font-bold text-navy hover:text-primary hover:underline"
                      >
                        {h.caseId?.title || 'Matter'}
                      </button>
                      <Badge tone={isCancelled ? 'danger' : isPast ? 'default' : 'primary'}>
                        {isCancelled ? 'Cancelled' : h.hearingType || 'Hearing'}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
                      <span className="flex items-center gap-1 font-semibold text-navy">
                        <Clock size={14} className="text-primary" />
                        {formatDate(h.scheduledAt, user?.timezone)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={14} />
                        {h.court || h.caseId?.court || 'Court specified on file'}
                      </span>
                    </div>

                    {h.notes ? (
                      <p className="mt-2 text-xs text-navy/90">
                        <span className="font-semibold text-muted">Preparation Note: </span>
                        {h.notes}
                      </p>
                    ) : null}

                    {h.outcome ? (
                      <div className="mt-2 rounded-control bg-cream p-2.5 text-xs text-navy">
                        <span className="font-semibold text-primary">Order / Proceedings Outcome: </span>
                        {h.outcome}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                    <Button
                      variant="secondary"
                      onClick={() => openEdit(h)}
                      className="gap-1.5 text-xs"
                    >
                      <Edit size={14} /> Update / Record Order
                    </Button>
                    {!isCancelled ? (
                      <Button
                        variant="ghost"
                        onClick={() => setCancellingId(h._id)}
                        className="text-xs text-danger hover:bg-red-50"
                      >
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 ? (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted">
                Page {page} of {totalPages}
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

      {/* Schedule Hearing Modal */}
      {showScheduleModal ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-card bg-white p-6 shadow-card">
            <h2 className="font-display text-xl font-bold">Schedule Court Listing</h2>
            <form onSubmit={handleScheduleSubmit} className="mt-4 space-y-4">
              <Field label="Associated Legal Matter *">
                <Select
                  value={schedCaseId}
                  onChange={(e) => {
                    setSchedCaseId(e.target.value);
                    const selected = cases.find((c) => c._id === e.target.value);
                    if (selected?.court) setSchedCourt(selected.court);
                  }}
                  required
                >
                  <option value="">Select Matter</option>
                  {cases.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.internalId} — {c.title}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Listing Date & Time *">
                  <Input
                    type="datetime-local"
                    value={schedDate}
                    onChange={(e) => setSchedDate(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Hearing Nature">
                  <Select value={schedType} onChange={(e) => setSchedType(e.target.value)}>
                    <option value="Admission">Admission / Notice</option>
                    <option value="Motion">Interim Motion / Injunction</option>
                    <option value="Hearing">Regular Hearing / Arguments</option>
                    <option value="Evidence">Recording of Evidence</option>
                    <option value="Final Arguments">Final Disposal</option>
                    <option value="Judgment">Pronouncement</option>
                  </Select>
                </Field>
              </div>

              <Field label="Court / Bench / Location">
                <Input
                  value={schedCourt}
                  onChange={(e) => setSchedCourt(e.target.value)}
                  placeholder="Court No. 12, High Court"
                />
              </Field>

              <Field label="Listing Notes / Preparation Checklist">
                <Textarea
                  value={schedNotes}
                  onChange={(e) => setSchedNotes(e.target.value)}
                  placeholder="Board item number, counsel briefing, files to carry…"
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setShowScheduleModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={scheduleMutation.isPending}>
                  Save Schedule
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Edit / Reschedule Modal */}
      {editingHearing ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-card bg-white p-6 shadow-card">
            <h2 className="font-display text-xl font-bold">Update Hearing Record</h2>
            <p className="mt-1 text-xs text-muted">
              Any date alteration will be automatically logged to the audit history.
            </p>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Scheduled Date & Time">
                  <Input
                    type="datetime-local"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                  />
                </Field>
                <Field label="Nature">
                  <Select value={editType} onChange={(e) => setEditType(e.target.value)}>
                    <option value="Admission">Admission / Notice</option>
                    <option value="Motion">Interim Motion</option>
                    <option value="Hearing">Regular Hearing</option>
                    <option value="Evidence">Evidence</option>
                    <option value="Final Arguments">Final Arguments</option>
                    <option value="Judgment">Judgment</option>
                  </Select>
                </Field>
              </div>

              <Field label="Court / Bench">
                <Input value={editCourt} onChange={(e) => setEditCourt(e.target.value)} />
              </Field>

              <Field label="Listing / Reason for Date Change">
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Reason for adjournment, next date requested, or bench instructions…"
                />
              </Field>

              <Field label="Recorded Order / Outcome">
                <Textarea
                  value={editOutcome}
                  onChange={(e) => setEditOutcome(e.target.value)}
                  placeholder="Summary of court order: Notice issued, interim stay granted, next date fixed…"
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setEditingHearing(null)}>
                  Cancel
                </Button>
                <Button type="submit" loading={editMutation.isPending}>
                  Save Update
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Cancel Confirm Dialog */}
      <ConfirmDialog
        open={Boolean(cancellingId)}
        title="Cancel Court Listing?"
        body="This will record the listing as cancelled. The history will remain preserved in the audit log."
        confirmLabel="Cancel Hearing"
        danger
        onConfirm={() => cancelMutation.mutate(cancellingId)}
        onClose={() => setCancellingId(null)}
      />
    </div>
  );
}
