'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DTOSchema, DTOField, CRUDEndpoints, MockDataItem, TestResult } from './crud-types'
import { generateMockData } from './crud-types'
import { syncMockDataToServer } from './sync-mock-to-server'

interface CRUDStore {
  schemas: DTOSchema[]
  activeSchemaId: string | null
  endpointConfigs: Record<string, CRUDEndpoints>
  mockData: Record<string, MockDataItem[]>
  testResults: TestResult[]
  
  // Schema actions
  addSchema: (schema: Omit<DTOSchema, 'id' | 'createdAt'>) => string
  updateSchema: (id: string, updates: Partial<DTOSchema>) => void
  deleteSchema: (id: string) => void
  setActiveSchema: (id: string | null) => void
  
  // Field actions
  addField: (schemaId: string, field: Omit<DTOField, 'id'>) => void
  updateField: (schemaId: string, fieldId: string, updates: Partial<DTOField>) => void
  deleteField: (schemaId: string, fieldId: string) => void
  replaceFieldsFromSample: (schemaId: string, fields: Omit<DTOField, 'id'>[]) => void
  
  // Endpoint config actions
  updateEndpointConfig: (schemaId: string, endpoint: keyof CRUDEndpoints, config: Partial<CRUDEndpoints[keyof CRUDEndpoints]>) => void
  
  // Mock data actions
  regenerateMockData: (schemaId: string, count?: number) => void
  addMockItem: (schemaId: string, item: MockDataItem) => void
  updateMockItem: (schemaId: string, itemId: string, updates: Partial<MockDataItem>) => void
  deleteMockItem: (schemaId: string, itemId: string) => void
  
  // Test results
  addTestResult: (result: Omit<TestResult, 'id' | 'timestamp'>) => void
  clearTestResults: () => void
}

const defaultEndpointConfigs: CRUDEndpoints = {
  getAll: { enabled: true, delay: 0, errorRate: 0 },
  getById: { enabled: true, delay: 0, errorRate: 0 },
  create: { enabled: true, delay: 0, errorRate: 0 },
  update: { enabled: true, delay: 0, errorRate: 0 },
  delete: { enabled: true, delay: 0, errorRate: 0 },
}

