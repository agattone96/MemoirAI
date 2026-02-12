import { Switch, Route, useLocation } from 'wouter';
import { queryClient } from './lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { authService } from '@/lib/authService';
import NotFound from '@/pages/not-found';
import MemoirApp from '@/pages/memoir';
import { useEffect, useState } from 'react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      setLocation('/auth');
      return;
    }

    if (!loading && user?.mustResetPassword) {
      setLocation('/auth?forceReset=1');
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return (
      <div className="memoir-bg min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.mustResetPassword) {
    return null;
  }

  return <>{children}</>;
}

function AuthPage() {
  const [location, setLocation] = useLocation();
  const { user, login, refreshUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const forceResetMode = location.includes('forceReset=1') || Boolean(user?.mustResetPassword);

  useEffect(() => {
    if (user && !user.mustResetPassword) {
      setLocation('/');
    }
  }, [user, setLocation]);

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const signedIn = await authService.signInWithPassword(email, password);
      login(authService.mapUser(signedIn));
      await refreshUser();
      setLocation('/');
    } catch {
      setLoading(false);
    }
  };

  const handleForceReset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 12) return;
    setLoading(true);
    try {
      const updated = await authService.completeForcedPasswordReset(newPassword);
      if (!updated) return;
      login(authService.mapUser(updated));
      await refreshUser();
      setLocation('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="memoir-bg min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/favicon.png" alt="Memoir.ai Icon" className="w-16 h-16 rounded-2xl" />
            <span className="text-3xl font-bold bg-[linear-gradient(90deg,#35D3FF_0%,#7C4DFF_50%,#FF3DBD_100%)] bg-clip-text text-transparent">
              Memoir.ai
            </span>
          </div>
          <p className="text-white/60">
            {forceResetMode ? 'Set a new password to continue' : 'Sign in to access your personal archive'}
          </p>
        </div>
        <div className="memoir-noise rounded-3xl border border-white/10 bg-white/[0.03] p-8">
          {!forceResetMode ? (
            <form className="space-y-3" onSubmit={handleSignIn}>
              <input
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button className="w-full rounded-xl bg-white text-black px-3 py-2 font-medium" type="submit" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form className="space-y-3" onSubmit={handleForceReset}>
              <input
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
                type="password"
                placeholder="New password (min 12 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={12}
                required
              />
              <button className="w-full rounded-xl bg-white text-black px-3 py-2 font-medium" type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Set New Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/">
        <ProtectedRoute>
          <MemoirApp />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
