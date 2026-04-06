'use client'

import { useState } from 'react'
import { Copy, Check, Settings2, Play, ChevronDown, ChevronUp } from 'lucide-react'
import { useCRUDStore } from '@/lib/crud-store'
import { generateEndpoints, type GeneratedEndpoint, type CRUDEndpoints } from '@/lib/crud-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

const methodColors: Record<string, string> = {
  GET: 'bg-method-get/10 text-method-get border-method-get/30',
  POST: 'bg-method-post/10 text-method-post border-method-post/30',
  PUT: 'bg-method-put/10 text-method-put border-method-put/30',
  DELETE: 'bg-method-delete/10 text-method-delete border-method-delete/30',
}

interface EndpointsPanelProps {
  schemaId: string
  onTest: (endpoint: GeneratedEndpoint) => void
}

export function EndpointsPanel({ schemaId, onTest }: EndpointsPanelProps) {
  const { schemas, endpointConfigs, updateEndpointConfig } = useCRUDStore()
  const schema = schemas.find((s) => s.id === schemaId)
  
  if (!schema) return null
  
  const endpoints = generateEndpoints(schema)
  const config = endpointConfigs[schemaId]
  
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Generated Endpoints</CardTitle>
        <CardDescription>
          Auto-generated CRUD endpoints based on your DTO schema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {endpoints.map((endpoint) => (
          <EndpointItem
            key={`${endpoint.method}-${endpoint.path}`}
            endpoint={endpoint}
            config={config?.[endpoint.configKey]}
            onConfigChange={(updates) => 
              updateEndpointConfig(schemaId, endpoint.configKey, updates)
            }
            onTest={() => onTest(endpoint)}
          />
        ))}
      </CardContent>
    </Card>
  )
}

interface EndpointItemProps {
  endpoint: GeneratedEndpoint
  config?: CRUDEndpoints[keyof CRUDEndpoints]
  onConfigChange: (updates: Partial<CRUDEndpoints[keyof CRUDEndpoints]>) => void
  onTest: () => void
}

function EndpointItem({ endpoint, config, onConfigChange, onTest }: EndpointItemProps) {
  const [copied, setCopied] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  
  const copyPath = () => {
    navigator.clipboard.writeText(endpoint.path)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const isEnabled = config?.enabled ?? true
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn(
        "rounded-lg border transition-all",
        isEnabled ? "border-border bg-secondary/20" : "border-border/50 bg-muted/30 opacity-60"
      )}>
        <div className="flex items-center gap-3 p-3">
          <span className={cn(
            "px-2 py-1 rounded text-xs font-mono font-bold border",
            methodColors[endpoint.method]
          )}>
            {endpoint.method}
          </span>
          
          <code className="flex-1 text-sm font-mono text-foreground truncate">
            {endpoint.path}
          </code>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={copyPath}
              className="text-muted-foreground hover:text-foreground"
            >
              {copied ? (
                <Check className="w-4 h-4 text-primary" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onTest}
              disabled={!isEnabled}
              className="text-muted-foreground hover:text-primary"
            >
              <Play className="w-4 h-4" />
            </Button>
            
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-foreground"
              >
                {isOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>
        
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-1 space-y-4 border-t border-border/50">
            <p className="text-sm text-muted-foreground">{endpoint.description}</p>
            
            {/* Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">Enabled</Label>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(checked) => onConfigChange({ enabled: checked })}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Delay (ms)</Label>
                  <span className="text-xs text-muted-foreground">{config?.delay ?? 0}ms</span>
                </div>
                <Slider
                  value={[config?.delay ?? 0]}
                  max={5000}
                  step={100}
                  onValueChange={([value]) => onConfigChange({ delay: value })}
                  disabled={!isEnabled}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Error Rate</Label>
                  <span className="text-xs text-muted-foreground">{config?.errorRate ?? 0}%</span>
                </div>
                <Slider
                  value={[config?.errorRate ?? 0]}
                  max={100}
                  step={5}
                  onValueChange={([value]) => onConfigChange({ errorRate: value })}
                  disabled={!isEnabled}
                />
              </div>
            </div>
            
            {/* Response Example */}
            {endpoint.requestBody && (
              <div className="space-y-2">
                <Label className="text-xs">Request Body</Label>
                <pre className="p-3 bg-background rounded-md border border-border text-xs font-mono overflow-x-auto">
                  {JSON.stringify(endpoint.requestBody, null, 2)}
                </pre>
              </div>
            )}
            
            <div className="space-y-2">
              <Label className="text-xs">Response Example</Label>
              <pre className="p-3 bg-background rounded-md border border-border text-xs font-mono overflow-x-auto">
                {JSON.stringify(endpoint.responseExample, null, 2)}
              </pre>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
