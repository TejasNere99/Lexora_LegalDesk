import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LexBuddy } from '../components/mascot/LexBuddy';
import { Button, Card, Field, Input } from '../components/ui';
import { api } from '../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Unable to process password reset request');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <LexBuddy
        mood="thinking"
        size="lg"
        showMessage
        message="Need to recover your account? Let's get you back in."
        className="mb-6"
      />
      <Card>
        <h1 className="font-display text-2xl font-bold">Reset your password</h1>
        <p className="mt-1 text-sm text-muted">
          Enter your registered work email address. If an active account matches, we'll send a secure reset link.
        </p>

        {submitted ? (
          <div className="mt-6 rounded-control bg-emerald-50 p-4 text-sm text-success">
            <p className="font-semibold">Reset instructions dispatched</p>
            <p className="mt-1 text-muted">
              If an account with that email exists, password reset instructions have been sent. Please check your inbox and spam folder.
            </p>
            <div className="mt-4">
              <Link to="/login" className="inline-block text-sm font-semibold text-primary hover:underline">
                Return to sign in
              </Link>
            </div>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <Field label="Work Email">
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="lawyer@example.com"
                required
              />
            </Field>

            {error ? <p className="text-sm text-danger">{error}</p> : null}

            <Button type="submit" loading={loading} className="w-full">
              Send reset link
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
