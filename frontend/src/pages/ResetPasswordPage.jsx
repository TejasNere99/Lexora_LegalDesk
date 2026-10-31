import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LexBuddy } from '../components/mascot/LexBuddy';
import { Button, Card, Field, Input } from '../components/ui';
import { api } from '../lib/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    if (!token) {
      setError('Missing or invalid reset token. Please request a new link.');
      return;
    }
    if (password.length < 10) {
      setError('Password must be at least 10 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Unable to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <LexBuddy
        mood={success ? 'celebrating' : 'thinking'}
        size="lg"
        showMessage
        message={success ? 'Password updated! Redirecting to login…' : 'Create a strong new password.'}
        className="mb-6"
      />
      <Card>
        <h1 className="font-display text-2xl font-bold">Set new password</h1>
        <p className="mt-1 text-sm text-muted">
          Your new password must be at least 10 characters with good complexity.
        </p>

        {!token ? (
          <div className="mt-6 rounded-control bg-red-50 p-4 text-sm text-danger">
            <p className="font-semibold">Invalid reset link</p>
            <p className="mt-1 text-muted">This password reset link is missing a valid security token.</p>
            <Link to="/forgot-password" className="mt-3 inline-block font-semibold text-primary hover:underline">
              Request a new reset link
            </Link>
          </div>
        ) : success ? (
          <div className="mt-6 rounded-control bg-emerald-50 p-4 text-sm text-success">
            <p className="font-semibold">Password successfully changed!</p>
            <p className="mt-1 text-muted">You will be redirected to the sign-in page shortly.</p>
            <Link to="/login" className="mt-3 inline-block font-semibold text-primary hover:underline">
              Sign in now
            </Link>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <Field label="New Password">
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

            <Field label="Confirm New Password">
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
              Update password
            </Button>

            <div className="pt-2 text-center">
              <Link to="/login" className="text-sm font-medium text-primary hover:underline">
                Back to sign in
              </Link>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
