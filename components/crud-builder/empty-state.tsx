'use client'

import { Database, Plus, Zap, Code, TestTube } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  onCreateNew: () => void
}

export function EmptyState({ onCreateNew }: EmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16 px-4">
      <div className="max-w-md text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Zap className="w-8 h-8 text-primary" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground text-balance">
            Build Mock APIs in Seconds
          </h2>
          <p className="text-muted-foreground text-balance">
            Define your DTO schema and instantly generate complete CRUD endpoints for testing and prototyping.
          </p>
        </div>
        
        <div className="grid grid-cols-3 gap-4 py-4">
          <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-card border border-border">
            <Database className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Define DTO</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-card border border-border">
            <Code className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Generate APIs</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-card border border-border">
            <TestTube className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Test Locally</span>
          </div>
        </div>
        
        <Button onClick={onCreateNew} size="lg" className="gap-2">
          <Plus className="w-5 h-5" />
          Create Your First DTO
        </Button>
      </div>
    </div>
  )
}
