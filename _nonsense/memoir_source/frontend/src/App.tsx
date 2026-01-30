import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, PenTool, Image, Clock, Settings, Menu, X, Sparkles, Map, Shield } from 'lucide-react';
import DashboardPage from './pages/DashboardPage';
import TimelinePage from './pages/TimelinePage';

// Lazy load heavy components
const DraftingPage = lazy(() => import('./pages/DraftingPage'));
const MediaPage = lazy(() => import('./pages/MediaPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const ArcsPage = lazy(() => import('./pages/ArcsPage'));
const ForensicsPage = lazy(() => import('./pages/ForensicsPage'));
const JobHistoryPage = lazy(() => import('./pages/JobHistoryPage'));
const WelcomePage = lazy(() => import('./pages/WelcomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));

import ErrorBoundary from './components/ErrorBoundary';
import { JobStatusBadge } from './components/JobMonitor';
import { SplashScreen } from './components/SplashScreen';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import logo from './assets/images/logo.png';
import wordmark from './assets/images/wordmark.png';
import avatar from './assets/images/avatar.png';

function NavLink({ to, icon, label, active }: { to: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={`flex items-center px-3 py-2.5 rounded-lg transition text-sm font-medium ${active
        ? 'bg-indigo-50 text-indigo-700'
        : 'text-gray-700 hover:bg-gray-50'
        }`}
    >
      {icon}
      <span className="ml-3">{label}</span>
    </Link>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {!sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-20 lg:hidden"
          onClick={() => setSidebarOpen(true)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${!sidebarOpen ? '-translate-x-full' : 'translate-x-0'
          }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="h-16 flex items-center px-6 border-b border-gray-100">
            <img src={logo} alt="Logo" className="w-8 h-8 mr-3" />
            <img src={wordmark} alt="Memoir.ai" className="h-5" />
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            <NavLink to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" active={location.pathname === '/'} />
            <NavLink to="/timeline" icon={<Clock size={20} />} label="Timeline" active={location.pathname === '/timeline'} />
            <NavLink to="/arcs" icon={<Map size={20} />} label="Narrative Arcs" active={location.pathname === '/arcs'} />
            <NavLink to="/chat" icon={<Sparkles size={20} />} label="Ask AI" active={location.pathname === '/chat'} />
            <NavLink to="/drafting" icon={<PenTool size={20} />} label="Drafting" active={location.pathname === '/drafting'} />
            <NavLink to="/forensics" icon={<Shield size={20} />} label="Forensics" active={location.pathname === '/forensics'} />
            <NavLink to="/jobs" icon={<Clock size={20} />} label="Jobs" active={location.pathname === '/jobs'} />
            <NavLink to="/media" icon={<Image size={20} />} label="Media Gallery" active={location.pathname === '/media'} />
          </nav>

          {/* User Profile & Settings */}
          <div className="px-4 py-4 border-t border-gray-100">
            <div className="flex items-center gap-3 mb-2 px-3 py-2">
              <img src={avatar} alt="User" className="w-8 h-8 rounded-full" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.full_name || 'User'}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
              </div>
            </div>
            <NavLink to="/settings" icon={<Settings size={20} />} label="Settings" active={location.pathname === '/settings'} />
            <button
              onClick={() => logout()}
              className="w-full flex items-center px-3 py-2.5 rounded-lg transition text-sm font-medium text-gray-700 hover:bg-gray-50 mt-2"
            >
              <span className="ml-3">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full bg-white relative">
        {/* Top Bar (Mobile Toggle) */}
        <div className="lg:hidden h-16 border-b border-gray-100 flex items-center justify-between px-4 bg-white z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <span className="ml-4 font-semibold text-gray-900">Memoir.ai</span>
          </div>
          <JobStatusBadge />
        </div>

        <div className="flex-1 overflow-auto relative">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          {showSplash ? (
            <SplashScreen onComplete={() => setShowSplash(false)} />
          ) : (
            <Suspense fallback={
              <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              </div>
            }>
              <Routes>
                {/* Public routes */}
                <Route path="/welcome" element={<WelcomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />

                {/* Protected routes with onboarding check */}
                <Route path="/*" element={
                  <ProtectedRoute>
                    <OnboardingCheck />
                  </ProtectedRoute>
                } />
              </Routes>
            </Suspense>
          )}
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

// Component to check if onboarding is needed
function OnboardingCheck() {
  const [settings, setSettings] = useState<{ setup_completed: boolean } | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => setSettings(data))
      .catch(() => setSettings({ setup_completed: false }));
  }, []);

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!settings.setup_completed) {
    return <OnboardingPage onComplete={() => window.location.reload()} />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route path="/arcs" element={<ArcsPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/drafting" element={<DraftingPage />} />
        <Route path="/forensics" element={<ForensicsPage />} />
        <Route path="/jobs" element={<JobHistoryPage />} />
        <Route path="/media" element={<MediaPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
