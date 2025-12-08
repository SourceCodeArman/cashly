import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { DebtForm } from './DebtForm';

interface DebtModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: any;
}

export function DebtModal({ isOpen, onClose, initialData }: DebtModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Edit Debt' : 'Add New Debt'}</DialogTitle>
                    <DialogDescription>
                        Enter the details of your debt account to start tracking.
                    </DialogDescription>
                </DialogHeader>
                <DebtForm
                    initialData={initialData}
                    onSuccess={onClose}
                    onCancel={onClose}
                />
            </DialogContent>
        </Dialog>
    );
}
