'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Plus, Trash2, Edit2, Check, X, Copy } from 'lucide-react'
import { useCRUDStore } from '@/lib/crud-store'
import { generateMockValue, type MockDataItem } from '@/lib/crud-types'
import { inferMockEditorMode, asMockTableRows, type MockDataEditorMode } from '@/lib/mock-editor-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface MockDataViewerProps {
  schemaId: string
}

export function MockDataViewer({ schemaId }: MockDataViewerProps) {
  const {
    schemas,
    mockData,
    mockDataEditorMode,
    setMockDataEditorMode,
    setMockPayload,
    regenerateMockData,
    addMockItem,
    updateMockItem,
    deleteMockItem,
  } = useCRUDStore()
  const schema = schemas.find((s) => s.id === schemaId)
  const raw = mockData[schemaId]
  const mode: MockDataEditorMode =
    mockDataEditorMode[schemaId] ?? inferMockEditorMode(raw)
  const data = asMockTableRows(raw)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, unknown>>({})
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newItemValues, setNewItemValues] = useState<Record<string, unknown>>({})
  const [jsonDraft, setJsonDraft] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [modeError, setModeError] = useState<string | null>(null)

  useEffect(() => {
    setJsonDraft(JSON.stringify(raw ?? null, null, 2))
    setJsonError(null)
  }, [schemaId, raw])

  if (!schema) return null

  const startEditing = (item: MockDataItem) => {
    setEditingId(item.id)
    setEditValues({ ...item })
  }

  const saveEditing = () => {
    if (editingId) {
      updateMockItem(schemaId, editingId, editValues)
      setEditingId(null)
      setEditValues({})
    }
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditValues({})
  }

  const handleAddItem = () => {
    const newItem: MockDataItem = {
      id: crypto.randomUUID(),
      ...newItemValues,
    }
    addMockItem(schemaId, newItem)
    setNewItemValues({})
    setIsAddDialogOpen(false)
  }

  const initNewItem = () => {
    const values: Record<string, unknown> = {}
    schema.fields.forEach((field) => {
      values[field.name] = generateMockValue(field.type, field.name)
    })
    setNewItemValues(values)
  }

  const copyData = () => {
    navigator.clipboard.writeText(JSON.stringify(raw ?? null, null, 2))
  }

  const applyJson = () => {
    setJsonError(null)
    try {
      const parsed = jsonDraft.trim() === '' ? null : JSON.parse(jsonDraft)
      setMockPayload(schemaId, parsed)
    } catch {
      setJsonError('Invalid JSON — fix syntax and try again.')
    }
  }

  const handleModeChange = (next: string) => {
    if (next !== 'table' && next !== 'json') return
    setModeError(null)
    if (next === 'json') {
      setMockDataEditorMode(schemaId, 'json')
      setJsonDraft(JSON.stringify(raw ?? null, null, 2))
      return
    }
    if (inferMockEditorMode(raw) !== 'table') {
      setModeError('Switch to a row list: an array of objects, each with a string id.')
      return
    }
    setMockDataEditorMode(schemaId, 'table')
  }

  const isJsonMode = mode === 'json'
  const tableEmpty = !isJsonMode && data.length === 0

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Mock Data</CardTitle>
            <CardDescription>
              {isJsonMode
                ? 'Arbitrary JSON (object, array, string, number, …) is stored and returned by GET /api/crud/…'
                : `${data.length} rows (array of objects with id)`}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ToggleGroup
              type="single"
              value={mode}
              onValueChange={(v) => v && handleModeChange(v)}
              variant="outline"
              size="sm"
              className="border border-border"
            >
              <ToggleGroupItem value="table" aria-label="Table rows">
                Table
              </ToggleGroupItem>
              <ToggleGroupItem value="json" aria-label="Raw JSON">
                JSON
              </ToggleGroupItem>
            </ToggleGroup>
            <Button variant="outline" size="sm" onClick={copyData} className="gap-1">
              <Copy className="w-4 h-4" />
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => regenerateMockData(schemaId, 5)}
              disabled={isJsonMode}
              className="gap-1"
              title={isJsonMode ? 'Switch to Table mode to regenerate rows' : undefined}
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate
            </Button>
            {!isJsonMode && (
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1" onClick={initNewItem}>
                    <Plus className="w-4 h-4" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader>
                    <DialogTitle>Add New Item</DialogTitle>
                    <DialogDescription>
                      Create a new mock data item for {schema.name}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {schema.fields.map((field) => (
                      <div key={field.id} className="space-y-2">
                        <Label>{field.name}</Label>
                        <Input
                          value={String(newItemValues[field.name] ?? '')}
                          onChange={(e) =>
                            setNewItemValues((prev) => ({
                              ...prev,
                              [field.name]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddItem}>Add Item</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
        {modeError && <p className="text-sm text-destructive">{modeError}</p>}
      </CardHeader>
      <CardContent>
        {isJsonMode ? (
          <div className="space-y-3">
            <Label htmlFor="mock-json">Payload (any JSON)</Label>
            <Textarea
              id="mock-json"
              value={jsonDraft}
              onChange={(e) => setJsonDraft(e.target.value)}
              className="font-mono text-sm min-h-[280px]"
              spellCheck={false}
            />
            {jsonError && <p className="text-sm text-destructive">{jsonError}</p>}
            <Button size="sm" onClick={applyJson}>
              Apply & sync to server
            </Button>
          </div>
        ) : tableEmpty ? (
          <div className="border border-dashed border-border rounded-lg p-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              No mock data yet. Generate some data to get started.
            </p>
            <Button
              variant="outline"
              onClick={() => regenerateMockData(schemaId, 5)}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Generate Mock Data
            </Button>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-xs font-mono">id</TableHead>
                    {schema.fields.map((field) => (
                      <TableHead key={field.id} className="text-xs font-mono">
                        {field.name}
                      </TableHead>
                    ))}
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item) => (
                    <TableRow key={item.id} className="border-border">
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {item.id.slice(0, 8)}...
                      </TableCell>
                      {schema.fields.map((field) => (
                        <TableCell key={field.id}>
                          {editingId === item.id ? (
                            <Input
                              value={String(editValues[field.name] ?? '')}
                              onChange={(e) =>
                                setEditValues((prev) => ({
                                  ...prev,
                                  [field.name]: e.target.value,
                                }))
                              }
                              className="h-8 text-sm"
                            />
                          ) : (
                            <span className="text-sm">{formatValue(item[field.name])}</span>
                          )}
                        </TableCell>
                      ))}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {editingId === item.id ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={saveEditing}
                                className="text-primary hover:text-primary"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={cancelEditing}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => startEditing(item)}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => deleteMockItem(schemaId, item.id)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
