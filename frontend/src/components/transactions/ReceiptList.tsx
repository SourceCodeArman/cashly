import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@/services/transactionService';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileImage, FileText, Trash2, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ReceiptViewer } from './ReceiptViewer';
import type { Receipt } from '@/types/transaction.types';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ReceiptListProps {
    transactionId: string;
}

export function ReceiptList({ transactionId }: ReceiptListProps) {
    const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [receiptToDelete, setReceiptToDelete] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['receipts', transactionId],
        queryFn: () => transactionService.listReceipts(transactionId),
    });

    const receipts = data?.data || [];

    const deleteMutation = useMutation({
        mutationFn: (receiptId: string) => transactionService.deleteReceipt(receiptId),
        onSuccess: () => {
            toast.success('Receipt deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['receipts', transactionId] });
            setDeleteDialogOpen(false);
            setReceiptToDelete(null);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to delete receipt');
        },
    });

    const handleView = (receipt: Receipt) => {
        setSelectedReceipt(receipt);
        setViewerOpen(true);
    };

    const handleDeleteClick = (receiptId: string) => {
        setReceiptToDelete(receiptId);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (receiptToDelete) {
            deleteMutation.mutate(receiptToDelete);
        }
    };

    const getFileIcon = (contentType: string) => {
        if (contentType === 'application/pdf') {
            return <FileText className="h-8 w-8 text-red-500" />;
        }
        return <FileImage className="h-8 w-8 text-blue-500" />;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        );
    }

    if (receipts.length === 0) {
        return (
            <div className="text-center p-8 text-muted-foreground">
                <FileImage className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No receipts uploaded yet</p>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {receipts.map((receipt) => (
                    <Card key={receipt.receipt_id} className="overflow-hidden">
                        <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0">
                                    {getFileIcon(receipt.content_type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{receipt.file_name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {(receipt.file_size / 1024).toFixed(2)} KB
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(receipt.uploaded_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => handleView(receipt)}
                                >
                                    <Eye className="h-3 w-3 mr-1" />
                                    View
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteClick(receipt.receipt_id)}
                                    disabled={deleteMutation.isPending}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <ReceiptViewer
                receipt={selectedReceipt}
                open={viewerOpen}
                onClose={() => setViewerOpen(false)}
            />

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Receipt?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. The receipt file will be permanently deleted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
