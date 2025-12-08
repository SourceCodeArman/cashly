import React from 'react';
import { DebtCard } from './DebtCard';
import type { DebtAccount } from '@/types/debt.types';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface DebtListProps {
    debts: DebtAccount[];
    isLoading: boolean;
    onAddDebt: () => void;
    onViewDetails: (id: string) => void;
    onRecordPayment: (id: string, name: string) => void;
}

export function DebtList({
    debts,
    isLoading,
    onAddDebt,
    onViewDetails,
    onRecordPayment
}: DebtListProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-4 border rounded-lg p-4">
                        <Skeleton className="h-6 w-1/2" />
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-32 w-full mt-4" />
                    </div>
                ))}
            </div>
        );
    }

    if (debts.length === 0) {
        return (
            <div className="text-center py-12 border-2 border-dashed rounded-lg bg-secondary/10">
                <h3 className="text-lg font-medium mb-2">No debts found</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                    Add your first debt account to start tracking your payoff journey and saving on interest.
                </p>
                <Button onClick={onAddDebt}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Debt
                </Button>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {debts.map((debt) => (
                <DebtCard
                    key={debt.debt_id}
                    debt={debt}
                    onViewDetails={onViewDetails}
                    onRecordPayment={onRecordPayment}
                />
            ))}

            {/* Add New Card - visible if there are debts */}
            <button
                onClick={onAddDebt}
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl hover:bg-secondary/50 transition-colors h-full min-h-[300px]"
            >
                <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center mb-4">
                    <Plus className="h-6 w-6 text-foreground" />
                </div>
                <span className="font-medium text-lg">Add Account</span>
                <span className="text-sm text-muted-foreground mt-1">Track another liability</span>
            </button>
        </div>
    );
}
