'use client'

import { useState } from 'react'
import { Database } from 'lucide-react'
import { useCRUDStore } from '@/lib/crud-store'
import type { DTOField } from '@/lib/crud-types'
import { inferDtoFieldsFromJson, dtoFieldsWithIds } from '@/lib/json-to-dto'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface CreateSchemaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateSchemaDialog({ open, onOpenChange }: CreateSchemaDialogProps) {
  const { addSchema } = useCRUDStore()
  
  const [name, setName] = useState('')
  const [basePath, setBasePath] = useState('')
  const [sampleJson, setSampleJson] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)
  
  const handleCreate = () => {
    if (!name.trim()) return
    
    const path = basePath.trim() || `/api/${name.toLowerCase().replace(/\s+/g, '-')}s`

    let fields: DTOField[] = []
    if (sampleJson.trim()) {
      const inferred = inferDtoFieldsFromJson(sampleJson.trim())
      if (!inferred.ok) {
        setJsonError(inferred.error)
        return
      }
      fields = dtoFieldsWithIds(inferred.fields)
    }
    
    addSchema({
      name: name.trim(),
      basePath: path,
      fields,
    })
    
    setName('')
    setBasePath('')
    setSampleJson('')
    setJsonError(null)
    onOpenChange(false)
  }
  
  const suggestedPath = name.trim() 
    ? `/api/${name.toLowerCase().replace(/\s+/g, '-')}s`
    : ''
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Create New DTO Schema
          </DialogTitle>
          <DialogDescription>
            Define a new Data Transfer Object schema to generate CRUD endpoints
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Schema Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., User, Product, Order"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
              }}
            />
            <p className="text-xs text-muted-foreground">
              Use singular form (User, not Users)
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="basePath">Base Path</Label>
            <Input
              id="basePath"
              value={basePath}
              onChange={(e) => setBasePath(e.target.value)}
              placeholder={suggestedPath || '/api/resource'}
            />
            <p className="text-xs text-muted-foreground">
              {suggestedPath && `Suggested: ${suggestedPath}`}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sample-json">Sample JSON (optional)</Label>
            <Textarea
              id="sample-json"
              value={sampleJson}
              onChange={(e) => {
                setSampleJson(e.target.value)
                setJsonError(null)
              }}
              placeholder='Paste a JSON object to auto-generate fields, e.g. { "title": "A", "count": 1 }'
              className="font-mono text-sm min-h-[120px]"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              Infers field names and types from one object, or from the first object in an array.
            </p>
            {jsonError && (
              <p className="text-xs text-destructive" role="alert">
                {jsonError}
              </p>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim()}>
            Create Schema
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
