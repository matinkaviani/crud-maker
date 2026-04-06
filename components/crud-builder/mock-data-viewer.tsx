'use client'

import { useState } from 'react'
import { RefreshCw, Plus, Trash2, Edit2, Check, X, Copy } from 'lucide-react'
import { useCRUDStore } from '@/lib/crud-store'
import { generateMockValue, type MockDataItem } from '@/lib/crud-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  const { schemas, mockData, regenerateMockData, addMockItem, updateMockItem, deleteMockItem } = useCRUDStore()
  const schema = schemas.find((s) => s.id === schemaId)
  const data = mockData[schemaId] || []
  
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, unknown>>({})
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newItemValues, setNewItemValues] = useState<Record<string, unknown>>({})
  
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
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
  }
  
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Mock Data</CardTitle>
            <CardDescription>
              {data.length} items in store
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyData}
              className="gap-1"
            >
              <Copy className="w-4 h-4" />
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => regenerateMockData(schemaId, 5)}
              className="gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate
            </Button>
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
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
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
                            <span className="text-sm">
                              {formatValue(item[field.name])}
                            </span>
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
