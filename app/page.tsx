'use client'

import { useState, useEffect } from 'react'
import { useCRUDStore } from '@/lib/crud-store'
import { type GeneratedEndpoint } from '@/lib/crud-types'
import { Header } from '@/components/crud-builder/header'
import { SchemaList } from '@/components/crud-builder/schema-list'
import { DTOEditor } from '@/components/crud-builder/dto-editor'
import { EndpointsPanel } from '@/components/crud-builder/endpoints-panel'
import { MockDataViewer } from '@/components/crud-builder/mock-data-viewer'
import { APITester } from '@/components/crud-builder/api-tester'
import { CreateSchemaDialog } from '@/components/crud-builder/create-schema-dialog'
import { EmptyState } from '@/components/crud-builder/empty-state'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function CRUDBuilderPage() {
  const { schemas, activeSchemaId, setActiveSchema } = useCRUDStore()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [selectedEndpoint, setSelectedEndpoint] = useState<GeneratedEndpoint | null>(null)
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Auto-select first schema if none selected
  useEffect(() => {
    if (mounted && schemas.length > 0 && !activeSchemaId) {
      setActiveSchema(schemas[0].id)
    }
  }, [mounted, schemas, activeSchemaId, setActiveSchema])
  
  // Reset selected endpoint when schema changes
  useEffect(() => {
    setSelectedEndpoint(null)
  }, [activeSchemaId])
  
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }
  
  const hasSchemas = schemas.length > 0
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header onCreateNew={() => setCreateDialogOpen(true)} />
      <SchemaList />
      
      {hasSchemas && activeSchemaId ? (
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
          <Tabs defaultValue="schema" className="space-y-6">
            <TabsList className="bg-card border border-border">
              <TabsTrigger value="schema">Schema</TabsTrigger>
              <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
              <TabsTrigger value="data">Mock Data</TabsTrigger>
              <TabsTrigger value="test">API Tester</TabsTrigger>
            </TabsList>
            
            <TabsContent value="schema" className="space-y-6 mt-6">
              <DTOEditor schemaId={activeSchemaId} />
            </TabsContent>
            
            <TabsContent value="endpoints" className="space-y-6 mt-6">
              <EndpointsPanel
                schemaId={activeSchemaId}
                onTest={setSelectedEndpoint}
              />
            </TabsContent>
            
            <TabsContent value="data" className="space-y-6 mt-6">
              <MockDataViewer schemaId={activeSchemaId} />
            </TabsContent>
            
            <TabsContent value="test" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <EndpointsPanel
                  schemaId={activeSchemaId}
                  onTest={setSelectedEndpoint}
                />
                <APITester
                  schemaId={activeSchemaId}
                  selectedEndpoint={selectedEndpoint}
                />
              </div>
            </TabsContent>
          </Tabs>
        </main>
      ) : (
        <EmptyState onCreateNew={() => setCreateDialogOpen(true)} />
      )}
      
      <CreateSchemaDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  )
}
