import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, FileJson, CheckCircle2, AlertCircle, Clock, X } from 'lucide-react';
import { mockImportJobs } from '@/lib/mockData';
import { ImportJob } from '@/types';

export default function ImportView() {
  const [isDragging, setIsDragging] = useState(false);
  const [jobs, setJobs] = useState<ImportJob[]>(mockImportJobs);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    console.log('Processing files:', files);
    
    // Mock import job creation
    files.forEach(file => {
      const newJob: ImportJob = {
        id: `j${Date.now()}`,
        filename: file.name,
        status: 'processing',
        progress: 0,
        totalRecords: Math.floor(Math.random() * 1000) + 100,
        processedRecords: 0,
        startedAt: new Date().toISOString()
      };
      
      setJobs(prev => [newJob, ...prev]);
      
      // Simulate processing
      simulateProgress(newJob.id);
    });
  };

  const simulateProgress = (jobId: string) => {
    const interval = setInterval(() => {
      setJobs(prev => prev.map(job => {
        if (job.id !== jobId) return job;
        
        const newProgress = Math.min(job.progress + Math.random() * 20, 100);
        const newProcessedRecords = job.totalRecords 
          ? Math.floor((newProgress / 100) * job.totalRecords)
          : undefined;
        
        if (newProgress >= 100) {
          clearInterval(interval);
          return {
            ...job,
            status: 'completed' as const,
            progress: 100,
            processedRecords: job.totalRecords,
            completedAt: new Date().toISOString()
          };
        }
        
        return {
          ...job,
          progress: newProgress,
          processedRecords: newProcessedRecords
        };
      }));
    }, 500);
  };

  const getStatusIcon = (status: ImportJob['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'processing':
      case 'uploading':
        return <Clock className="w-5 h-5 text-primary animate-spin" />;
    }
  };

  const getStatusBadge = (status: ImportJob['status']) => {
    const colors = {
      completed: 'bg-green-500/10 text-green-400 border-green-500/30',
      failed: 'bg-red-500/10 text-red-400 border-red-500/30',
      processing: 'bg-primary/10 text-primary border-primary/30',
      uploading: 'bg-primary/10 text-primary border-primary/30'
    };
    
    return (
      <Badge variant="outline" className={colors[status]}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-8">
      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`glass-card p-16 rounded-3xl border-2 border-dashed transition-all ${
          isDragging 
            ? 'border-primary bg-primary/5 scale-[1.02]' 
            : 'border-white/20 hover:border-primary/50'
        }`}
      >
        <div className="text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto">
            <Upload className="w-10 h-10 text-primary" />
          </div>
          
          <div>
            <h3 className="text-2xl font-semibold mb-2">Import Your Data</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Drag and drop your export files here, or click to browse. Supports CSV and JSON formats.
            </p>
          </div>

          <div className="flex justify-center gap-4">
            <input
              type="file"
              id="file-upload"
              multiple
              accept=".json,.csv"
              onChange={handleFileInput}
              className="hidden"
            />
            <label htmlFor="file-upload">
              <Button asChild className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                <span>
                  <FileJson className="w-4 h-4 mr-2" />
                  Select Files
                </span>
              </Button>
            </label>
          </div>

          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              Auto-detect format
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              Background processing
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent" />
              Resumable uploads
            </div>
          </div>
        </div>
      </div>

      {/* Supported Formats */}
      <div className="glass-card p-6 rounded-xl">
        <h4 className="font-semibold mb-4">Supported Formats</h4>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <FileJson className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <div className="font-medium text-sm">Facebook/Instagram</div>
              <div className="text-xs text-muted-foreground">JSON export format</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <FileJson className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <div className="font-medium text-sm">WhatsApp</div>
              <div className="text-xs text-muted-foreground">TXT or CSV chat export</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <FileJson className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="font-medium text-sm">Generic</div>
              <div className="text-xs text-muted-foreground">CSV with timestamp column</div>
            </div>
          </div>
        </div>
      </div>

      {/* Import Jobs */}
      {jobs.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Import History</h3>
          <div className="space-y-3">
            {jobs.map(job => (
              <div key={job.id} className="glass-card p-6 rounded-xl space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    {getStatusIcon(job.status)}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{job.filename}</span>
                        {getStatusBadge(job.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {job.status === 'completed' && job.totalRecords && (
                          <span>Imported {job.totalRecords.toLocaleString()} records</span>
                        )}
                        {(job.status === 'processing' || job.status === 'uploading') && job.totalRecords && (
                          <span>
                            {job.processedRecords?.toLocaleString()} / {job.totalRecords.toLocaleString()} records
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(job.startedAt).toLocaleString()}
                  </div>
                </div>

                {(job.status === 'processing' || job.status === 'uploading') && (
                  <Progress value={job.progress} className="h-2" />
                )}

                {job.status === 'failed' && job.error && (
                  <div className="flex items-center gap-2 text-sm text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    {job.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
