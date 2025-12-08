import { useAuthStore } from '@/store/authStore'

type MessageHandler = (data: any) => void

class SocketService {
  private socket: WebSocket | null = null
  private handlers: Set<MessageHandler> = new Set()
  private reconnectTimer: NodeJS.Timeout | null = null
  private isConnecting = false
  private explicitDisconnect = false

  public connect() {
    const token = useAuthStore.getState().accessToken
    if (!token) return

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return
    }

    this.explicitDisconnect = false
    this.isConnecting = true

    // Determine protocol (ws vs wss)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    // Use backend URL from environment or default to localhost:8000
    // If using Vite proxy, we might need to adjust. Assuming direct connection for now or proxy.
    // Ideally, this comes from an env var.
    const host = 'localhost:8000' 
    const wsUrl = `${protocol}//${host}/ws/notifications/?token=${token}`

    console.log('Connecting to WebSocket:', wsUrl)

    this.socket = new WebSocket(wsUrl)

    this.socket.onopen = () => {
      console.log('WebSocket connected')
      this.isConnecting = false
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer)
        this.reconnectTimer = null
      }
    }

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.handlers.forEach(handler => handler(data))
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    this.socket.onclose = (event) => {
      console.log('WebSocket disconnected', event.code, event.reason)
      this.socket = null
      this.isConnecting = false
      
      if (!this.explicitDisconnect) {
        // Try to reconnect in 5 seconds
        this.reconnectTimer = setTimeout(() => {
          this.connect()
        }, 5000)
      }
    }

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  }

  public disconnect() {
    this.explicitDisconnect = true
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  public subscribe(handler: MessageHandler) {
    this.handlers.add(handler)
    return () => {
      this.handlers.delete(handler)
    }
  }
}

export const socketService = new SocketService()
