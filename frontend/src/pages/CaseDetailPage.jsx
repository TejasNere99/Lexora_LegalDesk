import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Edit,
  Plus,
  Shield,
  UserCheck,
  Archive,
  RotateCcw,
  Users,
  Check,
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

export default function CaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { push } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('hearings'); // 'hearings' | 'tasks' | 'notes'
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  // Hearing form state
  const [hearingDate, setHearingDate] = useState('');
  const [hearingCourt, setHearingCourt] = useState('');
  const [hearingType, setHearingType] = useState('Hearing');
  const [hearingNotes, setHearingNotes] = useState('');

  // Task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssignedTo, setTaskAssignedTo] = useState('');
  const [taskDueAt, setTaskDueAt] = useState('');
  const [taskPriority, setTaskPriority] = useState('normal');

  // Access management form state
  const [accessAssignedId, setAccessAssignedId] = useState('');
  const [accessAuthorizedIds, setAccessAuthorizedIds] = useState([]);

  // Fetch Case Details
  const {
    data: caseData,
    isLoading: caseLoading,
    isError: caseError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['case', id],
    queryFn: async () => {
      const res = await api.get(`/cases/${id}`);
      return res.data.case;
    },
  });

  // Fetch Team Members
  const { data: teamData } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const res = await api.get('/team/members');
      return res.data.items || [];
    },
  });
  const teamMembers = (teamData || []).filter((m) => m.isActive);

  // Fetch Case Hearings
  const { data: hearingsData, isLoading: hearingsLoading } = useQuery({
    queryKey: ['case-hearings', id],
    queryFn: async () => {
      const res = await api.get(`/cases/${id}/hearings`);
      return res.data.items || [];
    },
    enabled: !!id,
  });

  // Fetch Case Tasks
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['case-tasks', id],
    queryFn: async () => {
      const res = await api.get(`/cases/${id}/tasks`);
      return res.data.items || [];
    },
    enabled: !!id,
  });

  // Mutations
  const scheduleMutation = useMutation({
    mutationFn: async (payload) => {
      return api.post('/hearings', payload);
    },
    onSuccess: () => {
      push('Court hearing scheduled');
      setShowScheduleModal(false);
      setHearingDate('');
      setHearingNotes('');
      queryClient.invalidateQueries({ queryKey: ['case-hearings', id] });
      queryClient.invalidateQueries({ queryKey: ['case', id] });
    },
    onError: (err) => push(err.message || 'Failed to schedule hearing'),
  });

  const taskMutation = useMutation({
    mutationFn: async (payload) => {
      return api.post('/tasks', payload);
    },
    onSuccess: () => {
      push('Task created');
      setShowTaskModal(false);
      setTaskTitle('');
      setTaskDesc('');
      setTaskDueAt('');
      queryClient.invalidateQueries({ queryKey: ['case-tasks', id] });
    },
    onError: (err) => push(err.message || 'Failed to create task'),
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (taskId) => {
      return api.post(`/tasks/${taskId}/complete`, {});
    },
    onSuccess: () => {
      push('Task completed!');
      queryClient.invalidateQueries({ queryKey: ['case-tasks', id] });
    },
    onError: (err) => push(err.message || 'Failed to complete task'),
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      if (caseData.archivedAt) {
        return api.post(`/cases/${id}/restore`, {});
      }
      return api.post(`/cases/${id}/archive`, {});
    },
    onSuccess: (res) => {
      push(caseData.archivedAt ? 'Matter restored' : 'Matter archived');
      setShowArchiveConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
    onError: (err) => push(err.message || 'Failed to update archive status'),
  });

  const accessMutation = useMutation({
    mutationFn: async (payload) => {
      return api.patch(`/cases/${id}/access`, payload);
    },
    onSuccess: () => {
      push('Case permissions updated');
      setShowAccessModal(false);
      queryClient.invalidateQueries({ queryKey: ['case', id] });
    },
    onError: (err) => push(err.message || 'Failed to update access permissions'),
  });

  function openAccessModal() {
    if (!caseData) return;
    setAccessAssignedId(caseData.assignedLawyerId?._id || caseData.assignedLawyerId || '');
    setAccessAuthorizedIds(
      (caseData.authorizedUserIds || []).map((u) => (typeof u === 'object' ? u._id : u)),
    );
    setShowAccessModal(true);
  }

  function handleScheduleSubmit(e) {
    e.preventDefault();
    if (!hearingDate) return;
    scheduleMutation.mutate({
      caseId: id,
      scheduledAt: new Date(hearingDate).toISOString(),
      court: hearingCourt || caseData?.court || '',
      hearingType,
      notes: hearingNotes,
    });
  }

  function handleTaskSubmit(e) {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    taskMutation.mutate({
      caseId: id,
      title: taskTitle.trim(),
      description: taskDesc.trim() || undefined,
      assignedTo: taskAssignedTo || user?._id || user?.id,
      dueAt: taskDueAt ? new Date(taskDueAt).toISOString() : undefined,
      priority: taskPriority,
    });
  }

  function handleAccessSubmit(e) {
    e.preventDefault();
    accessMutation.mutate({
      assignedLawyerId: accessAssignedId,
      authorizedUserIds: accessAuthorizedIds,
    });
  }

  function toggleAuthorizedUser(userId) {
    setAccessAuthorizedIds((curr) =>
      curr.includes(userId) ? curr.filter((u) => u !== userId) : [...curr, userId],
    );
  }

  if (caseLoading) return <LoadingSkeleton />;
  if (caseError || !caseData) {
    return (
      <div className="space-y-4">
        <Button variant="secondary" onClick={() => navigate('/app/cases')} className="gap-2">
          <ArrowLeft size={16} /> Back to Cases
        </Button>
        <ErrorState message={error?.message || 'Case record not found or inaccessible.'} onRetry={refetch} />
      </div>
    );
  }

  const isManager =
    user?.role === 'admin' ||
    String(caseData.assignedLawyerId?._id || caseData.assignedLawyerId) === String(user?._id) ||
    String(caseData.createdBy) === String(user?._id);

  const hearings = hearingsData || [];
  const tasks = tasksData || [];

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => navigate('/app/cases')} className="gap-2 text-sm font-semibold">
          <ArrowLeft size={16} /> All Matters
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {isManager ? (
            <Button variant="secondary" onClick={openAccessModal} className="gap-1.5 text-xs sm:text-sm">
              <Shield size={14} /> Permissions
            </Button>
          ) : null}
          <Button
            variant="secondary"
            onClick={() => navigate(`/app/cases/${id}/edit`)}
            className="gap-1.5 text-xs sm:text-sm"
          >
            <Edit size={14} /> Edit Matter
          </Button>
          <Button
            variant={caseData.archivedAt ? 'secondary' : 'ghost'}
            onClick={() => setShowArchiveConfirm(true)}
            className="gap-1.5 text-xs text-danger hover:bg-red-50 sm:text-sm"
          >
            {caseData.archivedAt ? <RotateCcw size={14} /> : <Archive size={14} />}
            {caseData.archivedAt ? 'Restore' : 'Archive'}
          </Button>
        </div>
      </div>

      {/* Case Header Card */}
      <Card className="space-y-4">
        <div className="flex flex-col justify-between gap-3 border-b border-line pb-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-sm font-bold text-primary">{caseData.internalId}</span>
              <Badge tone={caseData.status === 'active' ? 'success' : 'default'}>{caseData.status}</Badge>
              <Badge tone={caseData.priority === 'urgent' ? 'danger' : 'warning'}>{caseData.priority}</Badge>
            </div>
            <h1 className="mt-2 font-display text-2xl font-bold text-navy sm:text-3xl">{caseData.title}</h1>
            <p className="mt-1 text-xs text-muted">
              {caseData.caseNumber ? `Filing No: ${caseData.caseNumber} • ` : ''}
              {caseData.caseType || 'General'} • {caseData.court || 'Court specified on file'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowScheduleModal(true)} className="gap-1.5 text-xs">
              <Plus size={14} /> Schedule Hearing
            </Button>
            <Button variant="secondary" onClick={() => setShowTaskModal(true)} className="gap-1.5 text-xs">
              <Plus size={14} /> Add Task
            </Button>
          </div>
        </div>

        {/* Matter Attributes Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-control bg-cream p-3 text-xs">
            <p className="text-muted">Lead / Responsible Lawyer</p>
            <p className="mt-0.5 font-semibold text-navy">
              {caseData.assignedLawyerId?.name || 'Unassigned'}
            </p>
          </div>

          <div className="rounded-control bg-cream p-3 text-xs">
            <p className="text-muted">Represented Client(s)</p>
            <div className="mt-0.5 space-y-0.5 font-semibold text-navy">
              {(caseData.clientIds || []).map((c) => (
                <button
                  key={c._id || c}
                  type="button"
                  onClick={() => navigate(`/app/clients/${c._id || c}`)}
                  className="block hover:text-primary hover:underline"
                >
                  {c.name || 'Client'}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-control bg-cream p-3 text-xs">
            <p className="text-muted">Opposing Party</p>
            <p className="mt-0.5 font-semibold text-navy">{caseData.opposingParty || 'None specified'}</p>
          </div>

          <div className="rounded-control bg-cream p-3 text-xs">
            <p className="text-muted">Next Scheduled Hearing</p>
            <p className="mt-0.5 font-semibold text-primary">
              {caseData.nextHearingAt ? formatDate(caseData.nextHearingAt, user?.timezone) : 'None scheduled'}
            </p>
          </div>
        </div>

        {/* Authorized Team Members Banner */}
        <div className="flex flex-wrap items-center gap-2 rounded-control border border-line bg-white p-3 text-xs">
          <div className="flex items-center gap-1 font-semibold text-muted">
            <Users size={14} /> Authorized Team:
          </div>
          {(caseData.authorizedUserIds || []).map((u) => (
            <span key={u._id || u} className="rounded-full bg-cream px-2.5 py-0.5 font-medium text-navy">
              {u.name || 'Team member'}
            </span>
          ))}
        </div>
      </Card>

      {/* Tabs Selector */}
      <div className="flex border-b border-line">
        <button
          type="button"
          onClick={() => setActiveTab('hearings')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === 'hearings'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-navy'
          }`}
        >
          <Calendar size={16} /> Court Hearings ({hearings.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === 'tasks'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-navy'
          }`}
        >
          <CheckCircle2 size={16} /> Tasks & Briefs ({tasks.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('notes')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === 'notes'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-navy'
          }`}
        >
          <Briefcase size={16} /> Confidential Notes
        </button>
      </div>

      {/* Tab 1: Hearings */}
      {activeTab === 'hearings' ? (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Scheduled Court Hearings</h2>
            <Button onClick={() => setShowScheduleModal(true)} className="gap-1.5 text-xs">
              <Plus size={14} /> Schedule Hearing
            </Button>
          </div>

          {hearings.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted">
              No hearings scheduled for this matter. Click above to add a court listing.
            </div>
          ) : (
            <div className="divide-y divide-line">
              {hearings.map((h) => (
                <div key={h._id} className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-navy">
                        {formatDate(h.scheduledAt, user?.timezone)}
                      </span>
                      <Badge tone={h.cancelledAt ? 'danger' : 'primary'}>
                        {h.cancelledAt ? 'Cancelled' : h.hearingType || 'Hearing'}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      Court: {h.court || caseData.court || 'Court specified on file'}
                    </p>
                    {h.notes ? <p className="mt-1 text-xs text-navy">{h.notes}</p> : null}
                    {h.outcome ? (
                      <p className="mt-1 rounded bg-cream p-1.5 text-xs text-navy">
                        <span className="font-semibold">Outcome:</span> {h.outcome}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => navigate('/app/hearings')}
                    className="self-start text-xs sm:self-center"
                  >
                    View / Reschedule
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : null}

      {/* Tab 2: Tasks */}
      {activeTab === 'tasks' ? (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Matter Action Items & Deadlines</h2>
            <Button onClick={() => setShowTaskModal(true)} className="gap-1.5 text-xs">
              <Plus size={14} /> Add Task
            </Button>
          </div>

          {tasks.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted">
              No pending tasks for this case. Add tasks to delegate filings, memo drafts, or client updates.
            </div>
          ) : (
            <div className="divide-y divide-line">
              {tasks.map((t) => (
                <div key={t._id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label="Toggle complete"
                      onClick={() => completeTaskMutation.mutate(t._id)}
                      disabled={completeTaskMutation.isPending || t.status === 'completed'}
                      className={`h-5 w-5 rounded border ${
                        t.status === 'completed'
                          ? 'border-success bg-success text-white'
                          : 'border-line hover:border-success hover:bg-emerald-50'
                      }`}
                    >
                      {t.status === 'completed' ? '✓' : ''}
                    </button>
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          t.status === 'completed' ? 'text-muted line-through' : 'text-navy'
                        }`}
                      >
                        {t.title}
                      </p>
                      <p className="text-xs text-muted">
                        Assigned: {t.assignedTo?.name || 'Unassigned'} • Due:{' '}
                        {t.dueAt ? formatDay(t.dueAt, user?.timezone) : 'No deadline'}
                      </p>
                    </div>
                  </div>
                  <Badge tone={t.status === 'completed' ? 'success' : t.priority === 'urgent' ? 'danger' : 'default'}>
                    {t.status === 'completed' ? 'Done' : t.priority}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : null}

      {/* Tab 3: Confidential Strategy & Notes */}
      {activeTab === 'notes' ? (
        <Card className="space-y-3">
          <h2 className="font-display text-lg font-bold">Internal Practice Strategy & Pleadings Notes</h2>
          {caseData.internalNotes ? (
            <div className="whitespace-pre-wrap rounded-control border border-line bg-cream/30 p-4 text-sm text-navy">
              {caseData.internalNotes}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted">
              No internal case notes recorded yet. Click "Edit Matter" to add legal notes.
            </p>
          )}
        </Card>
      ) : null}

      {/* Schedule Hearing Modal */}
      {showScheduleModal ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-card bg-white p-6 shadow-card">
            <h2 className="font-display text-xl font-bold">Schedule Court Hearing</h2>
            <form onSubmit={handleScheduleSubmit} className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Hearing Date & Time *">
                  <Input
                    type="datetime-local"
                    value={hearingDate}
                    onChange={(e) => setHearingDate(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Hearing Nature">
                  <Select value={hearingType} onChange={(e) => setHearingType(e.target.value)}>
                    <option value="Admission">Admission / Pre-notice</option>
                    <option value="Motion">Interim Motion</option>
                    <option value="Hearing">Regular Hearing / Arguments</option>
                    <option value="Evidence">Witness / Evidence Recording</option>
                    <option value="Final Arguments">Final Hearing & Arguments</option>
                    <option value="Judgment">Pronouncement of Judgment</option>
                  </Select>
                </Field>
              </div>

              <Field label="Court / Room / Bench">
                <Input
                  value={hearingCourt}
                  onChange={(e) => setHearingCourt(e.target.value)}
                  placeholder={caseData.court || 'Court No. 4, Bench of Hon’ble Justice…'}
                />
              </Field>

              <Field label="Preparation Notes / Instructions">
                <Textarea
                  value={hearingNotes}
                  onChange={(e) => setHearingNotes(e.target.value)}
                  placeholder="Items on board, list number, senior counsel briefing notes…"
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setShowScheduleModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={scheduleMutation.isPending}>
                  Confirm Hearing
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Add Task Modal */}
      {showTaskModal ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-card bg-white p-6 shadow-card">
            <h2 className="font-display text-xl font-bold">Add Matter Task</h2>
            <form onSubmit={handleTaskSubmit} className="mt-4 space-y-4">
              <Field label="Task Description *">
                <Input
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Draft counter-affidavit or verify index"
                  required
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Assigned Lawyer">
                  <Select value={taskAssignedTo} onChange={(e) => setTaskAssignedTo(e.target.value)}>
                    <option value="">Default (Self)</option>
                    {teamMembers.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Deadline / Due Date">
                  <Input type="date" value={taskDueAt} onChange={(e) => setTaskDueAt(e.target.value)} />
                </Field>
              </div>

              <Field label="Priority Level">
                <Select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)}>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </Select>
              </Field>

              <Field label="Instructions & Context">
                <Textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Pleadings reference, filing registry rules, or memo draft…"
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setShowTaskModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={taskMutation.isPending}>
                  Create Task
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Access Permissions Modal */}
      {showAccessModal ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-card bg-white p-6 shadow-card">
            <div className="flex items-center gap-2">
              <Shield className="text-primary" size={22} />
              <h2 className="font-display text-xl font-bold">Manage Case Access</h2>
            </div>
            <p className="mt-1 text-xs text-muted">
              Grant or revoke team authorization for this confidential matter.
            </p>

            <form onSubmit={handleAccessSubmit} className="mt-4 space-y-4">
              <Field label="Lead Lawyer">
                <Select value={accessAssignedId} onChange={(e) => setAccessAssignedId(e.target.value)}>
                  {teamMembers.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-navy">Authorized Team Lawyers</p>
                <div className="grid gap-2">
                  {teamMembers.map((m) => {
                    const isLead = m._id === accessAssignedId;
                    const authorized = isLead || accessAuthorizedIds.includes(m._id);
                    return (
                      <button
                        key={m._id}
                        type="button"
                        disabled={isLead}
                        onClick={() => toggleAuthorizedUser(m._id)}
                        className={`flex items-center justify-between rounded-control border p-3 text-left text-sm transition ${
                          authorized
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-line bg-white hover:bg-cream'
                        }`}
                      >
                        <div>
                          <p className="font-semibold">{m.name}</p>
                          <p className="text-xs text-muted">{isLead ? 'Lead Lawyer (Always has access)' : m.role}</p>
                        </div>
                        {authorized ? <Check size={16} className="text-primary" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setShowAccessModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={accessMutation.isPending}>
                  Update Access
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Archive Confirm Dialog */}
      <ConfirmDialog
        open={showArchiveConfirm}
        title={caseData.archivedAt ? 'Restore Legal Matter?' : 'Archive Legal Matter?'}
        body={
          caseData.archivedAt
            ? 'Restoring will return this matter to active practice registers.'
            : 'Archived cases remain strictly preserved for regulatory audit, but will be hidden from default case lists.'
        }
        confirmLabel={caseData.archivedAt ? 'Restore' : 'Archive'}
        danger={!caseData.archivedAt}
        onConfirm={() => archiveMutation.mutate()}
        onClose={() => setShowArchiveConfirm(false)}
      />
    </div>
  );
}
