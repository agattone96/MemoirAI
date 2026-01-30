import { Memory } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageCircle, FileText, Image as ImageIcon, Users, Heart, ChevronRight } from 'lucide-react';

interface MemoryCardProps {
  memory: Memory;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}

const platformColors = {
  whatsapp: 'bg-green-500/10 text-green-400 border-green-500/30',
  facebook: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  instagram: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
  twitter: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  notes: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  other: 'bg-gray-500/10 text-gray-400 border-gray-500/30'
};

const platformIcons = {
  whatsapp: MessageCircle,
  facebook: Users,
  instagram: ImageIcon,
  twitter: MessageCircle,
  notes: FileText,
  other: FileText
};

export default function MemoryCard({ memory, isSelected, onToggleSelect }: MemoryCardProps) {
  const Icon = platformIcons[memory.platform];
  const platformColor = platformColors[memory.platform];

  return (
    <div 
      className={`glass-card p-6 rounded-xl hover:border-primary/30 transition-all cursor-pointer group ${
        isSelected ? 'border-primary/50 bg-primary/5' : ''
      }`}
      onClick={() => onToggleSelect(memory.id)}
    >
      <div className="flex gap-4">
        {/* Selection Checkbox */}
        <div className="pt-1">
          <Checkbox 
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(memory.id)}
            className="border-white/30"
          />
        </div>

        {/* Content */}
        <div className="flex-1 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="outline" className={`gap-1.5 ${platformColor}`}>
                <Icon className="w-3 h-3" />
                {memory.platform}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {new Date(memory.timestamp).toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit' 
                })}
              </span>
              {memory.participants.length > 1 && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="w-3 h-3" />
                  {memory.participants.filter(p => p !== 'You').join(', ')}
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {memory.metadata?.mediaCount && (
                <div className="flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  {memory.metadata.mediaCount}
                </div>
              )}
              {memory.metadata?.reactions && (
                <div className="flex items-center gap-1">
                  <Heart className="w-3 h-3" />
                  {memory.metadata.reactions}
                </div>
              )}
            </div>
          </div>

          {/* Content Preview */}
          <p className="text-foreground leading-relaxed line-clamp-3">
            {memory.content}
          </p>

          {/* View Details Link */}
          <button className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors opacity-0 group-hover:opacity-100">
            View Details
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
