import type { InjectionKey } from 'vue'

export interface LayoutActions {
  openMainForm: () => void
  openSubForm: () => void
}

export const layoutActionsKey: InjectionKey<LayoutActions | null> = Symbol('layout-actions')
