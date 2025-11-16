/**
 * Notification types
 */
export type NotificationType = 
  | 'transaction' 
  | 'goal' 
  | 'budget' 
  | 'account' 
  | 'system'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  data?: Record<string, any>
  is_read: boolean
  created_at: string
  read_at?: string | null
  formatted_created_at?: string
  formatted_read_at?: string
}

export interface NotificationFilters {
  is_read?: boolean
  type?: NotificationType
  page?: number
  page_size?: number
}

export interface NotificationListResponse {
  status: 'success' | 'error'
  data: {
    count: number
    next: string | null
    previous: string | null
    results: Notification[]
  }
  message: string
}

export interface UnreadCountResponse {
  status: 'success' | 'error'
  data: {
    count: number
  }
  message: string
}

export interface MarkReadResponse {
  status: 'success' | 'error'
  data: Notification
  message: string
}

export interface MarkAllReadResponse {
  status: 'success' | 'error'
  data: {
    updated_count: number
  }
  message: string
}

