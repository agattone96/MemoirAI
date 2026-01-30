import { Button } from '@/components/ui/button';
import { ArrowRight, Clock, Search, Sparkles, Shield, Layout } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/app-icon.png" 
              alt="Memoir.ai Icon" 
              className="w-10 h-10 rounded-xl"
            />
            <span className="text-xl font-bold bg-gradient-to-r from-secondary via-primary to-accent bg-clip-text text-transparent">
              Memoir.ai
            </span>
          </div>
          <Button onClick={() => navigate('/auth')} variant="outline" className="border-white/20">
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-24 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-block">
              <div className="glass-card px-4 py-2 rounded-full border border-primary/30">
                <span className="text-sm text-primary font-medium">Your Digital History, Finally Whole</span>
              </div>
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
              Transform Your{' '}
              <span className="bg-gradient-to-r from-secondary via-primary to-accent bg-clip-text text-transparent">
                Digital Archives
              </span>{' '}
              into Personal Narratives
            </h1>
            
            <p className="text-xl text-muted-foreground leading-relaxed">
              Import all your messages, chats, and social archives into one unified, searchable timeline. 
              Then use AI to instantly generate fully-cited narrative summaries of your life's key moments.
            </p>
            
            <div className="flex gap-4">
              <Button 
                onClick={() => navigate('/auth')}
                size="lg" 
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white px-8"
              >
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white/20"
              >
                Watch Demo
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-secondary/20 via-primary/20 to-accent/20 blur-3xl animate-glow-pulse" />
            <img 
              src="https://cdn-ai.onspace.ai/onspace/project/uploads/VmwwyH2ZV9cuotebNSrPBC/heroimgmemoir.jpg"
              alt="Memoir.ai Timeline Visualization"
              className="relative rounded-2xl border border-white/10 shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Key Features Designed for Everyone</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Stop archiving and start understanding. Get organized, uncover insights, and create meaningful narratives.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="glass-card p-8 rounded-2xl hover:border-primary/30 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary/20 to-primary/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Layout className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">The Unified Timeline</h3>
            <p className="text-muted-foreground leading-relaxed">
              Every imported memory displayed chronologically in one place. Filter by date range, platform, or participants to instantly find context.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="glass-card p-8 rounded-2xl hover:border-primary/30 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Search className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Lightning-Fast Full-Text Search</h3>
            <p className="text-muted-foreground leading-relaxed">
              Find any message, note, or event across your entire digital history in seconds—even within massive data files.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="glass-card p-8 rounded-2xl hover:border-primary/30 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-secondary/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Instant AI Snapshots</h3>
            <p className="text-muted-foreground leading-relaxed">
              Select any period and let AI generate a clear narrative summary with explicit citations linking to original sources.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="glass-card p-8 rounded-2xl hover:border-primary/30 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary/20 to-primary/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Simple Data Ingestion</h3>
            <p className="text-muted-foreground leading-relaxed">
              Wizard-guided workflow makes importing easy. Upload CSV or JSON exports as robust, resumable background jobs.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="glass-card p-8 rounded-2xl hover:border-primary/30 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Complete Data Control</h3>
            <p className="text-muted-foreground leading-relaxed">
              Your data stays secure in separate private Libraries. Full control over what you import and how it's organized.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="glass-card p-8 rounded-2xl hover:border-primary/30 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-secondary/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Cited & Versioned</h3>
            <p className="text-muted-foreground leading-relaxed">
              Every AI-generated story backed by explicit citations. All edits maintain full version history for provenance.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-24">
        <div className="glass-card p-16 rounded-3xl text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-secondary/10 via-primary/10 to-accent/10" />
          <div className="relative z-10">
            <h2 className="text-4xl font-bold mb-6">
              It's Time to Stop Archiving and Start Understanding
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Get organized, uncover hidden insights, and instantly create meaningful narratives from your life.
            </p>
            <Button 
              onClick={() => navigate('/auth')}
              size="lg" 
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white px-8"
            >
              Begin Your Journey
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-24">
        <div className="container mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src="/app-icon.png" 
                  alt="Memoir.ai Icon" 
                  className="w-8 h-8 rounded-lg"
                />
                <span className="text-lg font-bold">Memoir.ai</span>
              </div>
              <p className="text-muted-foreground">
                Transform your digital archives into personal narratives with AI-powered insights.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>Features</li>
                <li>Pricing</li>
                <li>Security</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>About</li>
                <li>Blog</li>
                <li>Contact</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-12 pt-8 text-center text-muted-foreground">
            <p>&copy; 2026 Memoir.ai. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
