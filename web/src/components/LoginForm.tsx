import { FormEvent, useState } from 'react';
import { useAuth } from '../lib/authStore';

export function LoginForm() {
  const { login, status, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email || !password) return;
    await login(email, password);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg"
    >
      <div>
        <h1 className="text-xl font-semibold text-white">Welcome back</h1>
        <p className="text-sm text-slate-400">Sign in to access your recordings.</p>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-slate-300">Email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          required
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-slate-300">Password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          required
        />
      </label>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <button
        type="submit"
        className="flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={status === 'authenticating'}
      >
        {status === 'authenticating' ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
