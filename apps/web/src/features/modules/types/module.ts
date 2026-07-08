import type { PromptModuleTypeId } from '@/features/helps/domain/promptModules'

export interface Module {
  id: string
  name: string
  description?: string
  sortOrder: number
  promptModuleTypeId: PromptModuleTypeId
  userId: string
  createdAt: string
  updatedAt: string
}

export interface ModuleCreateInput {
  name: string
  description?: string
  sortOrder?: number
  promptModuleTypeId?: PromptModuleTypeId
}

export interface ModuleUpdateInput {
  name?: string
  description?: string
  sortOrder?: number
  promptModuleTypeId?: PromptModuleTypeId
}
