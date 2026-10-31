import { useState, useEffect } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { useToast } from '../hooks/useToast';
import { api } from '../lib/api';
import {
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Select,
} from '../components/ui';
import { InstallPrompt } from '../components/layout/InstallPrompt';
import { Shield, KeyRound, Smartphone, Lock, UserCheck } from 'lucide-react';

const TIMEZONES = [
  { id: 'Asia/Kolkata', label: 'Asia/Kolkata (IST, UTC+5:30)' },
  { id: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { id: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { id: 'America/New_York', label: 'America/New_York (EST/EDT)' },
  { id: 'Asia/Dubai', label: 'Asia/Dubai (GST, UTC+4)' },
  { id: 'Asia/Singapore', label: 'Asia/Singapore (SGT, UTC+8)' },
];

export default function SettingsPage() {
  const { user, reload } = useAuth();
  const { push } = useToast();

  // Profile form state
  const [name, setName] = useState(user?.name || '');
  const [timezone, setTimezone] = useState(user?.timezone || 'Asia/Kolkata');
  const [profileSaving, setProfileSaving] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setTimezone(user.timezone || 'Asia/Kolkata');
    }
  }, [user]);

  async function handleProfileSave(e) {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await api.patch('/auth/me', { name: name.trim(), timezone });
      await reload();
      push('Profile updated successfully');
    } catch (err) {
      push(err.message || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSave(e) {
    e.preventDefault();
    setPwError('');
    if (newPassword.length < 10) {
      setPwError('New password must be at least 10 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }
    setPwSaving(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      push('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwError(err.message || 'Failed to change password. Verify your current password.');
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Settings & Practice Security"
        subtitle="Manage your personal lawyer profile, device installation, and authentication security."
      />

      {/* Profile Settings */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2 border-b border-line pb-3">
          <UserCheck className="text-primary" size={20} />
          <h2 className="font-display text-lg font-bold">Advocate Profile</h2>
        </div>

        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>

            <Field label="Work Email Address">
              <Input value={user?.email || ''} disabled className="bg-cream text-muted" />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Timezone Preference">
              <Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                {TIMEZONES.map((tz) => (
                  <option key={tz.id} value={tz.id}>
                    {tz.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Assigned Role">
              <Input
                value={user?.role === 'admin' ? 'Practice Administrator' : 'Advocate / Lawyer'}
                disabled
                className="bg-cream text-muted"
              />
            </Field>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" loading={profileSaving}>
              Save Profile
            </Button>
          </div>
        </form>
      </Card>

      {/* Password Change */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2 border-b border-line pb-3">
          <KeyRound className="text-primary" size={20} />
          <h2 className="font-display text-lg font-bold">Change Password</h2>
        </div>

        <form onSubmit={handlePasswordSave} className="space-y-4">
          {pwError ? (
            <div className="rounded-control bg-red-50 p-3 text-xs font-semibold text-danger">
              {pwError}
            </div>
          ) : null}

          <Field label="Current Password">
            <Input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="New Password (min 10 chars)">
              <Input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={10}
                required
              />
            </Field>

            <Field label="Confirm New Password">
              <Input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </Field>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" loading={pwSaving}>
              Update Password
            </Button>
          </div>
        </form>
      </Card>

      {/* PWA & Mobile Installation */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2 border-b border-line pb-3">
          <Smartphone className="text-primary" size={20} />
          <h2 className="font-display text-lg font-bold">Progressive Web App (PWA) & Offline</h2>
        </div>

        <InstallPrompt />

        <div className="space-y-2 rounded-control bg-cream p-4 text-xs text-navy/90 leading-relaxed">
          <p className="font-bold text-navy">PWA Installation Instructions:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>
              <strong>Desktop Chrome / Edge:</strong> Click the install icon in the URL bar, or choose "Install Lexora LegalDesk" from the browser menu.
            </li>
            <li>
              <strong>iOS Safari:</strong> Tap the Share button at the bottom of Safari, scroll down, and select <em>"Add to Home Screen"</em>.
            </li>
            <li>
              <strong>Android Chrome:</strong> Tap the three-dot menu and select <em>"Install app"</em> or <em>"Add to Home screen"</em>.
            </li>
            <li>
              <strong>Confidentiality Notice:</strong> For regulatory compliance, confidential legal case files, client contact details, and hearing notes are <em>never</em> cached on local unencrypted browser storage. The app shell is cached for fast loading, while live records require secure authentication.
            </li>
          </ul>
        </div>
      </Card>

      {/* Practice Security Principles */}
      <Card className="space-y-3">
        <div className="flex items-center gap-2 border-b border-line pb-3">
          <Shield className="text-primary" size={20} />
          <h2 className="font-display text-lg font-bold">Chambers Security Safeguards</h2>
        </div>
        <div className="grid gap-3 text-xs text-muted sm:grid-cols-2">
          <div className="rounded-control border border-line p-3">
            <p className="font-semibold text-navy">Server-Side Authorization</p>
            <p className="mt-1">
              Every request enforces case-level permissions at the database query layer. URL tampering or guessed IDs cannot access unauthorized matters.
            </p>
          </div>
          <div className="rounded-control border border-line p-3">
            <p className="font-semibold text-navy">HttpOnly & CSRF Protection</p>
            <p className="mt-1">
              Authentication tokens reside in secure HttpOnly cookies immune to JavaScript XSS theft, paired with double-submit CSRF validation tokens.
            </p>
          </div>
          <div className="rounded-control border border-line p-3">
            <p className="font-semibold text-navy">Instant Session Revocation</p>
            <p className="mt-1">
              Deactivating a member account or changing passwords immediately invalidates all active sessions across desktop and mobile devices.
            </p>
          </div>
          <div className="rounded-control border border-line p-3">
            <p className="font-semibold text-navy">Tamper-Traceable Audit Trail</p>
            <p className="mt-1">
              Changes to hearing dates, task outcomes, client records, and access permissions are logged with actor timestamps.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
