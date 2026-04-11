'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DTOSchema, DTOField, CRUDEndpoints, MockDataItem, TestResult } from './crud-types'
import { generateMockData } from './crud-types'
import { syncMockDataToServer } from './sync-mock-to-server'
import type { MockDataEditorMode } from './mock-editor-utils'
import { inferMockEditorMode, asMockTableRows } from './mock-editor-utils'

interface CRUDStore {
  schemas: DTOSchema[]
  activeSchemaId: string | null
  endpointConfigs: Record<string, CRUDEndpoints>
  /** Any JSON-serializable mock payload per schema (array, object, primitive, …). */
  mockData: Record<string, unknown>
  mockDataEditorMode: Record<string, MockDataEditorMode>
  testResults: TestResult[]

  addSchema: (schema: Omit<DTOSchema, 'id' | 'createdAt'>) => string
  updateSchema: (id: string, updates: Partial<DTOSchema>) => void
  deleteSchema: (id: string) => void
  setActiveSchema: (id: string | null) => void

  addField: (schemaId: string, field: Omit<DTOField, 'id'>) => void
  updateField: (schemaId: string, fieldId: string, updates: Partial<DTOField>) => void
  deleteField: (schemaId: string, fieldId: string) => void
  replaceFieldsFromSample: (schemaId: string, fields: Omit<DTOField, 'id'>[]) => void

  updateEndpointConfig: (
    schemaId: string,
    endpoint: keyof CRUDEndpoints,
    config: Partial<CRUDEndpoints[keyof CRUDEndpoints]>
  ) => void

  setMockDataEditorMode: (schemaId: string, mode: MockDataEditorMode) => void
  setMockPayload: (schemaId: string, payload: unknown) => void
  regenerateMockData: (schemaId: string, count?: number) => void
  addMockItem: (schemaId: string, item: MockDataItem) => void
  updateMockItem: (schemaId: string, itemId: string, updates: Partial<MockDataItem>) => void
  deleteMockItem: (schemaId: string, itemId: string) => void

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
      mockDataEditorMode: {},
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
          mockDataEditorMode: {
            ...state.mockDataEditorMode,
            [id]: 'table',
          },
        }))

        const payload = get().mockData[id]
        syncMockDataToServer(id, payload).catch(() => {})

        return id
      },

      updateSchema: (id, updates) => {
        set((state) => ({
          schemas: state.schemas.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        }))
      },

      deleteSchema: (id) => {
        syncMockDataToServer(id, []).catch(() => {})
        set((state) => {
          const { [id]: _, ...restConfigs } = state.endpointConfigs
          const { [id]: __, ...restMockData } = state.mockData
          const { [id]: ___, ...restMode } = state.mockDataEditorMode
          return {
            schemas: state.schemas.filter((s) => s.id !== id),
            activeSchemaId: state.activeSchemaId === id ? null : state.activeSchemaId,
            endpointConfigs: restConfigs,
            mockData: restMockData,
            mockDataEditorMode: restMode,
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
                  fields: s.fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)),
                }
              : s
          ),
        }))
      },

      deleteField: (schemaId, fieldId) => {
        set((state) => ({
          schemas: state.schemas.map((s) =>
            s.id === schemaId ? { ...s, fields: s.fields.filter((f) => f.id !== fieldId) } : s
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
        const mode = get().mockDataEditorMode[schemaId] ?? inferMockEditorMode(get().mockData[schemaId])
        if (mode === 'table') {
          get().regenerateMockData(schemaId)
        }
        const payload = get().mockData[schemaId]
        syncMockDataToServer(schemaId, payload).catch(() => {})
      },

      updateEndpointConfig: (schemaId, endpoint, config) => {
        set((state) => ({
          endpointConfigs: {
            ...state.endpointConfigs,
            [schemaId]: {
              ...(state.endpointConfigs[schemaId] || defaultEndpointConfigs),
              [endpoint]: {
                ...(state.endpointConfigs[schemaId]?.[endpoint] ||
                  defaultEndpointConfigs[endpoint]),
                ...config,
              },
            },
          },
        }))
      },

      setMockDataEditorMode: (schemaId, mode) => {
        set((state) => ({
          mockDataEditorMode: {
            ...state.mockDataEditorMode,
            [schemaId]: mode,
          },
        }))
      },

      setMockPayload: (schemaId, payload) => {
        set((state) => ({
          mockData: {
            ...state.mockData,
            [schemaId]: payload,
          },
        }))
        syncMockDataToServer(schemaId, payload).catch(() => {})
      },

      regenerateMockData: (schemaId, count = 5) => {
        const mode =
          get().mockDataEditorMode[schemaId] ?? inferMockEditorMode(get().mockData[schemaId])
        if (mode === 'json') return

        const schema = get().schemas.find((s) => s.id === schemaId)
        if (schema) {
          const next = generateMockData(schema, count)
          set((state) => ({
            mockData: {
              ...state.mockData,
              [schemaId]: next,
            },
            mockDataEditorMode: {
              ...state.mockDataEditorMode,
              [schemaId]: 'table',
            },
          }))
          syncMockDataToServer(schemaId, next).catch(() => {})
        }
      },

      addMockItem: (schemaId, item) => {
        const rows = asMockTableRows(get().mockData[schemaId])
        const next = [...rows, item]
        set((state) => ({
          mockData: {
            ...state.mockData,
            [schemaId]: next,
          },
        }))
        syncMockDataToServer(schemaId, next).catch(() => {})
      },

      updateMockItem: (schemaId, itemId, updates) => {
        const rows = asMockTableRows(get().mockData[schemaId])
        const next = rows.map((row) => (row.id === itemId ? { ...row, ...updates } : row))
        set((state) => ({
          mockData: {
            ...state.mockData,
            [schemaId]: next,
          },
        }))
        syncMockDataToServer(schemaId, next).catch(() => {})
      },

      deleteMockItem: (schemaId, itemId) => {
        const rows = asMockTableRows(get().mockData[schemaId])
        const next = rows.filter((row) => row.id !== itemId)
        set((state) => ({
          mockData: {
            ...state.mockData,
            [schemaId]: next,
          },
        }))
        syncMockDataToServer(schemaId, next).catch(() => {})
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
      version: 2,
      migrate: (persistedState, fromVersion) => {
        const s = persistedState as {
          schemas?: DTOSchema[]
          endpointConfigs?: Record<string, CRUDEndpoints>
          mockData?: Record<string, unknown>
          mockDataEditorMode?: Record<string, MockDataEditorMode>
        }
        if (fromVersion < 2) {
          const mockData = s.mockData ?? {}
          const modes: Record<string, MockDataEditorMode> = { ...(s.mockDataEditorMode ?? {}) }
          for (const id of Object.keys(mockData)) {
            if (!(id in modes)) modes[id] = inferMockEditorMode(mockData[id])
          }
          return { ...s, mockData: mockData, mockDataEditorMode: modes }
        }
        return persistedState
      },
      partialize: (state) => ({
        schemas: state.schemas,
        endpointConfigs: state.endpointConfigs,
        mockData: state.mockData,
        mockDataEditorMode: state.mockDataEditorMode,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error || !state?.mockData) return
        for (const [schemaId, payload] of Object.entries(state.mockData)) {
          syncMockDataToServer(schemaId, payload).catch(() => {})
        }
      },
    }
  )
)
