import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { DebtAccount } from '@/types/debt.types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ExternalLink, Calendar, TrendingUp } from 'lucide-react';

interface DebtCardProps {
    debt: DebtAccount;
    onViewDetails: (id: string) => void;
    onRecordPayment: (id: string, name: string) => void;
}

export function DebtCard({ debt, onViewDetails, onRecordPayment }: DebtCardProps) {
    // Calculate progress percentage (inverse because we want % paid off)
    const original = Number(debt.original_balance);
    const current = Number(debt.current_balance);
    const progress = original > 0
        ? Math.min(100, Math.max(0, ((original - current) / original) * 100))
        : 0;

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                        {debt.name}
                        {debt.status === 'paid_off' && (
                            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">
                                Paid Off
                            </Badge>
                        )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground capitalize">
                        {debt.debt_type.replace('_', ' ')}
                        {debt.creditor_name && ` • ${debt.creditor_name}`}
                    </p>
                </div>
                <div className="flex bg-secondary/50 px-2 py-1 rounded text-xs font-medium">
                    {Number(debt.interest_rate).toFixed(2)}% APR
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-muted-foreground">Balance</span>
                            <span className="font-bold">{formatCurrency(Number(debt.current_balance))}</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>{progress.toFixed(0)}% Paid Off</span>
                            <span>Orig: {formatCurrency(original)}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="bg-secondary/20 p-2 rounded border border-border/50">
                            <div className="flex items-center text-xs text-muted-foreground mb-1">
                                <Calendar className="h-3 w-3 mr-1" />
                                Next Due
                            </div>
                            <div className="font-medium text-sm">
                                {debt.next_due_date ? formatDate(debt.next_due_date) : 'N/A'}
                            </div>
                            {debt.days_until_due >= 0 && (
                                <div className={`text-xs mt-0.5 ${debt.days_until_due <= 3 ? 'text-amber-500 font-bold' : ''}`}>
                                    in {debt.days_until_due} days
                                </div>
                            )}
                        </div>
                        <div className="bg-secondary/20 p-2 rounded border border-border/50">
                            <div className="flex items-center text-xs text-muted-foreground mb-1">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Min Payment
                            </div>
                            <div className="font-medium text-sm">
                                {formatCurrency(Number(debt.minimum_payment))}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                                +{formatCurrency(Number(debt.monthly_interest))} int
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Button
                            variant="outline"
                            className="flex-1"
                            size="sm"
                            onClick={() => onViewDetails(debt.debt_id)}
                        >
                            Details
                        </Button>
                        <Button
                            className="flex-1"
                            size="sm"
                            onClick={() => onRecordPayment(debt.debt_id, debt.name)}
                            disabled={debt.status !== 'active'}
                        >
                            Pay
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
