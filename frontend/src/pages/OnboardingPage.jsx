import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { LexBuddy } from '../components/mascot/LexBuddy';
import { Button, Card } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../features/auth/AuthContext';

const STEPS = [
  { title: 'Clients', body: 'Keep contact details, follow-ups, and interaction notes in one place.' },
  { title: 'Cases', body: 'Organize matters with explicit team access, status, and internal notes.' },
  { title: 'Hearings', body: 'Track scheduled dates without implying a court confirmation you have not recorded.' },
  { title: 'Tasks', body: 'Assign work, watch deadlines, and keep the team in sync.' },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { reload } = useAuth();
  const reduce = useReducedMotion();

  async function finish() {
    localStorage.setItem('lexora-onboarding', 'done');
    await api.patch('/auth/me', { onboardingComplete: true });
    await reload();
    navigate('/app');
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-10">
      <motion.div animate={reduce ? undefined : { rotate: [0, 6, 0] }} transition={{ duration: 0.5 }}>
        <LexBuddy mood="happy" size="hero" />
      </motion.div>
      <h1 className="mt-6 font-display text-4xl font-extrabold">One workspace. Every case. A team in sync.</h1>
      <p className="mt-2 text-muted">A short tour of Lexora LegalDesk. Skip anytime — this is only a UI preference.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {STEPS.map((step) => (
          <Card key={step.title}>
            <h2 className="font-display text-lg font-bold">{step.title}</h2>
            <p className="mt-1 text-sm text-muted">{step.body}</p>
          </Card>
        ))}
      </div>
      <div className="mt-8 flex gap-3">
        <Button onClick={finish}>Get started</Button>
        <Button variant="secondary" onClick={finish}>
          Skip
        </Button>
      </div>
    </div>
  );
}
