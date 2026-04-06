'use client'

import { Database, Plus, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  onCreateNew: () => void
}

export function Header({ onCreateNew }: HeaderProps) {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/20">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">CRUD Builder</h1>
            <p className="text-xs text-muted-foreground">Mock API Generator</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
            <Database className="w-3.5 h-3.5" />
            <span>Local Storage</span>
          </div>
          <Button onClick={onCreateNew} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            New DTO
          </Button>
        </div>
      </div>
    </header>
  )
}
