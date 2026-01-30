import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Calendar, FileText, ExternalLink, Clock } from 'lucide-react';
import { mockSnapshots } from '@/lib/mockData';

export default function SnapshotsView() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Snapshots</h2>
          <p className="text-muted-foreground">
            Narrative summaries generated from your timeline
          </p>
        </div>
        <Button className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90">
          <Sparkles className="w-4 h-4" />
          Create New Snapshot
        </Button>
      </div>

      {/* Snapshots List */}
      <div className="space-y-6">
        {mockSnapshots.map(snapshot => (
          <div key={snapshot.id} className="glass-card p-8 rounded-2xl space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold">{snapshot.title}</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {new Date(snapshot.dateRange.start).toLocaleDateString()} - {new Date(snapshot.dateRange.end).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    Updated {new Date(snapshot.updatedAt).toLocaleDateString()}
                  </div>
                  <Badge variant="outline" className="border-primary/30 text-primary">
                    {snapshot.citations.length} citations
                  </Badge>
                </div>
              </div>
              <Button variant="outline" className="gap-2 border-white/20">
                <FileText className="w-4 h-4" />
                Edit
              </Button>
            </div>

            {/* Narrative */}
            <div className="prose prose-invert max-w-none">
              <p className="text-foreground/90 leading-relaxed whitespace-pre-line">
                {snapshot.narrative}
              </p>
            </div>

            {/* Citations */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Source Citations
              </h4>
              <div className="grid gap-3">
                {snapshot.citations.map(citation => (
                  <div 
                    key={citation.id}
                    className="glass-card p-4 rounded-lg border-l-2 border-primary/50 hover:border-primary transition-colors group cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm text-foreground/80 italic mb-2">
                          "{citation.quote}"
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(citation.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Version History */}
            {snapshot.versions.length > 1 && (
              <div className="pt-4 border-t border-white/10">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  View {snapshot.versions.length} Previous Versions
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {mockSnapshots.length === 0 && (
        <div className="glass-card p-16 rounded-3xl text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-3">No AI Snapshots Yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Select memories from your Timeline and generate your first AI-powered narrative summary.
          </p>
          <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
            Go to Timeline
          </Button>
        </div>
      )}
    </div>
  );
}
