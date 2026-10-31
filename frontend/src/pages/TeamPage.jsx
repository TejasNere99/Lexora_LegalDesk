import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  UserPlus,
  Shield,
  ShieldAlert,
  UserCheck,
  UserX,
  History,
  Mail,
  Calendar,
  Lock,
} from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { LexBuddy } from '../components/mascot/LexBuddy';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingSkeleton,
  PageHeader,
  Select,
} from '../components/ui';
import { api } from '../lib/api';
import { useToast } from '../hooks/useToast';
import { formatDate, formatDay } from '../utils/format';

export default function TeamPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin';

  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'audit'
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [deactivatingMember, setDeactivatingMember] = useState(null);
  const [editingMember, setEditingMember] = useState(null);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('lawyer');

  // Edit role state
  const [editRole, setEditRole] = useState('lawyer');
  const [editActive, setEditActive] = useState(true);

  // Audit log page
  const [auditPage, setAuditPage] = useState(1);
  const [auditFilter, setAuditFilter] = useState('');

  // Fetch Team Members
  const {
    data: membersData,
    isLoading: membersLoading,
    isError: membersError,
    error: membersErr,
    refetch: refetchMembers,
  } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const res = await api.get('/team/members');
      return res.data.items || [];
    },
  });

  // Fetch Audit Logs (Admin only)
  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['audit-logs', auditPage, auditFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(auditPage), limit: '20' });
      if (auditFilter) params.set('entityType', auditFilter);
      const res = await api.get(`/audit-logs?${params.toString()}`);
      return res.data;
    },
    enabled: isAdmin && activeTab === 'audit',
  });

  // Mutations
  const inviteMutation = useMutation({
    mutationFn: async (payload) => {
      return api.post('/team/invitations', payload);
    },
    onSuccess: () => {
      push('Invitation link dispatched. The lawyer can join within 72 hours.');
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('lawyer');
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
    onError: (err) => push(err.message || 'Failed to send invitation'),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (memberId) => {
      return api.post(`/team/members/${memberId}/deactivate`, {});
    },
    onSuccess: () => {
      push('Account deactivated and active sessions revoked');
      setDeactivatingMember(null);
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
    onError: (err) => push(err.message || 'Failed to deactivate member'),
  });

  const editMemberMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      return api.patch(`/team/members/${id}`, payload);
    },
    onSuccess: () => {
      push('Member role updated');
      setEditingMember(null);
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
    onError: (err) => push(err.message || 'Failed to update member'),
  });

  function handleInviteSubmit(e) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    inviteMutation.mutate({
      email: inviteEmail.trim(),
      role: inviteRole,
    });
  }

  function handleEditSubmit(e) {
    e.preventDefault();
    if (!editingMember) return;
    editMemberMutation.mutate({
      id: editingMember._id,
      payload: { role: editRole, isActive: editActive },
    });
  }

  const members = membersData || [];
  const auditLogs = auditData?.items || [];
  const auditTotal = auditData?.total || 0;
  const auditPages = Math.ceil(auditTotal / 20) || 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Practice Team & Access Control"
        subtitle="Manage the 5-lawyer practice workspace, roles, and security audit records."
        actions={
          isAdmin ? (
            <Button onClick={() => setShowInviteModal(true)} className="gap-2">
              <UserPlus size={16} /> Invite Lawyer
            </Button>
          ) : null
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-line">
        <button
          type="button"
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === 'members'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-navy'
          }`}
        >
          <Users size={16} /> Practice Members ({members.length})
        </button>
        {isAdmin ? (
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === 'audit'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-navy'
            }`}
          >
            <History size={16} /> Security Audit Trail
          </button>
        ) : null}
      </div>

      {activeTab === 'members' ? (
        <div className="space-y-4">
          {membersLoading ? (
            <div className="space-y-3">
              <LoadingSkeleton />
              <LoadingSkeleton />
            </div>
          ) : membersError ? (
            <ErrorState message={membersErr?.message || 'Failed to load team.'} onRetry={refetchMembers} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((m) => {
                const isSelf = m._id === (user?._id || user?.id);
                return (
                  <Card key={m._id} className="relative flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar name={m.name} />
                          <div>
                            <p className="font-semibold text-navy">{m.name}</p>
                            <p className="text-xs text-muted">{m.email}</p>
                          </div>
                        </div>
                        <Badge tone={m.role === 'admin' ? 'primary' : 'default'}>
                          {m.role}
                        </Badge>
                      </div>

                      <div className="mt-4 space-y-1.5 border-t border-line/60 pt-3 text-xs text-muted">
                        <div className="flex items-center justify-between">
                          <span>Account Status:</span>
                          <span
                            className={`font-semibold ${
                              m.isActive ? 'text-success' : 'text-danger'
                            }`}
                          >
                            {m.isActive ? 'Active' : 'Deactivated'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Joined Practice:</span>
                          <span>{formatDay(m.createdAt, user?.timezone)}</span>
                        </div>
                      </div>
                    </div>

                    {isAdmin && !isSelf ? (
                      <div className="flex items-center justify-end gap-2 border-t border-line/60 pt-3">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setEditingMember(m);
                            setEditRole(m.role);
                            setEditActive(m.isActive);
                          }}
                          className="min-h-8 px-2.5 text-xs"
                        >
                          Edit Role
                        </Button>
                        {m.isActive ? (
                          <Button
                            variant="ghost"
                            onClick={() => setDeactivatingMember(m)}
                            className="min-h-8 px-2.5 text-xs text-danger hover:bg-red-50"
                          >
                            Deactivate
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {/* Tab: Audit Logs */}
      {isAdmin && activeTab === 'audit' ? (
        <Card className="space-y-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-display text-lg font-bold">Confidential Activity Audit Trail</h2>
              <p className="text-xs text-muted">
                Immutable operational log recording case access changes, hearing dates, task completions, and security events.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Entity:</span>
              <Select
                value={auditFilter}
                onChange={(e) => {
                  setAuditFilter(e.target.value);
                  setAuditPage(1);
                }}
                className="min-h-9 w-36 text-xs"
              >
                <option value="">All Entities</option>
                <option value="Case">Case</option>
                <option value="Hearing">Hearing</option>
                <option value="Task">Task</option>
                <option value="Client">Client</option>
                <option value="User">User</option>
                <option value="Invitation">Invitation</option>
              </Select>
            </div>
          </div>

          {auditLoading ? (
            <LoadingSkeleton />
          ) : auditLogs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No audit events match your filter.</p>
          ) : (
            <div className="divide-y divide-line text-xs">
              {auditLogs.map((log) => (
                <div key={log._id} className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-primary">{log.action}</span>
                      <Badge tone="default">{log.entityType}</Badge>
                      <span className="font-mono text-[11px] text-muted">ID: {String(log.entityId).slice(-6)}</span>
                    </div>
                    <p className="text-muted">
                      Actor: <span className="font-medium text-navy">{log.actorId?.name || 'System / Admin'}</span> ({log.actorId?.email || 'System'})
                    </p>
                    {log.metadata && Object.keys(log.metadata).length > 0 ? (
                      <p className="font-mono text-[11px] text-muted">
                        Meta: {JSON.stringify(log.metadata)}
                      </p>
                    ) : null}
                  </div>
                  <span className="text-muted shrink-0">
                    {formatDate(log.createdAt, user?.timezone)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {auditPages > 1 ? (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted">
                Page {auditPage} of {auditPages} ({auditTotal} events)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={auditPage <= 1}
                  onClick={() => setAuditPage((p) => Math.max(p - 1, 1))}
                  className="min-h-9 px-3 text-xs"
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  disabled={auditPage >= auditPages}
                  onClick={() => setAuditPage((p) => Math.min(p + 1, auditPages))}
                  className="min-h-9 px-3 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}

      {/* Invite Modal */}
      {showInviteModal ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-card bg-white p-6 shadow-card">
            <h2 className="font-display text-xl font-bold">Invite Practice Colleague</h2>
            <p className="mt-1 text-sm text-muted">
              Send a secure one-time invite token valid for 72 hours. Public registration is permanently closed.
            </p>
            <form onSubmit={handleInviteSubmit} className="mt-4 space-y-4">
              <Field label="Colleague Email Address *">
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="lawyer@firm.com"
                  required
                />
              </Field>

              <Field label="Workspace Role">
                <Select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                  <option value="lawyer">Advocate / Lawyer</option>
                  <option value="admin">Practice Administrator</option>
                </Select>
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setShowInviteModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={inviteMutation.isPending}>
                  Send Invitation
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Edit Role Modal */}
      {editingMember ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-card bg-white p-6 shadow-card">
            <h2 className="font-display text-xl font-bold">Update Member Role: {editingMember.name}</h2>
            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <Field label="Role">
                <Select value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                  <option value="lawyer">Advocate / Lawyer</option>
                  <option value="admin">Practice Administrator</option>
                </Select>
              </Field>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editActiveCb"
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
                  className="h-4 w-4"
                />
                <label htmlFor="editActiveCb" className="text-sm">
                  Account is active
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setEditingMember(null)}>
                  Cancel
                </Button>
                <Button type="submit" loading={editMemberMutation.isPending}>
                  Save
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Deactivate Confirm */}
      <ConfirmDialog
        open={Boolean(deactivatingMember)}
        title="Deactivate Colleague Account?"
        body={`Deactivating ${deactivatingMember?.name}'s account will immediately revoke all active browser sessions and prevent further access to confidential practice records.`}
        confirmLabel="Deactivate Account"
        danger
        onConfirm={() => deactivateMutation.mutate(deactivatingMember._id)}
        onClose={() => setDeactivatingMember(null)}
      />
    </div>
  );
}
