import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Filter, Sparkles, MessageCircle, FileText, Image as ImageIcon, Users } from 'lucide-react';
import { mockMemories } from '@/lib/mockData';
import MemoryCard from '@/components/features/MemoryCard';
import { useNavigate } from 'react-router-dom';

const platformIcons = {
  whatsapp: MessageCircle,
  facebook: Users,
  instagram: ImageIcon,
  twitter: MessageCircle,
  notes: FileText,
  other: FileText
};

export default function TimelineView() {
  const [selectedMemories, setSelectedMemories] = useState<string[]>([]);
  const navigate = useNavigate();

  const toggleMemorySelection = (id: string) => {
    setSelectedMemories(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleGenerateSnapshot = () => {
    console.log('Generating AI Snapshot for memories:', selectedMemories);
    // Mock snapshot generation
    alert(`Generating AI Snapshot from ${selectedMemories.length} selected memories...`);
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Your Timeline</h2>
          <p className="text-muted-foreground">
            {mockMemories.length} memories • Select a time range to generate AI Snapshots
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 border-white/20">
            <Calendar className="w-4 h-4" />
            Date Range
          </Button>
          <Button variant="outline" className="gap-2 border-white/20">
            <Filter className="w-4 h-4" />
            Filters
          </Button>
          {selectedMemories.length > 0 && (
            <Button 
              onClick={handleGenerateSnapshot}
              className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              <Sparkles className="w-4 h-4" />
              Generate AI Snapshot ({selectedMemories.length})
            </Button>
          )}
        </div>
      </div>

      {/* Platform Filter Pills */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant="outline" className="px-3 py-1 border-white/20 hover:bg-primary/10 cursor-pointer">
          All Platforms
        </Badge>
        {Object.keys(platformIcons).map(platform => {
          const Icon = platformIcons[platform as keyof typeof platformIcons];
          return (
            <Badge 
              key={platform}
              variant="outline" 
              className="px-3 py-1 border-white/20 hover:bg-primary/10 cursor-pointer capitalize gap-2"
            >
              <Icon className="w-3 h-3" />
              {platform}
            </Badge>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {mockMemories.map((memory, index) => (
          <div key={memory.id}>
            {/* Date Separator */}
            {(index === 0 || new Date(mockMemories[index - 1].timestamp).toDateString() !== new Date(memory.timestamp).toDateString()) && (
              <div className="flex items-center gap-4 mb-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <span className="text-sm font-medium text-muted-foreground">
                  {new Date(memory.timestamp).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>
            )}
            
            <MemoryCard
              memory={memory}
              isSelected={selectedMemories.includes(memory.id)}
              onToggleSelect={toggleMemorySelection}
            />
          </div>
        ))}
      </div>

      {/* Empty State Helper */}
      {mockMemories.length === 0 && (
        <div className="glass-card p-16 rounded-3xl text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Calendar className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-3">Your Timeline Awaits</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Import your first data export to start building your unified timeline.
          </p>
          <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
            Import Your First Memories
          </Button>
        </div>
      )}
    </div>
  );
}
