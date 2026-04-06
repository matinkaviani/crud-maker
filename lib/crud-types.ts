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
  queryParams?: QueryParamDoc[]
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

export interface QueryParamDoc {
  name: string
  type: string
  description: string
  example: string
}

export function generateEndpoints(schema: DTOSchema): GeneratedEndpoint[] {
  /** Live HTTP routes (Next.js Route Handlers); logical basePath stays on the schema for documentation */
  const apiBase = `/api/crud/${schema.id}`

  // Generate query param documentation based on schema fields
  const queryParams: QueryParamDoc[] = [
    { name: 'page', type: 'number', description: 'Page number for pagination', example: '1' },
    { name: 'limit', type: 'number', description: 'Items per page (max 100)', example: '10' },
    { name: 'search', type: 'string', description: 'Search across all string fields', example: 'term' },
    { name: 'sortBy', type: 'string', description: 'Field to sort by', example: schema.fields[0]?.name || 'id' },
    { name: 'sortOrder', type: 'string', description: 'Sort direction (asc/desc)', example: 'asc' },
    ...schema.fields.map((field) => ({
      name: field.name,
      type: field.type,
      description: `Filter by ${field.name} (exact match, comma-separated for OR)`,
      example: String(generateMockValue(field.type, field.name)),
    })),
    ...schema.fields
      .filter((f) => f.type === 'number' || f.type === 'date')
      .flatMap((field) => [
        {
          name: `${field.name}_gte`,
          type: field.type,
          description: `${field.name} greater than or equal to`,
          example: field.type === 'date' ? '2024-01-01' : '0',
        },
        {
          name: `${field.name}_lte`,
          type: field.type,
          description: `${field.name} less than or equal to`,
          example: field.type === 'date' ? '2024-12-31' : '1000',
        },
      ]),
  ]

  return [
    {
      method: 'GET',
      path: apiBase,
      description: `Get all ${schema.name} items with filtering, sorting, and pagination`,
      configKey: 'getAll',
      responseExample: { data: [], total: 0, page: 1, limit: 10, totalPages: 0 },
      queryParams,
    },
    {
      method: 'GET',
      path: `${apiBase}/:id`,
      description: `Get a single ${schema.name} by ID`,
      configKey: 'getById',
      responseExample: { data: null },
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
