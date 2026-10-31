import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LexBuddy } from '../components/mascot/LexBuddy';
import { Button, Card, Field, Input } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../features/auth/AuthContext';

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { reload } = useAuth();

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(event) {
    event.preventDefault();
    if (!token) {
      setError('Missing invitation token.');
      return;
    }
    if (password.length < 10) {
      setError('Password must be at least 10 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.post('/auth/accept-invitation', { token, name, password });
      await reload();
      navigate('/onboarding');
    } catch (err) {
      setError(err.message || 'Unable to accept invitation. The invitation link may have expired.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <LexBuddy
        mood="happy"
        size="lg"
        showMessage
        message="Welcome to the practice! Set up your account to join the team."
        className="mb-6"
      />
      <Card>
        <h1 className="font-display text-2xl font-bold">Accept your invitation</h1>
        <p className="mt-1 text-sm text-muted">
          You've been invited to join the Lexora LegalDesk workspace. Complete your profile details below.
        </p>

        {!token ? (
          <div className="mt-6 rounded-control bg-red-50 p-4 text-sm text-danger">
            <p className="font-semibold">Invalid invitation link</p>
            <p className="mt-1 text-muted">This invitation URL is missing an authorization token.</p>
            <Link to="/login" className="mt-3 inline-block font-semibold text-primary hover:underline">
              Return to sign in
            </Link>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <Field label="Full Name">
              <Input
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Advocate Priya Sharma"
                required
              />
            </Field>

            <Field label="Create Password">
              <Input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 10 characters"
                required
                minLength={10}
              />
            </Field>

            <Field label="Confirm Password">
              <Input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
              />
            </Field>

            {error ? <p className="text-sm text-danger">{error}</p> : null}

            <Button type="submit" loading={loading} className="w-full">
              Join workspace
            </Button>

            <div className="pt-2 text-center">
              <Link to="/login" className="text-sm font-medium text-primary hover:underline">
                Already have an active account? Sign in
              </Link>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
