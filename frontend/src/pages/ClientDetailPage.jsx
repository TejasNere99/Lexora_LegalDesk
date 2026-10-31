import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  Clock,
  Plus,
  Edit2,
  Archive,
  RotateCcw,
  MessageSquare,
  Briefcase,
  User,
} from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
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

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { push } = useToast();
  const queryClient = useQueryClient();

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editAssignedLawyerId, setEditAssignedLawyerId] = useState('');
  const [editNextFollowUpAt, setEditNextFollowUpAt] = useState('');

  // Interaction form state
  const [intType, setIntType] = useState('call');
  const [intSummary, setIntSummary] = useState('');
  const [intOccurredAt, setIntOccurredAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [intFollowUpReq, setIntFollowUpReq] = useState(false);
  const [intFollowUpAt, setIntFollowUpAt] = useState('');

  // Fetch client details
  const {
    data: clientData,
    isLoading: clientLoading,
    isError: clientError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const res = await api.get(`/clients/${id}`);
      return res.data.client;
    },
  });

  // Fetch client interactions
  const { data: interactionsData } = useQuery({
    queryKey: ['client-interactions', id],
    queryFn: async () => {
      const res = await api.get(`/clients/${id}/interactions`);
      return res.data.items || [];
    },
    enabled: !!id,
  });

  // Fetch team members for assignment
  const { data: teamData } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const res = await api.get('/team/members');
      return res.data.items || [];
    },
  });
  const lawyers = (teamData || []).filter((m) => m.isActive);

  // Fetch client's linked cases
  const { data: casesData } = useQuery({
    queryKey: ['client-cases', id],
    queryFn: async () => {
      const res = await api.get(`/cases`);
      // filter cases that include this client
      const allCases = res.data.items || [];
      return allCases.filter((c) =>
        (c.clientIds || []).some((cl) => (typeof cl === 'object' ? cl._id === id : cl === id)),
      );
    },
    enabled: !!id,
  });

  // Mutations
  const editMutation = useMutation({
    mutationFn: async (payload) => {
      return api.patch(`/clients/${id}`, payload);
    },
    onSuccess: () => {
      push('Client updated');
      setShowEditModal(false);
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: (err) => push(err.message || 'Failed to update client'),
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      return api.post(`/clients/${id}/archive`, {});
    },
    onSuccess: (res) => {
      push(res.data.client?.archivedAt ? 'Client archived' : 'Client restored');
      setShowArchiveConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: (err) => push(err.message || 'Failed to archive client'),
  });

  const interactionMutation = useMutation({
    mutationFn: async (payload) => {
      return api.post('/interactions', payload);
    },
    onSuccess: () => {
      push('Interaction logged');
      setShowInteractionModal(false);
      setIntSummary('');
      setIntFollowUpReq(false);
      setIntFollowUpAt('');
      queryClient.invalidateQueries({ queryKey: ['client-interactions', id] });
      queryClient.invalidateQueries({ queryKey: ['client', id] });
    },
    onError: (err) => push(err.message || 'Failed to log interaction'),
  });

  function openEdit() {
    if (!clientData) return;
    setEditName(clientData.name || '');
    setEditEmail(clientData.email || '');
    setEditPhone(clientData.phone || '');
    setEditNotes(clientData.notes || '');
    setEditAssignedLawyerId(clientData.assignedLawyerId?._id || clientData.assignedLawyerId || '');
    setEditNextFollowUpAt(
      clientData.nextFollowUpAt ? new Date(clientData.nextFollowUpAt).toISOString().split('T')[0] : '',
    );
    setShowEditModal(true);
  }

  function handleEditSubmit(e) {
    e.preventDefault();
    editMutation.mutate({
      name: editName.trim(),
      email: editEmail.trim() || null,
      phone: editPhone.trim() || null,
      notes: editNotes.trim() || null,
      assignedLawyerId: editAssignedLawyerId || null,
      nextFollowUpAt: editNextFollowUpAt ? new Date(editNextFollowUpAt).toISOString() : null,
    });
  }

  function handleInteractionSubmit(e) {
    e.preventDefault();
    if (!intSummary.trim()) return;
    interactionMutation.mutate({
      clientId: id,
      type: intType,
      occurredAt: new Date(intOccurredAt).toISOString(),
      summary: intSummary.trim(),
      followUpRequired: intFollowUpReq,
      followUpAt: intFollowUpReq && intFollowUpAt ? new Date(intFollowUpAt).toISOString() : null,
    });
  }

  if (clientLoading) return <LoadingSkeleton />;
  if (clientError || !clientData) {
    return (
      <div className="space-y-4">
        <Button variant="secondary" onClick={() => navigate('/app/clients')} className="gap-2">
          <ArrowLeft size={16} /> Back to Clients
        </Button>
        <ErrorState message={error?.message || 'Client record not found or inaccessible.'} onRetry={refetch} />
      </div>
    );
  }

  const interactions = interactionsData || [];
  const linkedCases = casesData || [];

  return (
    <div className="space-y-6">
      {/* Top back navigation and actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => navigate('/app/clients')} className="gap-2 text-sm font-semibold">
          <ArrowLeft size={16} /> All Clients
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={openEdit} className="gap-1.5 text-xs sm:text-sm">
            <Edit2 size={14} /> Edit Profile
          </Button>
          <Button
            variant={clientData.archivedAt ? 'secondary' : 'ghost'}
            onClick={() => setShowArchiveConfirm(true)}
            className="gap-1.5 text-xs text-danger hover:bg-red-50 sm:text-sm"
          >
            {clientData.archivedAt ? <RotateCcw size={14} /> : <Archive size={14} />}
            {clientData.archivedAt ? 'Restore Client' : 'Archive'}
          </Button>
        </div>
      </div>

      {/* Client Overview Card */}
      <Card className="space-y-4">
        <div className="flex flex-col justify-between gap-2 border-b border-line pb-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold text-navy sm:text-3xl">{clientData.name}</h1>
              <Badge tone={clientData.archivedAt ? 'danger' : 'success'}>
                {clientData.archivedAt ? 'Archived' : 'Active Client'}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted">
              Responsible Lawyer: <span className="font-medium text-navy">{clientData.assignedLawyerId?.name || 'Unassigned'}</span>
            </p>
          </div>
          <Button onClick={() => setShowInteractionModal(true)} className="gap-2 self-start sm:self-center">
            <Plus size={16} /> Log Interaction
          </Button>
        </div>

        {/* Contact Info Pills */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-2 rounded-control bg-cream p-3 text-sm">
            <Phone size={16} className="text-primary" />
            <div>
              <p className="text-xs text-muted">Phone</p>
              <p className="font-semibold">{clientData.phone || 'No phone recorded'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-control bg-cream p-3 text-sm">
            <Mail size={16} className="text-primary" />
            <div>
              <p className="text-xs text-muted">Email</p>
              <p className="font-semibold">{clientData.email || 'No email recorded'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-control bg-cream p-3 text-sm">
            <Calendar size={16} className="text-primary" />
            <div>
              <p className="text-xs text-muted">Next Scheduled Follow-up</p>
              <p className="font-semibold">
                {clientData.nextFollowUpAt ? formatDay(clientData.nextFollowUpAt, user?.timezone) : 'None scheduled'}
              </p>
            </div>
          </div>
        </div>

        {/* Client Notes */}
        {clientData.notes ? (
          <div className="rounded-control border border-line bg-white p-4">
            <p className="text-xs font-semibold text-muted">INTERNAL PRACTICE NOTES</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-navy">{clientData.notes}</p>
          </div>
        ) : null}
      </Card>

      {/* Grid of Linked Cases & Interaction History */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Linked Matters / Cases */}
        <Card>
          <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <Briefcase className="text-primary" size={20} />
              <h2 className="font-display text-lg font-bold">Associated Cases ({linkedCases.length})</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/app/cases/new')}
              className="text-xs font-semibold text-primary hover:underline"
            >
              + Open new case
            </button>
          </div>

          {linkedCases.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No legal cases linked to this client yet.</p>
          ) : (
            <div className="divide-y divide-line">
              {linkedCases.map((c) => (
                <div
                  key={c._id}
                  onClick={() => navigate(`/app/cases/${c._id}`)}
                  className="cursor-pointer py-3 hover:bg-cream/40"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold hover:text-primary">{c.title}</p>
                    <Badge tone={c.status === 'active' ? 'success' : 'default'}>{c.status}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {c.internalId} • {c.court || 'Court pending'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Interaction History */}
        <Card>
          <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="text-primary" size={20} />
              <h2 className="font-display text-lg font-bold">Contact & Follow-up History</h2>
            </div>
            <span className="text-xs text-muted">{interactions.length} records</span>
          </div>

          {interactions.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-muted">No recorded interactions yet.</p>
              <Button
                variant="secondary"
                onClick={() => setShowInteractionModal(true)}
                className="mt-3 text-xs"
              >
                Log first phone call or meeting
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {interactions.map((item) => (
                <div key={item._id} className="rounded-control border border-line bg-cream/30 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold capitalize text-primary">{item.type}</span>
                    <span className="text-muted">{formatDate(item.occurredAt, user?.timezone)}</span>
                  </div>
                  <p className="mt-1 text-sm text-navy">{item.summary}</p>
                  <div className="mt-2 flex items-center justify-between border-t border-line/60 pt-2 text-[11px] text-muted">
                    <span>Logged by: {item.createdBy?.name || 'Lawyer'}</span>
                    {item.followUpAt ? (
                      <span className="font-medium text-warning">
                        Follow-up due: {formatDay(item.followUpAt, user?.timezone)}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Edit Client Modal */}
      {showEditModal ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-card bg-white p-6 shadow-card">
            <h2 className="font-display text-xl font-bold">Edit Client Information</h2>
            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <Field label="Client / Entity Name *">
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Phone">
                  <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                </Field>
                <Field label="Email">
                  <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Assigned Lawyer">
                  <Select value={editAssignedLawyerId} onChange={(e) => setEditAssignedLawyerId(e.target.value)}>
                    <option value="">Unassigned</option>
                    {lawyers.map((l) => (
                      <option key={l._id} value={l._id}>
                        {l.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Next Follow-up">
                  <Input
                    type="date"
                    value={editNextFollowUpAt}
                    onChange={(e) => setEditNextFollowUpAt(e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Internal Practice Notes">
                <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
              </Field>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={editMutation.isPending}>
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Log Interaction Modal */}
      {showInteractionModal ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-card bg-white p-6 shadow-card">
            <h2 className="font-display text-xl font-bold">Log Client Interaction</h2>
            <p className="mt-1 text-sm text-muted">
              Record details from a call, meeting, court brief, or written consultation.
            </p>
            <form onSubmit={handleInteractionSubmit} className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Interaction Type">
                  <Select value={intType} onChange={(e) => setIntType(e.target.value)}>
                    <option value="call">Phone Call</option>
                    <option value="meeting">Office Meeting</option>
                    <option value="court">Court Discussion</option>
                    <option value="email">Email / Message</option>
                    <option value="note">Internal Review</option>
                  </Select>
                </Field>
                <Field label="Date & Time">
                  <Input
                    type="datetime-local"
                    value={intOccurredAt}
                    onChange={(e) => setIntOccurredAt(e.target.value)}
                    required
                  />
                </Field>
              </div>
              <Field label="Meeting / Discussion Summary *">
                <Textarea
                  value={intSummary}
                  onChange={(e) => setIntSummary(e.target.value)}
                  placeholder="Summary of matters discussed, client instructions, or next steps…"
                  required
                />
              </Field>
              <div className="space-y-2 rounded-control bg-cream p-3">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={intFollowUpReq}
                    onChange={(e) => setIntFollowUpReq(e.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                  Requires future follow-up
                </label>
                {intFollowUpReq ? (
                  <Field label="Follow-up Date">
                    <Input
                      type="date"
                      value={intFollowUpAt}
                      onChange={(e) => setIntFollowUpAt(e.target.value)}
                      required={intFollowUpReq}
                    />
                  </Field>
                ) : null}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setShowInteractionModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={interactionMutation.isPending}>
                  Record Interaction
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Confirm Archive Dialog */}
      <ConfirmDialog
        open={showArchiveConfirm}
        title={clientData.archivedAt ? 'Restore Client?' : 'Archive Client?'}
        body={
          clientData.archivedAt
            ? 'Restoring this client will return them to active practice listings.'
            : 'Archiving hides the client from default listings. Existing cases and history remain safely preserved.'
        }
        confirmLabel={clientData.archivedAt ? 'Restore' : 'Archive'}
        danger={!clientData.archivedAt}
        onConfirm={() => archiveMutation.mutate()}
        onClose={() => setShowArchiveConfirm(false)}
      />
    </div>
  );
}
