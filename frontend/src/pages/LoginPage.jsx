import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LexBuddy } from '../components/mascot/LexBuddy';
import { Button, Card, Field, Input } from '../components/ui';
import { useAuth } from '../features/auth/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/app');
    } catch (err) {
      setError(err.message || 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <LexBuddy mood="happy" size="lg" showMessage message="Welcome back! Let's organize your day." className="mb-6" />
      <Card>
        <h1 className="font-display text-2xl font-bold">Sign in to Lexora LegalDesk</h1>
        <p className="mt-1 text-sm text-muted">Accounts are provisioned by an administrator. There is no public registration.</p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <Field label="Email">
            <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Password">
            <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" loading={loading} className="w-full">
            Sign in
          </Button>
        </form>
        <p className="mt-4 text-sm">
          <Link className="text-primary" to="/forgot-password">
            Forgot password?
          </Link>
        </p>
      </Card>
    </div>
  );
}
