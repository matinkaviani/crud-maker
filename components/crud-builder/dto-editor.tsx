'use client'

import { useState } from 'react'
import { Plus, Trash2, GripVertical, Hash, Type, ToggleLeft, Calendar, Mail, Key, List, Braces, FileJson2 } from 'lucide-react'
import { useCRUDStore } from '@/lib/crud-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ImportJsonDialog } from '@/components/crud-builder/import-json-dialog'
import type { FieldType, DTOField } from '@/lib/crud-types'

const fieldTypeIcons: Record<FieldType, React.ReactNode> = {
  string: <Type className="w-4 h-4" />,
  number: <Hash className="w-4 h-4" />,
  boolean: <ToggleLeft className="w-4 h-4" />,
  date: <Calendar className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  uuid: <Key className="w-4 h-4" />,
  array: <List className="w-4 h-4" />,
  object: <Braces className="w-4 h-4" />,
}

const fieldTypes: FieldType[] = ['string', 'number', 'boolean', 'date', 'email', 'uuid', 'array', 'object']

interface DTOEditorProps {
  schemaId: string
}

export function DTOEditor({ schemaId }: DTOEditorProps) {
  const { schemas, updateSchema, addField, updateField, deleteField, replaceFieldsFromSample } = useCRUDStore()
  const schema = schemas.find((s) => s.id === schemaId)
  
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldType, setNewFieldType] = useState<FieldType>('string')
  const [importJsonOpen, setImportJsonOpen] = useState(false)
  
  if (!schema) return null
  
  const handleAddField = () => {
    if (!newFieldName.trim()) return
    
    addField(schemaId, {
      name: newFieldName.trim(),
      type: newFieldType,
      required: true,
    })
    
    setNewFieldName('')
    setNewFieldType('string')
  }
  
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4 flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-lg">DTO Schema</CardTitle>
          <CardDescription>Define your data transfer object structure</CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={() => setImportJsonOpen(true)}
        >
          <FileJson2 className="w-4 h-4" />
          Import from JSON
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Schema Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="schema-name">Schema Name</Label>
            <Input
              id="schema-name"
              value={schema.name}
              onChange={(e) => updateSchema(schemaId, { name: e.target.value })}
              placeholder="e.g., User, Product, Order"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="base-path">Base Path</Label>
            <Input
              id="base-path"
              value={schema.basePath}
              onChange={(e) => updateSchema(schemaId, { basePath: e.target.value })}
              placeholder="e.g., /api/users"
            />
          </div>
        </div>
        
        {/* Fields List */}
        <div className="space-y-3">
          <Label>Fields</Label>
          
          {schema.fields.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No fields defined yet. Import from JSON (button above) or add fields manually.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {schema.fields.map((field) => (
                <FieldRow
                  key={field.id}
                  field={field}
                  onUpdate={(updates) => updateField(schemaId, field.id, updates)}
                  onDelete={() => deleteField(schemaId, field.id)}
                />
              ))}
            </div>
          )}
          
          {/* Add Field Form */}
          <div className="flex items-center gap-2 pt-2">
            <Input
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              placeholder="Field name"
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddField()
              }}
            />
            <Select value={newFieldType} onValueChange={(v) => setNewFieldType(v as FieldType)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fieldTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    <div className="flex items-center gap-2">
                      {fieldTypeIcons[type]}
                      <span className="capitalize">{type}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddField} size="sm" className="gap-1">
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </div>
        </div>
      </CardContent>

      <ImportJsonDialog
        open={importJsonOpen}
        onOpenChange={setImportJsonOpen}
        replaceWarning={schema.fields.length > 0}
        onApply={(fields) => replaceFieldsFromSample(schemaId, fields)}
      />
    </Card>
  )
}

interface FieldRowProps {
  field: DTOField
  onUpdate: (updates: Partial<DTOField>) => void
  onDelete: () => void
}

function FieldRow({ field, onUpdate, onDelete }: FieldRowProps) {
  return (
    <div className="flex items-center gap-2 p-3 bg-secondary/30 rounded-lg border border-border group">
      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
      
      <div className="flex items-center gap-2 text-muted-foreground">
        {fieldTypeIcons[field.type]}
      </div>
      
      <Input
        value={field.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
        className="flex-1 h-8 bg-transparent border-0 px-2 focus-visible:ring-1"
      />
      
      <Select value={field.type} onValueChange={(v) => onUpdate({ type: v as FieldType })}>
        <SelectTrigger className="w-[120px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {fieldTypes.map((type) => (
            <SelectItem key={type} value={type}>
              <span className="capitalize">{type}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <div className="flex items-center gap-2">
        <Label htmlFor={`required-${field.id}`} className="text-xs text-muted-foreground">
          Required
        </Label>
        <Switch
          id={`required-${field.id}`}
          checked={field.required}
          onCheckedChange={(checked) => onUpdate({ required: checked })}
        />
      </div>
      
      <Button
        variant="ghost"
        size="icon-sm"
        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  )
}
