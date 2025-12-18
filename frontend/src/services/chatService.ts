import apiClient from './apiClient'

export const chatService = {
    sendMessage: (message: string, conversation_id: string | null) => {
        return apiClient.post('/chat/send/', { message, conversation_id })
    },

    getMessages: (conversation_id: string) => {
        // Not implemented in backend yet or at least not main path
        return apiClient.get(`/chat/${conversation_id}/messages/`)
    }
}
