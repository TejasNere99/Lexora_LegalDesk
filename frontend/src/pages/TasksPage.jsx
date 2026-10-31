import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckSquare,
  Plus,
  Clock,
  Briefcase,
  User,
  AlertTriangle,
  CheckCircle2,
  Filter,
  RotateCcw,
  Edit,
} from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { LexBuddy } from '../components/mascot/LexBuddy';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingSkeleton,
  PageHeader,
  SearchInput,
  Select,
  Textarea,
} from '../components/ui';
import { api } from '../lib/api';
import { useToast } from '../hooks/useToast';
import { formatDay, statusLabel } from '../utils/format';

const TABS = [
  { id: 'all', label: 'All Tasks' },
  { id: 'mine', label: 'My Tasks' },
  { id: 'today', label: 'Due Today' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
];

export default function TasksPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState(searchParams.get('scope') || 'all');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCaseId, setNewCaseId] = useState('');
  const [newClientId, setNewClientId] = useState('');
  const [newAssignedTo, setNewAssignedTo] = useState('');
  const [newDueAt, setNewDueAt] = useState('');
  const [newPriority, setNewPriority] = useState('normal');

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editAssignedTo, setEditAssignedTo] = useState('');
  const [editDueAt, setEditDueAt] = useState('');
  const [editPriority, setEditPriority] = useState('normal');
  const [editStatus, setEditStatus] = useState('todo');

  // Fetch Team
  const { data: teamData } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const res = await api.get('/team/members');
      return res.data.items || [];
    },
  });
  const teamMembers = (teamData || []).filter((m) => m.isActive);

  // Fetch Cases for linking
  const { data: casesData } = useQuery({
    queryKey: ['cases-for-tasks'],
    queryFn: async () => {
      const res = await api.get('/cases?limit=100');
      return res.data.items || [];
    },
  });

  // Fetch Clients for linking
  const { data: clientsData } = useQuery({
    queryKey: ['clients-for-tasks'],
    queryFn: async () => {
      const res = await api.get('/clients?limit=100');
      return res.data.items || [];
    },
  });

  // Fetch Tasks
  const currentUserId = user?._id || user?.id;
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['tasks', activeTab, priorityFilter, q, page, currentUserId],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
      });
      if (q) params.set('q', q);
      if (priorityFilter) params.set('priority', priorityFilter);

      if (activeTab === 'mine') {
        params.set('assignedTo', currentUserId || 'me');
        params.set('status', 'todo');
      } else if (activeTab === 'today') {
        params.set('scope', 'today');
      } else if (activeTab === 'overdue') {
        params.set('scope', 'overdue');
      } else if (activeTab === 'upcoming') {
        params.set('scope', 'upcoming');
      } else if (activeTab === 'completed') {
        params.set('status', 'completed');
      }

      const res = await api.get(`/tasks?${params.toString()}`);
      return res.data;
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload) => {
      return api.post('/tasks', payload);
    },
    onSuccess: () => {
      push('Task created');
      setShowCreateModal(false);
      resetCreateForm();
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err) => push(err.message || 'Failed to create task'),
  });

  const completeMutation = useMutation({
    mutationFn: async (taskId) => {
      return api.post(`/tasks/${taskId}/complete`, {});
    },
    onSuccess: () => {
      push('🎉 Task completed! LexBuddy says: Excellent work.');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err) => push(err.message || 'Failed to complete task'),
  });

  const reopenMutation = useMutation({
    mutationFn: async (taskId) => {
      return api.post(`/tasks/${taskId}/reopen`, {});
    },
    onSuccess: () => {
      push('Task reopened');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err) => push(err.message || 'Failed to reopen task'),
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      return api.patch(`/tasks/${id}`, payload);
    },
    onSuccess: () => {
      push('Task updated');
      setEditingTask(null);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err) => push(err.message || 'Failed to update task'),
  });

  function resetCreateForm() {
    setNewTitle('');
    setNewDesc('');
    setNewCaseId('');
    setNewClientId('');
    setNewAssignedTo('');
    setNewDueAt('');
    setNewPriority('normal');
  }

  function handleCreateSubmit(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    createMutation.mutate({
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      caseId: newCaseId || undefined,
      clientId: newClientId || undefined,
      assignedTo: newAssignedTo || currentUserId,
      dueAt: newDueAt ? new Date(newDueAt).toISOString() : undefined,
      priority: newPriority,
    });
  }

  function openEdit(task) {
    setEditingTask(task);
    setEditTitle(task.title || '');
    setEditDesc(task.description || '');
    setEditAssignedTo(task.assignedTo?._id || task.assignedTo?.id || task.assignedTo || '');
    setEditDueAt(task.dueAt ? new Date(task.dueAt).toISOString().split('T')[0] : '');
    setEditPriority(task.priority || 'normal');
    setEditStatus(task.status || 'todo');
  }

  function handleEditSubmit(e) {
    e.preventDefault();
    if (!editingTask) return;
    editMutation.mutate({
      id: editingTask._id,
      payload: {
        title: editTitle.trim(),
        description: editDesc.trim() || null,
        assignedTo: editAssignedTo || null,
        dueAt: editDueAt ? new Date(editDueAt).toISOString() : null,
        priority: editPriority,
        status: editStatus,
      },
    });
  }

  const tasks = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 15) || 1;
  const cases = casesData || [];
  const clients = clientsData || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks & Practice Deadlines"
        subtitle="Manage legal filings, briefing notes, and team coordination."
        actions={
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus size={16} /> New Task
          </Button>
        }
      />

      {/* Tabs and Filters */}
      <Card className="space-y-4">
        <div className="flex flex-wrap gap-2 border-b border-line pb-3">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className={`rounded-control px-3.5 py-1.5 text-xs font-semibold transition sm:text-sm ${
                activeTab === tab.id ? 'bg-primary text-white' : 'bg-white text-navy hover:bg-cream'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full max-w-sm">
            <SearchInput
              placeholder="Search tasks…"
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
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
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

      {/* Tasks List */}
      {isLoading ? (
        <div className="space-y-3">
          <LoadingSkeleton />
          <LoadingSkeleton />
          <LoadingSkeleton />
        </div>
      ) : isError ? (
        <ErrorState message={error?.message || 'Failed to load task list.'} onRetry={refetch} />
      ) : tasks.length === 0 ? (
        <EmptyState
          title={q ? 'No tasks match your search' : 'No tasks in this view'}
          body="Stay on top of court filings, drafting assignments, and client reviews with assigned tasks."
          action={<Button onClick={() => setShowCreateModal(true)}>Create Task</Button>}
        />
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => {
            const isCompleted = t.status === 'completed';
            const isOverdue = !isCompleted && t.dueAt && new Date(t.dueAt) < new Date();

            return (
              <Card key={t._id} className="transition hover:border-line">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      aria-label={isCompleted ? 'Reopen task' : 'Complete task'}
                      onClick={() =>
                        isCompleted
                          ? reopenMutation.mutate(t._id)
                          : completeMutation.mutate(t._id)
                      }
                      disabled={completeMutation.isPending || reopenMutation.isPending}
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                        isCompleted
                          ? 'border-success bg-success text-white'
                          : 'border-line hover:border-success hover:bg-emerald-50'
                      }`}
                    >
                      {isCompleted ? '✓' : ''}
                    </button>

                    <div className="space-y-1">
                      <p
                        className={`text-sm font-semibold ${
                          isCompleted ? 'text-muted line-through' : 'text-navy'
                        }`}
                      >
                        {t.title}
                      </p>

                      {t.description ? (
                        <p className="line-clamp-2 text-xs text-muted">{t.description}</p>
                      ) : null}

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                        {t.caseId ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/app/cases/${t.caseId._id}`)}
                            className="flex items-center gap-1 font-medium text-primary hover:underline"
                          >
                            <Briefcase size={13} />
                            {t.caseId.internalId} — {t.caseId.title}
                          </button>
                        ) : null}

                        {t.clientId ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/app/clients/${t.clientId._id}`)}
                            className="flex items-center gap-1 text-navy hover:text-primary hover:underline"
                          >
                            <User size={13} /> {t.clientId.name}
                          </button>
                        ) : null}

                        <span className="flex items-center gap-1">
                          Assigned: <span className="font-medium text-navy">{t.assignedTo?.name || 'Unassigned'}</span>
                        </span>

                        {t.dueAt ? (
                          <span
                            className={`flex items-center gap-1 font-semibold ${
                              isOverdue ? 'text-danger' : 'text-navy'
                            }`}
                          >
                            <Clock size={13} />
                            Due: {formatDay(t.dueAt, user?.timezone)}
                            {isOverdue ? ' (Overdue)' : ''}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <Badge
                      tone={
                        isCompleted
                          ? 'success'
                          : t.priority === 'urgent'
                          ? 'danger'
                          : t.priority === 'high'
                          ? 'warning'
                          : 'default'
                      }
                    >
                      {isCompleted ? 'Completed' : t.priority}
                    </Badge>
                    <button
                      type="button"
                      aria-label="Edit task"
                      onClick={() => openEdit(t)}
                      className="rounded p-1 text-muted hover:bg-cream hover:text-navy"
                    >
                      <Edit size={16} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 ? (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted">
                Page {page} of {totalPages} ({total} tasks)
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

      {/* Create Task Modal */}
      {showCreateModal ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-card bg-white p-6 shadow-card">
            <h2 className="font-display text-xl font-bold">Create New Task</h2>
            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <Field label="Task Title / Action Item *">
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Prepare list of dates & synopsis for WP"
                  required
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Link Legal Matter (Optional)">
                  <Select value={newCaseId} onChange={(e) => setNewCaseId(e.target.value)}>
                    <option value="">None (General Task)</option>
                    {cases.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.internalId} — {c.title}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Link Client (Optional)">
                  <Select value={newClientId} onChange={(e) => setNewClientId(e.target.value)}>
                    <option value="">None</option>
                    {clients.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Assign To">
                  <Select value={newAssignedTo} onChange={(e) => setNewAssignedTo(e.target.value)}>
                    <option value="">Self ({user?.name})</option>
                    {teamMembers.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Due Date">
                  <Input type="date" value={newDueAt} onChange={(e) => setNewDueAt(e.target.value)} />
                </Field>

                <Field label="Priority">
                  <Select value={newPriority} onChange={(e) => setNewPriority(e.target.value)}>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </Select>
                </Field>
              </div>

              <Field label="Detailed Instructions">
                <Textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Registry scrutiny objections to remove, authorities to compile…"
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={createMutation.isPending}>
                  Create Task
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Edit Task Modal */}
      {editingTask ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-card bg-white p-6 shadow-card">
            <h2 className="font-display text-xl font-bold">Edit Task</h2>
            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <Field label="Title">
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required />
              </Field>

              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Assignee">
                  <Select value={editAssignedTo} onChange={(e) => setEditAssignedTo(e.target.value)}>
                    {teamMembers.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Due Date">
                  <Input type="date" value={editDueAt} onChange={(e) => setEditDueAt(e.target.value)} />
                </Field>

                <Field label="Priority">
                  <Select value={editPriority} onChange={(e) => setEditPriority(e.target.value)}>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </Select>
                </Field>
              </div>

              <Field label="Status">
                <Select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </Field>

              <Field label="Description">
                <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setEditingTask(null)}>
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
    </div>
  );
}
