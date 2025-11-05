import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '../lib/authStore';
import { LoginForm } from '../components/LoginForm';

export function LoginPage() {
  const { user, status } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && status === 'authenticated') {
      void navigate({ to: '/' });
    }
  }, [user, status, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-16 text-slate-100">
      <LoginForm />
    </div>
  );
}
