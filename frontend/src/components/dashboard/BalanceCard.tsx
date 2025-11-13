/**
 * Balance card component
 */
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline'
import Card from '@/components/common/Card'
import { formatCurrency, formatAccountNumber } from '@/utils/formatters'
import { cn } from '@/utils/helpers'

export interface BalanceCardProps {
  totalBalance: number
  accounts?: Array<{
    account_id: string
    institution_name: string
    custom_name?: string | null
    account_type: string
    account_number_masked?: string
    balance: number
  }>
  trend?: 'up' | 'down' | 'neutral'
  trendAmount?: number
}

export default function BalanceCard({
  totalBalance,
  accounts = [],
  trend,
  trendAmount,
}: BalanceCardProps) {
  const topAccounts = [...accounts].sort((a, b) => b.balance - a.balance).slice(0, 3)
  
  return (
    <Card className="bg-gradient-to-br from-primary-500 to-primary-600 text-white">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium opacity-90">Total Balance</h2>
        {trend && trendAmount !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 text-sm',
              trend === 'up' ? 'text-success-200' : 'text-danger-200'
            )}
          >
            {trend === 'up' ? (
              <ArrowUpIcon className="h-4 w-4" />
            ) : (
              <ArrowDownIcon className="h-4 w-4" />
            )}
            {formatCurrency(Math.abs(trendAmount))}
          </div>
        )}
      </div>
      <div className="text-4xl font-bold mb-2">{formatCurrency(totalBalance)}</div>
      {accounts.length > 0 && (
        <div className="mt-4 pt-4 border-t border-primary-400 border-opacity-30">
          <div className="space-y-2">
            {topAccounts.map((account) => {
              const formattedAccountNumber = formatAccountNumber(account.account_number_masked)
              const displayName = account.custom_name || account.institution_name
              return (
                <div key={account.account_id} className="flex justify-between text-sm">
                  <span className="opacity-90 inline-flex items-baseline">
                    {displayName}
                    {formattedAccountNumber && (
                      <span className="inline-block align-baseline font-mono tracking-wider ml-1">
                        {formattedAccountNumber}
                      </span>
                    )}
                  </span>
                  <span className="font-medium">{formatCurrency(account.balance)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Card>
  )
}

