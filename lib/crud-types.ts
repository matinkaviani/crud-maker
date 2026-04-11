export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'email' | 'uuid' | 'array' | 'object'

export interface DTOField {
  id: string
  name: string
  type: FieldType
  required: boolean
  defaultValue?: string
  description?: string
}

export interface DTOSchema {
  id: string
  name: string
  basePath: string
  fields: DTOField[]
  createdAt: Date
}

export interface EndpointConfig {
  enabled: boolean
  delay: number // ms
  errorRate: number // 0-100
  customResponse?: string
}

export interface CRUDEndpoints {
  getAll: EndpointConfig
  getById: EndpointConfig
  create: EndpointConfig
  update: EndpointConfig
  delete: EndpointConfig
}

export interface GeneratedEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  description: string
  configKey: keyof CRUDEndpoints
  requestBody?: object
  responseExample: object
}

export interface MockDataItem {
  id: string
  [key: string]: unknown
}

export interface TestResult {
  id: string
  endpoint: string
  method: string
  status: number
  responseTime: number
  response: unknown
  timestamp: Date
}

export const defaultEndpointConfig: EndpointConfig = {
  enabled: true,
  delay: 0,
  errorRate: 0,
}

export const defaultCRUDEndpoints: CRUDEndpoints = {
  getAll: { ...defaultEndpointConfig },
  getById: { ...defaultEndpointConfig },
  create: { ...defaultEndpointConfig },
  update: { ...defaultEndpointConfig },
  delete: { ...defaultEndpointConfig },
}

export function generateMockValue(type: FieldType, fieldName: string): unknown {
  switch (type) {
    case 'string':
      return `Sample ${fieldName}`
    case 'number':
      return Math.floor(Math.random() * 1000)
    case 'boolean':
      return Math.random() > 0.5
    case 'date':
      return new Date().toISOString()
    case 'email':
      return `${fieldName.toLowerCase()}@example.com`
    case 'uuid':
      return crypto.randomUUID()
    case 'array':
      return []
    case 'object':
      return {}
    default:
      return null
  }
}

export function generateMockData(schema: DTOSchema, count: number = 5): MockDataItem[] {
  return Array.from({ length: count }, (_, index) => {
    const item: MockDataItem = {
      id: crypto.randomUUID(),
    }
    
    schema.fields.forEach(field => {
      if (field.defaultValue) {
        item[field.name] = field.defaultValue
      } else {
        item[field.name] = generateMockValue(field.type, field.name)
      }
    })
    
    return item
  })
}

export function generateEndpoints(schema: DTOSchema): GeneratedEndpoint[] {
  /** Live HTTP routes (Next.js Route Handlers); logical basePath stays on the schema for documentation */
  const apiBase = `/api/crud/${schema.id}`

  return [
    {
      method: 'GET',
      path: apiBase,
      description: `Get stored mock JSON for ${schema.name} at ${apiBase} — \`data\` may be an array, a single object, a primitive, etc.`,
      configKey: 'getAll',
      responseExample: {
        data: [] as unknown,
        total: 0,
        page: 1,
        limit: 10,
      },
    },
    {
      method: 'GET',
      path: `${apiBase}/:id`,
      description: `Get one record by id when mock data is an id-keyed list or a single object with that id`,
      configKey: 'getById',
      responseExample: { data: null as unknown },
    },
    {
      method: 'POST',
      path: apiBase,
      description: `Create a new ${schema.name}`,
      configKey: 'create',
      requestBody: schema.fields.reduce((acc, field) => {
        acc[field.name] = generateMockValue(field.type, field.name)
        return acc
      }, {} as Record<string, unknown>),
      responseExample: { data: null, message: 'Created successfully' },
    },
    {
      method: 'PUT',
      path: `${apiBase}/:id`,
      description: `Update an existing ${schema.name}`,
      configKey: 'update',
      requestBody: schema.fields.reduce((acc, field) => {
        acc[field.name] = generateMockValue(field.type, field.name)
        return acc
      }, {} as Record<string, unknown>),
      responseExample: { data: null, message: 'Updated successfully' },
    },
    {
      method: 'DELETE',
      path: `${apiBase}/:id`,
      description: `Delete a ${schema.name}`,
      configKey: 'delete',
      responseExample: { message: 'Deleted successfully' },
    },
  ]
}
