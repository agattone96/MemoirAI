import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TimelineView from '@/components/features/TimelineView';
import SnapshotsView from '@/components/features/SnapshotsView';
import ImportView from '@/components/features/ImportView';
import AppHeader from '@/components/layout/AppHeader';
import { Search, Clock, Sparkles, Upload } from 'lucide-react';

export default function AppPage() {
  const [activeTab, setActiveTab] = useState('timeline');

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="glass-card p-1 h-auto">
            <TabsTrigger value="timeline" className="gap-2 data-[state=active]:bg-primary/20">
              <Clock className="w-4 h-4" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="snapshots" className="gap-2 data-[state=active]:bg-primary/20">
              <Sparkles className="w-4 h-4" />
              AI Snapshots
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-2 data-[state=active]:bg-primary/20">
              <Upload className="w-4 h-4" />
              Import Data
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline">
            <TimelineView />
          </TabsContent>

          <TabsContent value="snapshots">
            <SnapshotsView />
          </TabsContent>

          <TabsContent value="import">
            <ImportView />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
