'use client'

import { Database, MoreHorizontal, Trash2, Edit, Copy } from 'lucide-react'
import { useCRUDStore } from '@/lib/crud-store'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export function SchemaList() {
  const { schemas, activeSchemaId, setActiveSchema, deleteSchema } = useCRUDStore()

  if (schemas.length === 0) {
    return null
  }

  return (
    <div className="border-b border-border bg-card/30">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs text-muted-foreground shrink-0">DTOs:</span>
          {schemas.map((schema) => (
            <div
              key={schema.id}
              className={cn(
                "group flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer shrink-0",
                activeSchemaId === schema.id
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-secondary/50 border-border hover:border-primary/30"
              )}
              onClick={() => setActiveSchema(schema.id)}
            >
              <Database className="w-3.5 h-3.5" />
              <span className="text-sm font-medium">{schema.name}</span>
              <span className="text-xs text-muted-foreground">
                {schema.fields.length} fields
              </span>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setActiveSchema(schema.id)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(schema, null, 2))
                  }}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => deleteSchema(schema.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
