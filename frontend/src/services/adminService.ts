import api from './apiClient'
import type {
    AdminSystemStats,
    AdminUserListItem,
    AdminUserDetail,
    AdminUserUpdate,
    AdminAccount,
    AdminTransaction,
    AdminGoal,
    AdminBudget,
    AdminSystemHealth,
    AdminLogsResponse,
    AdminAPIAnalytics,
    AdminIntegrationStatus,
    AdminDatabaseStats,
    AdminDebugResponse,
    AdminTestEndpoints,
    PaginatedResponse,
} from '@/types'

/**
 * Admin service for system management and user administration.
 * All endpoints require superuser authentication.
 */

export interface UserListParams {
    search?: string
    tier?: string
    is_active?: boolean
    is_superuser?: boolean
    ordering?: string
    page?: number
    page_size?: number
}

export const adminService = {
    /**
     * Get system-wide statistics.
     */
    async getSystemStats(): Promise<AdminSystemStats> {
        const response = await api.get('/admin/stats/')
        return response.data
    },

    /**
     * Get paginated list of users with search and filtering.
     */
    async getUsers(
        page: number = 1,
        pageSize: number = 10,
        search: string = ''
    ): Promise<PaginatedResponse<AdminUserListItem>> {
        const params: UserListParams = {
            page,
            page_size: pageSize,
            search: search || undefined,
        }
        const response = await api.get('/admin/users/', { params })
        return response.data
    },

    /**
     * Get detailed information for a specific user.
     */
    async getUserDetails(userId: string): Promise<AdminUserDetail> {
        const response = await api.get(`/admin/users/${userId}/`)
        return response.data
    },

    /**
     * Update user information (subscription, status, etc.).
     */
    async updateUser(
        userId: string,
        data: AdminUserUpdate
    ): Promise<AdminUserDetail> {
        const response = await api.patch(`/admin/users/${userId}/`, data)
        return response.data
    },

    /**
     * Delete a user account and all related data.
     */
    async deleteUser(userId: string): Promise<void> {
        await api.delete(`/admin/users/${userId}/`)
    },

    /**
     * Get all accounts for a specific user.
     */
    async getUserAccounts(userId: string): Promise<AdminAccount[]> {
        const response = await api.get(`/admin/users/${userId}/accounts/`)
        // Handle paginated response from DRF ListAPIView
        return Array.isArray(response.data) ? response.data : (response.data?.results || [])
    },

    /**
     * Get all transactions for a specific user.
     */
    async getUserTransactions(userId: string): Promise<AdminTransaction[]> {
        const response = await api.get(`/admin/users/${userId}/transactions/`)
        // Handle paginated response from DRF ListAPIView
        return Array.isArray(response.data) ? response.data : (response.data?.results || [])
    },

    /**
     * Get all goals for a specific user.
     */
    async getUserGoals(userId: string): Promise<AdminGoal[]> {
        const response = await api.get(`/admin/users/${userId}/goals/`)
        // Handle paginated response from DRF ListAPIView
        return Array.isArray(response.data) ? response.data : (response.data?.results || [])
    },

    /**
     * Get all budgets for a specific user.
     */
    async getUserBudgets(userId: string): Promise<AdminBudget[]> {
        const response = await api.get(`/admin/users/${userId}/budgets/`)
        // Handle paginated response from DRF ListAPIView
        return Array.isArray(response.data) ? response.data : (response.data?.results || [])
    },

    /**
     * Get system health metrics.
     */
    async getSystemHealth(): Promise<AdminSystemHealth> {
        const response = await api.get('/admin/system-health/')
        return response.data.data
    },

    /**
     * Get system logs with filtering.
     */
    async getLogs(params: {
        type?: 'django' | 'error' | 'security' | 'api'
        level?: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
        limit?: number
        offset?: number
        search?: string
    }): Promise<AdminLogsResponse> {
        const response = await api.get('/admin/logs/', { params })
        return response.data.data
    },

    /**
     * Get API analytics data.
     */
    async getAPIAnalytics(): Promise<AdminAPIAnalytics> {
        const response = await api.get('/admin/api-analytics/')
        return response.data.data
    },

    /**
     * Get integration status (Plaid, Stripe).
     */
    async getIntegrationsStatus(): Promise<AdminIntegrationStatus> {
        const response = await api.get('/admin/integrations/')
        return response.data.data
    },

    /**
     * Get database statistics.
     */
    async getDatabaseStats(): Promise<AdminDatabaseStats> {
        const response = await api.get('/admin/database/')
        return response.data.data
    },

    /**
     * Manually trigger account sync.
     */
    async triggerSync(accountId: string): Promise<AdminDebugResponse> {
        const response = await api.post('/admin/debug/trigger-sync/', { account_id: accountId })
        return response.data.data
    },

    /**
     * Clear Redis cache.
     */
    async clearCache(): Promise<void> {
        await api.post('/admin/debug/clear-cache/')
    },

    /**
     * Test external API endpoints (Plaid, Stripe).
     */
    async testEndpoints(): Promise<AdminTestEndpoints> {
        const response = await api.get('/admin/debug/test-endpoints/')
        return response.data.data
    },
}
