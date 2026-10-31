import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Briefcase, Shield, Check } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import {
  Button,
  Card,
  Field,
  Input,
  LoadingSkeleton,
  PageHeader,
  Select,
  Textarea,
} from '../components/ui';
import { api } from '../lib/api';
import { useToast } from '../hooks/useToast';

const CASE_TYPES = [
  'Commercial Dispute',
  'Civil Litigation',
  'Corporate & M&A',
  'Constitutional / Writ',
  'Arbitration & Conciliation',
  'Criminal Defense',
  'Intellectual Property',
  'Insolvency & Bankruptcy (NCLT)',
  'Taxation & Regulatory',
  'Labor & Employment',
  'Family & Succession',
  'Other',
];

const COURTS = [
  'Supreme Court of India',
  'High Court',
  'City Civil & Sessions Court',
  'District Court',
  'National Company Law Tribunal (NCLT)',
  'National Company Law Appellate Tribunal (NCLAT)',
  'Debt Recovery Tribunal (DRT)',
  'Consumer Disputes Redressal Forum',
  'Arbitral Tribunal',
  'Other Forum',
];

export default function CaseFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { push } = useToast();
  const queryClient = useQueryClient();

  // Form Fields
  const [title, setTitle] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [caseType, setCaseType] = useState('Commercial Dispute');
  const [court, setCourt] = useState('High Court');
  const [jurisdiction, setJurisdiction] = useState('');
  const [selectedClientIds, setSelectedClientIds] = useState([]);
  const [opposingParty, setOpposingParty] = useState('');
  const [assignedLawyerId, setAssignedLawyerId] = useState('');
  const [authorizedUserIds, setAuthorizedUserIds] = useState([]);
  const [status, setStatus] = useState('active');
  const [priority, setPriority] = useState('normal');
  const [filingDate, setFilingDate] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [version, setVersion] = useState(undefined);

  // Fetch Clients
  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ['clients-for-select'],
    queryFn: async () => {
      const res = await api.get('/clients?limit=100');
      return res.data.items || [];
    },
  });

  // Fetch Team Members
  const { data: teamData, isLoading: teamLoading } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const res = await api.get('/team/members');
      return res.data.items || [];
    },
  });

  // If edit mode, fetch existing case
  const { data: existingCase, isLoading: caseLoading } = useQuery({
    queryKey: ['case', id],
    queryFn: async () => {
      const res = await api.get(`/cases/${id}`);
      return res.data.case;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingCase) {
      setTitle(existingCase.title || '');
      setCaseNumber(existingCase.caseNumber || '');
      setCaseType(existingCase.caseType || 'Commercial Dispute');
      setCourt(existingCase.court || 'High Court');
      setJurisdiction(existingCase.jurisdiction || '');
      setSelectedClientIds(
        (existingCase.clientIds || []).map((c) => (typeof c === 'object' ? c._id : c)),
      );
      setOpposingParty(existingCase.opposingParty || '');
      setAssignedLawyerId(
        existingCase.assignedLawyerId?._id || existingCase.assignedLawyerId || '',
      );
      setAuthorizedUserIds(
        (existingCase.authorizedUserIds || []).map((u) => (typeof u === 'object' ? u._id : u)),
      );
      setStatus(existingCase.status || 'active');
      setPriority(existingCase.priority || 'normal');
      setFilingDate(
        existingCase.filingDate ? new Date(existingCase.filingDate).toISOString().split('T')[0] : '',
      );
      setInternalNotes(existingCase.internalNotes || '');
      setVersion(existingCase.__v);
    } else if (!isEdit && user) {
      const uid = user._id || user.id;
      setAssignedLawyerId(uid);
      setAuthorizedUserIds([uid]);
    }
  }, [existingCase, isEdit, user]);

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (isEdit) {
        return api.patch(`/cases/${id}`, { ...payload, __v: version });
      }
      return api.post('/cases', payload);
    },
    onSuccess: (res) => {
      push(isEdit ? 'Case details updated' : 'Legal matter registered');
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      if (isEdit) queryClient.invalidateQueries({ queryKey: ['case', id] });
      const targetId = isEdit ? id : res.data.case?._id;
      navigate(`/app/cases/${targetId}`);
    },
    onError: (err) => {
      setErrorMsg(err.message || 'Failed to save matter');
    },
  });

  function toggleClient(clientId) {
    setSelectedClientIds((current) =>
      current.includes(clientId) ? current.filter((c) => c !== clientId) : [...current, clientId],
    );
  }

  function toggleAuthorizedUser(userId) {
    setAuthorizedUserIds((current) =>
      current.includes(userId) ? current.filter((u) => u !== userId) : [...current, userId],
    );
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Matter title is required');
      return;
    }
    if (selectedClientIds.length === 0) {
      setErrorMsg('Please link at least one client to this matter');
      return;
    }

    const payload = {
      title: title.trim(),
      caseNumber: caseNumber.trim() || undefined,
      caseType,
      court,
      jurisdiction: jurisdiction.trim() || undefined,
      clientIds: selectedClientIds,
      opposingParty: opposingParty.trim() || undefined,
      assignedLawyerId: assignedLawyerId || user?._id,
      authorizedUserIds: [...new Set([...authorizedUserIds, assignedLawyerId || user?._id])],
      status,
      priority,
      filingDate: filingDate ? new Date(filingDate).toISOString() : undefined,
      internalNotes: internalNotes.trim() || undefined,
    };

    saveMutation.mutate(payload);
  }

  if ((isEdit && caseLoading) || clientsLoading || teamLoading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton />
        <LoadingSkeleton />
      </div>
    );
  }

  const clients = clientsData || [];
  const teamMembers = (teamData || []).filter((m) => m.isActive);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={() => navigate(isEdit ? `/app/cases/${id}` : '/app/cases')}
          className="gap-2 text-sm font-semibold"
        >
          <ArrowLeft size={16} /> {isEdit ? 'Back to Case' : 'Back to Cases'}
        </Button>
      </div>

      <PageHeader
        title={isEdit ? `Edit Matter: ${existingCase?.internalId || ''}` : 'Open New Legal Matter'}
        subtitle="Ensure client confidentiality and assign team member access rights appropriately."
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMsg ? (
            <div className="rounded-control bg-red-50 p-4 text-sm text-danger font-medium">
              {errorMsg}
            </div>
          ) : null}

          {/* Section 1: Matter Identifiers */}
          <div className="space-y-4">
            <h2 className="font-display text-lg font-bold text-navy">Matter Identification</h2>
            <Field label="Matter Title *">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Apex Logistics Ltd vs Union of India"
                required
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Case / Petition Number">
                <Input
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                  placeholder="e.g. WP (C) No. 1042/2026"
                />
              </Field>
              <Field label="Opposing Party Name">
                <Input
                  value={opposingParty}
                  onChange={(e) => setOpposingParty(e.target.value)}
                  placeholder="e.g. Ministry of Commerce & Industry"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Case Category">
                <Select value={caseType} onChange={(e) => setCaseType(e.target.value)}>
                  {CASE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Court / Tribunal">
                <Select value={court} onChange={(e) => setCourt(e.target.value)}>
                  {COURTS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Jurisdiction / City">
                <Input
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  placeholder="e.g. High Court at New Delhi"
                />
              </Field>
            </div>
          </div>

          <hr className="border-line" />

          {/* Section 2: Client Linking */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-navy">Linked Clients *</h2>
                <p className="text-xs text-muted">Select practice clients represented in this matter.</p>
              </div>
              <Button
                variant="secondary"
                type="button"
                onClick={() => navigate('/app/clients')}
                className="text-xs"
              >
                + Register Client
              </Button>
            </div>

            {clients.length === 0 ? (
              <p className="rounded-control bg-cream p-4 text-xs text-muted">
                No clients exist yet. Please register a client first.
              </p>
            ) : (
              <div className="grid max-h-48 gap-2 overflow-y-auto rounded-control border border-line p-3 sm:grid-cols-2">
                {clients.map((c) => {
                  const selected = selectedClientIds.includes(c._id);
                  return (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() => toggleClient(c._id)}
                      className={`flex items-center justify-between rounded-control border p-2.5 text-left text-sm transition ${
                        selected
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-line bg-white hover:bg-cream'
                      }`}
                    >
                      <span className="font-semibold">{c.name}</span>
                      {selected ? <Check size={16} className="text-primary" /> : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <hr className="border-line" />

          {/* Section 3: Assignment & Team Access Permissions */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="text-primary" size={20} />
              <h2 className="font-display text-lg font-bold text-navy">Team Scoping & Authorization</h2>
            </div>
            <p className="text-xs text-muted">
              Lexora LegalDesk enforces strict case-level authorization. Only assigned and explicitly selected lawyers can access confidential case records, hearings, and tasks.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Responsible / Lead Lawyer">
                <Select
                  value={assignedLawyerId}
                  onChange={(e) => {
                    setAssignedLawyerId(e.target.value);
                    if (!authorizedUserIds.includes(e.target.value)) {
                      setAuthorizedUserIds([...authorizedUserIds, e.target.value]);
                    }
                  }}
                >
                  {teamMembers.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Initial Case Status">
                <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="active">Active — Ongoing matter</option>
                  <option value="pending">Pending — Awaiting notice / instructions</option>
                  <option value="on_hold">On Hold — Stayed or deferred</option>
                  <option value="closed">Closed — Final disposal</option>
                </Select>
              </Field>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-navy">Authorized Team Members</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {teamMembers.map((m) => {
                  const authorized = authorizedUserIds.includes(m._id);
                  const isLead = m._id === assignedLawyerId;
                  return (
                    <button
                      key={m._id}
                      type="button"
                      disabled={isLead}
                      onClick={() => toggleAuthorizedUser(m._id)}
                      className={`flex items-center justify-between rounded-control border p-3 text-left text-xs transition ${
                        authorized || isLead
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-line bg-white hover:bg-cream'
                      }`}
                    >
                      <div>
                        <p className="font-semibold">{m.name}</p>
                        <p className="text-[11px] text-muted">{isLead ? 'Lead Lawyer' : m.role}</p>
                      </div>
                      {authorized || isLead ? <Check size={16} className="text-primary" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Priority Level">
                <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </Select>
              </Field>

              <Field label="Filing / Opening Date">
                <Input
                  type="date"
                  value={filingDate}
                  onChange={(e) => setFilingDate(e.target.value)}
                />
              </Field>
            </div>
          </div>

          <hr className="border-line" />

          {/* Section 4: Internal Practice Notes */}
          <div className="space-y-3">
            <Field label="Confidential Practice Strategy / Case Notes">
              <Textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Legal theory, counsel opinions, key precedents, or procedural roadmap…"
              />
            </Field>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              type="button"
              onClick={() => navigate(isEdit ? `/app/cases/${id}` : '/app/cases')}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saveMutation.isPending}>
              {isEdit ? 'Save Changes' : 'Open Case'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
