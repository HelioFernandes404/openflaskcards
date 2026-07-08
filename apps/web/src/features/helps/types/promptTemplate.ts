export interface PromptTemplate {
  id: string
  userId: string
  name: string
  body: string
  createdAt: string
  updatedAt: string
}

export interface PromptTemplateCreateInput {
  name: string
  body: string
}

export interface PromptTemplateUpdateInput {
  name?: string
  body?: string
}

export const BUILTIN_TEMPLATE_ID = '__builtin__'
