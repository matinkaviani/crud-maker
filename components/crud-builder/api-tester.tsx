'use client'

import { useState } from 'react'
import { Play, Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import { useCRUDStore } from '@/lib/crud-store'
import { type GeneratedEndpoint, type MockDataItem } from '@/lib/crud-types'
import { recordsFromPayload } from '@/lib/crud-payload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const methodColors: Record<string, string> = {
  GET: 'bg-method-get/10 text-method-get border-method-get/30',
  POST: 'bg-method-post/10 text-method-post border-method-post/30',
  PUT: 'bg-method-put/10 text-method-put border-method-put/30',
  DELETE: 'bg-method-delete/10 text-method-delete border-method-delete/30',
}

interface APITesterProps {
  schemaId: string
  selectedEndpoint: GeneratedEndpoint | null
}

export function APITester({ schemaId, selectedEndpoint }: APITesterProps) {
  const {
    schemas,
    mockData,
    endpointConfigs,
    addTestResult,
    testResults,
    clearTestResults,
    addMockItem,
    updateMockItem,
    deleteMockItem,
  } = useCRUDStore()
  const schema = schemas.find((s) => s.id === schemaId)
  const config = endpointConfigs[schemaId]
  
  const [pathParams, setPathParams] = useState<Record<string, string>>({})
  const [requestBody, setRequestBody] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  if (!schema) return null
  
  const payload = mockData[schemaId]
  const crudRecords = recordsFromPayload(payload)
  const firstId = crudRecords?.[0]?.id

  const collectionSyncAllowed = () =>
    recordsFromPayload(useCRUDStore.getState().mockData[schemaId]) != null
  
  const executeRequest = async () => {
    if (!selectedEndpoint) return

    const endpointConfig = config?.[selectedEndpoint.configKey]
    setIsLoading(true)

    const startTime = Date.now()

    if (endpointConfig?.delay) {
      await new Promise((resolve) => setTimeout(resolve, endpointConfig.delay))
    }

    const shouldSimulateError = Math.random() * 100 < (endpointConfig?.errorRate ?? 0)
    if (shouldSimulateError) {
      addTestResult({
        endpoint: selectedEndpoint.path,
        method: selectedEndpoint.method,
        status: 500,
        responseTime: Date.now() - startTime,
        response: {
          error: 'Simulated error',
          message: 'Random failure from error rate (request was not sent)',
        },
      })
      setIsLoading(false)
      return
    }

    let path = selectedEndpoint.path
    if (path.includes(':id')) {
      path = path.replace(':id', encodeURIComponent(pathParams.id))
    }

    const init: RequestInit = {
      method: selectedEndpoint.method,
      headers: { 'Content-Type': 'application/json' },
    }
    if (selectedEndpoint.method === 'POST' || selectedEndpoint.method === 'PUT') {
      init.body = requestBody.trim() || '{}'
    }

    try {
      const res = await fetch(path, init)
      const responseTime = Date.now() - startTime
      const text = await res.text()
      let response: unknown
      try {
        response = text ? JSON.parse(text) : null
      } catch {
        response = { raw: text }
      }

      addTestResult({
        endpoint: selectedEndpoint.path,
        method: selectedEndpoint.method,
        status: res.status,
        responseTime,
        response,
      })

      if (res.ok && collectionSyncAllowed()) {
        const key = selectedEndpoint.configKey
        if (key === 'create' && response && typeof response === 'object' && 'data' in response) {
          const d = (response as { data: unknown }).data
          if (d && typeof d === 'object' && !Array.isArray(d) && typeof (d as MockDataItem).id === 'string') {
            addMockItem(schemaId, d as MockDataItem)
          }
        } else if (key === 'update' && response && typeof response === 'object' && 'data' in response) {
          const d = (response as { data: unknown }).data
          if (d && typeof d === 'object' && !Array.isArray(d) && typeof (d as MockDataItem).id === 'string') {
            updateMockItem(schemaId, (d as MockDataItem).id, d as MockDataItem)
          }
        } else if (key === 'delete') {
          deleteMockItem(schemaId, pathParams.id)
        }
      }
    } catch (e) {
      addTestResult({
        endpoint: selectedEndpoint.path,
        method: selectedEndpoint.method,
        status: 0,
        responseTime: Date.now() - startTime,
        response: { error: 'Network error', message: String(e) },
      })
    }

    setIsLoading(false)
  }
  
  const hasPathParam = selectedEndpoint?.path.includes(':id')
  
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">API Tester</CardTitle>
            <CardDescription>
              Sends real HTTP requests to this app&apos;s Route Handlers. Mock data is synced when you load
              the app or change the Mock Data tab (table rows or JSON). GET returns whatever JSON you
              stored; row-style CRUD sync only applies when the mock is an id-keyed list or one object
              with id.
            </CardDescription>
          </div>
          {testResults.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearTestResults}
              className="text-muted-foreground hover:text-destructive gap-1"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedEndpoint ? (
          <>
            {/* Selected Endpoint */}
            <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg border border-border">
              <span className={cn(
                "px-2 py-1 rounded text-xs font-mono font-bold border",
                methodColors[selectedEndpoint.method]
              )}>
                {selectedEndpoint.method}
              </span>
              <code className="text-sm font-mono text-foreground">
                {selectedEndpoint.path}
              </code>
            </div>
            
            {/* Path Parameters */}
            {hasPathParam && (
              <div className="space-y-2">
                <Label>Path Parameters</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">:id =</span>
                  <Input
                    value={pathParams.id || ''}
                    onChange={(e) => setPathParams({ ...pathParams, id: e.target.value })}
                    placeholder="Enter ID"
                    className="flex-1"
                  />
                  {firstId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPathParams({ ...pathParams, id: firstId })}
                    >
                      Use First
                    </Button>
                  )}
                </div>
              </div>
            )}
            
            {/* Request Body */}
            {(selectedEndpoint.method === 'POST' || selectedEndpoint.method === 'PUT') && (
              <div className="space-y-2">
                <Label>Request Body</Label>
                <Textarea
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  placeholder={JSON.stringify(selectedEndpoint.requestBody, null, 2)}
                  className="font-mono text-sm min-h-[120px]"
                />
              </div>
            )}
            
            {/* Execute Button */}
            <Button
              onClick={executeRequest}
              disabled={isLoading || (hasPathParam && !pathParams.id)}
              className="w-full gap-2"
            >
              {isLoading ? (
                <Clock className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {isLoading ? 'Executing...' : 'Execute Request'}
            </Button>
          </>
        ) : (
          <div className="border border-dashed border-border rounded-lg p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Select an endpoint from the list above to test it
            </p>
          </div>
        )}
        
        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-2 pt-4 border-t border-border">
            <Label>Recent Results</Label>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {testResults.slice(0, 10).map((result) => (
                  <div
                    key={result.id}
                    className="p-3 bg-secondary/20 rounded-lg border border-border space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-xs font-mono font-bold border",
                          methodColors[result.method]
                        )}>
                          {result.method}
                        </span>
                        <code className="text-xs font-mono text-muted-foreground">
                          {result.endpoint}
                        </code>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={result.status >= 200 && result.status < 300 ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {result.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {result.responseTime}ms
                        </span>
                        {result.status >= 200 && result.status < 300 ? (
                          <CheckCircle className="w-4 h-4 text-primary" />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive" />
                        )}
                      </div>
                    </div>
                    <pre className="p-2 bg-background rounded text-xs font-mono overflow-x-auto max-h-[100px]">
                      {JSON.stringify(result.response, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