export const useCRUDStore = create<CRUDStore>()(
  persist(
    (set, get) => ({
      schemas: [],
      activeSchemaId: null,
      endpointConfigs: {},
      mockData: {},
      testResults: [],
      
      addSchema: (schemaData) => {
        const id = crypto.randomUUID()
        const schema: DTOSchema = {
          ...schemaData,
          id,
          createdAt: new Date(),
        }
        
        set((state) => ({
          schemas: [...state.schemas, schema],
          activeSchemaId: id,
          endpointConfigs: {
            ...state.endpointConfigs,
            [id]: { ...defaultEndpointConfigs },
          },
          mockData: {
            ...state.mockData,
            [id]: generateMockData(schema, 5),
          },
        }))

        const items = get().mockData[id] ?? []
        syncMockDataToServer(id, items).catch(() => {})

        return id
      },
      
      updateSchema: (id, updates) => {
        set((state) => ({
          schemas: state.schemas.map((s) => 
            s.id === id ? { ...s, ...updates } : s
          ),
        }))
      },
      
      deleteSchema: (id) => {
        syncMockDataToServer(id, []).catch(() => {})
        set((state) => {
          const { [id]: _, ...restConfigs } = state.endpointConfigs
          const { [id]: __, ...restMockData } = state.mockData
          return {
            schemas: state.schemas.filter((s) => s.id !== id),
            activeSchemaId: state.activeSchemaId === id ? null : state.activeSchemaId,
            endpointConfigs: restConfigs,
            mockData: restMockData,
          }
        })
      },
      
      setActiveSchema: (id) => {
        set({ activeSchemaId: id })
      },
      
      addField: (schemaId, fieldData) => {
        const field: DTOField = {
          ...fieldData,
          id: crypto.randomUUID(),
        }
        
        set((state) => ({
          schemas: state.schemas.map((s) =>
            s.id === schemaId ? { ...s, fields: [...s.fields, field] } : s
          ),
        }))
        
        // Regenerate mock data
        const schema = get().schemas.find((s) => s.id === schemaId)
        if (schema) {
          get().regenerateMockData(schemaId)
        }
      },
      
      updateField: (schemaId, fieldId, updates) => {
        set((state) => ({
          schemas: state.schemas.map((s) =>
            s.id === schemaId
              ? {
                  ...s,
                  fields: s.fields.map((f) =>
                    f.id === fieldId ? { ...f, ...updates } : f
                  ),
                }
              : s
          ),
        }))
      },
      
      deleteField: (schemaId, fieldId) => {
        set((state) => ({
          schemas: state.schemas.map((s) =>
            s.id === schemaId
              ? { ...s, fields: s.fields.filter((f) => f.id !== fieldId) }
              : s
          ),
        }))
      },

      replaceFieldsFromSample: (schemaId, fieldDefs) => {
        set((state) => ({
          schemas: state.schemas.map((s) =>
            s.id === schemaId
              ? {
                  ...s,
                  fields: fieldDefs.map((f) => ({
                    ...f,
                    id: crypto.randomUUID(),
                  })),
                }
              : s
          ),
        }))
        get().regenerateMockData(schemaId)
        const items = get().mockData[schemaId] ?? []
        syncMockDataToServer(schemaId, items).catch(() => {})
      },
      
      updateEndpointConfig: (schemaId, endpoint, config) => {
        set((state) => ({
          endpointConfigs: {
            ...state.endpointConfigs,
            [schemaId]: {
              ...(state.endpointConfigs[schemaId] || defaultEndpointConfigs),
              [endpoint]: {
                ...(state.endpointConfigs[schemaId]?.[endpoint] || defaultEndpointConfigs[endpoint]),
                ...config,
              },
            },
          },
        }))
      },
      
      regenerateMockData: (schemaId, count = 5) => {
        const schema = get().schemas.find((s) => s.id === schemaId)
        if (schema) {
          set((state) => ({
            mockData: {
              ...state.mockData,
              [schemaId]: generateMockData(schema, count),
            },
          }))
          const items = get().mockData[schemaId] ?? []
          syncMockDataToServer(schemaId, items).catch(() => {})
        }
      },
      
      addMockItem: (schemaId, item) => {
        set((state) => ({
          mockData: {
            ...state.mockData,
            [schemaId]: [...(state.mockData[schemaId] || []), item],
          },
        }))
        syncMockDataToServer(schemaId, get().mockData[schemaId] ?? []).catch(() => {})
      },
      
      updateMockItem: (schemaId, itemId, updates) => {
        set((state) => ({
          mockData: {
            ...state.mockData,
            [schemaId]: (state.mockData[schemaId] || []).map((item) =>
              item.id === itemId ? { ...item, ...updates } : item
            ),
          },
        }))
        syncMockDataToServer(schemaId, get().mockData[schemaId] ?? []).catch(() => {})
      },
      
      deleteMockItem: (schemaId, itemId) => {
        set((state) => ({
          mockData: {
            ...state.mockData,
            [schemaId]: (state.mockData[schemaId] || []).filter(
              (item) => item.id !== itemId
            ),
          },
        }))
        syncMockDataToServer(schemaId, get().mockData[schemaId] ?? []).catch(() => {})
      },
      
      addTestResult: (result) => {
        const testResult: TestResult = {
          ...result,
          id: crypto.randomUUID(),
          timestamp: new Date(),
        }
        
        set((state) => ({
          testResults: [testResult, ...state.testResults].slice(0, 50),
        }))
      },
      
      clearTestResults: () => {
        set({ testResults: [] })
      },
    }),
    {
      name: 'crud-builder-storage',
      partialize: (state) => ({
        schemas: state.schemas,
        endpointConfigs: state.endpointConfigs,
        mockData: state.mockData,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error || !state?.mockData) return
        for (const [schemaId, items] of Object.entries(state.mockData)) {
          syncMockDataToServer(schemaId, items).catch(() => {})
        }
      },
    }
  )
)
