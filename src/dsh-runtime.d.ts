/**
 * The subset of the DSH client surface this plugin uses, matching the shapes
 * published by `@deepseek-ai/dsh-client-ui-chat@0.2.2-rc.1`:
 *
 *   user       -> content: [{ type: 'text', text }]
 *   assistant  -> blocks:  [{ kind: 'text', text }]
 *   tool-call  -> data.root: { name, argsRaw, content }  (content on results)
 */

export interface TextPiece {
  type?: string
  text?: string
}

export interface ToolNode {
  kind?: string
  name?: string
  argsRaw?: string
  content?: ReadonlyArray<TextPiece>
}

export interface ChatNode {
  kind?: string
  time?: number
  turn?: number
  content?: ReadonlyArray<TextPiece>
  blocks?: ReadonlyArray<{ kind?: string; text?: string }>
  data?: { root?: ToolNode }
}

export interface SlotProps {
  sessionId: string
  useChat<T>(selector: (snapshot: { legacy?: { nodes?: ChatNode[] } }) => T): T
}

export type Translate = (key: string, params?: Record<string, string | number>) => string

export interface LocaleService {
  register(namespace: string, dictionaries: Record<string, Record<string, string>>): () => void
  bind(namespace: string): Translate
}

export interface ClientContext {
  get(name: 'locale'): LocaleService | undefined
  get(name: string): unknown
  effect(callback: () => (() => void) | void, label?: string): () => void
  slots: {
    inject(key: string, callback: () => () => void): () => void
    register(options: { name: string; id: string; order?: number; label?: string | (() => string) }, component: (props: SlotProps) => unknown): () => void
  }
}

declare global {
  interface Window {
    __ModuleLoader__: { load(registration: { id: string; factory: (require: (id: string) => unknown) => unknown }): unknown }
  }
  interface Navigator {
    clipboard?: { writeText(text: string): Promise<void> }
  }
}
