'use client'

import { useState, useEffect } from 'react'
import { FileJson2 } from 'lucide-react'
import { inferDtoFieldsFromJson } from '@/lib/json-to-dto'
import { Button } from '@/components/ui/button'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { DTOField } from '@/lib/crud-types'

const EXAMPLE = `{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "score": 42,
  "active": true,
  "meta": {}
}`

interface ImportJsonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply: (fields: Omit<DTOField, 'id'>[]) => void
  replaceWarning?: boolean
}

export function ImportJsonDialog({
  open,
  onOpenChange,
  onApply,
  replaceWarning,
}: ImportJsonDialogProps) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setError(null)
    }
  }, [open])

  const handleApply = () => {
    const result = inferDtoFieldsFromJson(text)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError(null)
    onApply(result.fields)
    setText('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson2 className="w-5 h-5 text-primary" />
            Import from sample JSON
          </DialogTitle>
          <DialogDescription>
            Paste one JSON object (or an array of objects — the first item is used) to infer field names
            and types.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {replaceWarning && (
            <Alert>
              <AlertDescription>
                This replaces all existing fields on this schema and regenerates mock data.
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="json-sample">Sample JSON</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setText(EXAMPLE)}
              >
                Load example
              </Button>
            </div>
            <Textarea
              id="json-sample"
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setError(null)
              }}
              placeholder='{ "id": "...", "title": "Hello" }'
              className="font-mono text-sm min-h-[200px]"
              spellCheck={false}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!text.trim()}>
            Generate DTO fields
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
