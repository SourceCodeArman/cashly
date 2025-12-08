import { useState } from 'react';
import { DebtSummaryCard } from '@/components/debts/DebtSummaryCard';
import { DebtList } from '@/components/debts/DebtList';
import { DebtModal } from '@/components/debts/DebtModal';
import { PaymentModal } from '@/components/debts/PaymentModal';
import { DebtProjectionChart } from '@/components/debts/DebtProjectionChart';
import { useDebts, useDebt } from '@/hooks/useDebts';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function DebtsPage() {
    const { data: debts, isLoading } = useDebts();

    // State for modals
    const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
    const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentDebtId, setPaymentDebtId] = useState<string | null>(null);
    const [paymentDebtName, setPaymentDebtName] = useState('');

    // State for detail sheet
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // Handlers
    const handleAddDebt = () => {
        setSelectedDebtId(null);
        setIsDebtModalOpen(true);
    };

    const handleRecordPayment = (id: string, name: string) => {
        setPaymentDebtId(id);
        setPaymentDebtName(name);
        setIsPaymentModalOpen(true);
    };

    const handleViewDetails = (id: string) => {
        setSelectedDebtId(id);
        setIsDetailOpen(true);
    };

    return (
        <div className="container mx-auto py-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Debt Management</h1>
                    <p className="text-muted-foreground mt-1">
                        Track your liabilities and optimize your payoff strategy.
                    </p>
                </div>
                <Button onClick={handleAddDebt}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Debt
                </Button>
            </div>

            <DebtSummaryCard />

            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Your Accounts</h2>
                <DebtList
                    debts={debts?.data || []}
                    isLoading={isLoading}
                    onAddDebt={handleAddDebt}
                    onViewDetails={handleViewDetails}
                    onRecordPayment={handleRecordPayment}
                />
            </div>

            {/* Modals */}
            <DebtModal
                isOpen={isDebtModalOpen}
                onClose={() => setIsDebtModalOpen(false)}
                initialData={selectedDebtId ? debts?.data.find(d => d.debt_id === selectedDebtId) : undefined}
            />

            {paymentDebtId && (
                <PaymentModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    debtId={paymentDebtId}
                    debtName={paymentDebtName}
                />
            )}

            {/* Detail Sheet */}
            <DebtDetailSheet
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                debtId={selectedDebtId}
                onEdit={(id) => {
                    setIsDetailOpen(false);
                    setSelectedDebtId(id);
                    setIsDebtModalOpen(true);
                }}
            />
        </div>
    );
}

// Subcomponent for Details Sheet
function DebtDetailSheet({ isOpen, onClose, debtId, onEdit }: {
    isOpen: boolean;
    onClose: () => void;
    debtId: string | null;
    onEdit: (id: string) => void;
}) {
    const { data: debt, isLoading } = useDebt(debtId || '');

    if (!debtId) return null;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                    <SheetTitle>Debt Details</SheetTitle>
                    <SheetDescription>
                        Detailed information about this account.
                    </SheetDescription>
                </SheetHeader>

                {isLoading || !debt ? (
                    <div className="py-8">Loading details...</div>
                ) : (
                    <ScrollArea className="h-[calc(100vh-120px)] mt-6 pr-4">
                        <div className="space-y-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-bold">{debt.data.name}</h3>
                                    <p className="text-sm text-muted-foreground capitalize">
                                        {debt.data.debt_type.replace('_', ' ')}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <h3 className="text-2xl font-bold">{formatCurrency(Number(debt.data.current_balance))}</h3>
                                    <p className="text-sm text-muted-foreground">Current Balance</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 py-4">
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground uppercase">Interest Rate</span>
                                    <p className="font-medium">{debt.data.interest_rate}% APR</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground uppercase">Monthly Interest</span>
                                    <p className="font-medium text-amber-600">~{formatCurrency(Number(debt.data.monthly_interest))}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground uppercase">Minimum Payment</span>
                                    <p className="font-medium">{formatCurrency(Number(debt.data.minimum_payment))}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground uppercase">Due Date</span>
                                    <p className="font-medium">
                                        {debt.data.next_due_date ? formatDate(debt.data.next_due_date) : 'N/A'}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-2">
                                <DebtProjectionChart debtId={debtId} monthlyPayment={Number(debt.data.minimum_payment) * 1.1} />
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <h4 className="font-medium">Account Info</h4>
                                <div className="grid grid-cols-2 gap-y-2 text-sm">
                                    <span className="text-muted-foreground">Original Balance:</span>
                                    <span>{formatCurrency(Number(debt.data.original_balance))}</span>

                                    <span className="text-muted-foreground">Creditor:</span>
                                    <span>{debt.data.creditor_name || '-'}</span>

                                    <span className="text-muted-foreground">Opened Date:</span>
                                    <span>{debt.data.opened_date ? formatDate(debt.data.opened_date) : '-'}</span>

                                    <span className="text-muted-foreground">Status:</span>
                                    <span className="capitalize">{debt.data.status.replace('_', ' ')}</span>
                                </div>
                            </div>

                            <div className="pt-4">
                                <Button variant="outline" className="w-full" onClick={() => onEdit(debtId)}>
                                    Edit Account Details
                                </Button>
                            </div>
                        </div>
                    </ScrollArea>
                )}
            </SheetContent>
        </Sheet>
    );
}
