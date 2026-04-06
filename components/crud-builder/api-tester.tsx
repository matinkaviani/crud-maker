'use client'

import { useState } from 'react'
import { Play, Clock, CheckCircle, XCircle, Trash2, Filter, Plus, X } from 'lucide-react'
import { useCRUDStore } from '@/lib/crud-store'
import { type GeneratedEndpoint, type MockDataItem, type QueryParamDoc } from '@/lib/crud-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface QueryParam {
  id: string
  key: string
  value: string
}

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
  const { schemas, mockData, endpointConfigs, addTestResult, testResults, clearTestResults, addMockItem, updateMockItem, deleteMockItem } = useCRUDStore()
  const schema = schemas.find((s) => s.id === schemaId)
  const config = endpointConfigs[schemaId]
  
  const [pathParams, setPathParams] = useState<Record<string, string>>({})
  const [queryParams, setQueryParams] = useState<QueryParam[]>([])
  const [requestBody, setRequestBody] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const addQueryParam = () => {
    setQueryParams([...queryParams, { id: crypto.randomUUID(), key: '', value: '' }])
  }
  
  const updateQueryParam = (id: string, field: 'key' | 'value', newValue: string) => {
    setQueryParams(queryParams.map((p) => 
      p.id === id ? { ...p, [field]: newValue } : p
    ))
  }
  
  const removeQueryParam = (id: string) => {
    setQueryParams(queryParams.filter((p) => p.id !== id))
  }
  
  const addPresetParam = (param: QueryParamDoc) => {
    setQueryParams([
      ...queryParams,
      { id: crypto.randomUUID(), key: param.name, value: param.example },
    ])
  }
  
  const buildQueryString = () => {
    const validParams = queryParams.filter((p) => p.key && p.value)
    if (validParams.length === 0) return ''
    const searchParams = new URLSearchParams()
    validParams.forEach((p) => searchParams.append(p.key, p.value))
    return `?${searchParams.toString()}`
  }
  
  if (!schema) return null
  
  const data = mockData[schemaId] || []
  
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
    
    // Add query parameters for GET requests
    if (selectedEndpoint.method === 'GET') {
      path += buildQueryString()
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

      if (res.ok) {
        const key = selectedEndpoint.configKey
        if (key === 'create' && response && typeof response === 'object' && 'data' in response) {
          addMockItem(schemaId, (response as { data: MockDataItem }).data)
        } else if (key === 'update' && response && typeof response === 'object' && 'data' in response) {
          const d = (response as { data: MockDataItem }).data
          updateMockItem(schemaId, d.id, d)
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
              Sends real HTTP requests to this app&apos;s Route Handlers. Mock data from the builder is
              synced to the server when you load the app or change mock rows, so GET matches the Mock Data
              tab.
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
                  {data.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPathParams({ ...pathParams, id: data[0].id })}
                    >
                      Use First
                    </Button>
                  )}
                </div>
              </div>
            )}
            
            {/* Query Parameters for GET requests */}
            {selectedEndpoint.method === 'GET' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Query Parameters
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addQueryParam}
                    className="gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </Button>
                </div>
                
                {/* Quick add from available params */}
                {selectedEndpoint.queryParams && selectedEndpoint.queryParams.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedEndpoint.queryParams.slice(0, 8).map((param) => (
                      <Button
                        key={param.name}
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => addPresetParam(param)}
                      >
                        {param.name}
                      </Button>
                    ))}
                    {selectedEndpoint.queryParams.length > 8 && (
                      <span className="text-xs text-muted-foreground self-center ml-1">
                        +{selectedEndpoint.queryParams.length - 8} more
                      </span>
                    )}
                  </div>
                )}
                
                {/* Query param inputs */}
                {queryParams.length > 0 && (
                  <div className="space-y-2">
                    {queryParams.map((param) => (
                      <div key={param.id} className="flex items-center gap-2">
                        <Select
                          value={param.key}
                          onValueChange={(value) => updateQueryParam(param.id, 'key', value)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Select param" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedEndpoint.queryParams?.map((qp) => (
                              <SelectItem key={qp.name} value={qp.name}>
                                {qp.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-muted-foreground">=</span>
                        <Input
                          value={param.value}
                          onChange={(e) => updateQueryParam(param.id, 'value', e.target.value)}
                          placeholder="Value"
                          className="flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeQueryParam(param.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Preview query string */}
                {queryParams.some((p) => p.key && p.value) && (
                  <div className="p-2 bg-secondary/30 rounded-md">
                    <code className="text-xs text-muted-foreground break-all">
                      {selectedEndpoint.path}{buildQueryString()}
                    </code>
                  </div>
                )}
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
