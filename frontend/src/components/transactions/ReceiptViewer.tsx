import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import type { Receipt } from '@/types/transaction.types';

interface ReceiptViewerProps {
    receipt: Receipt | null;
    open: boolean;
    onClose: () => void;
}

export function ReceiptViewer({ receipt, open, onClose }: ReceiptViewerProps) {
    if (!receipt) return null;

    const isPDF = receipt.content_type === 'application/pdf';
    const isImage = receipt.content_type.startsWith('image/');

    const handleDownload = () => {
        window.open(receipt.file_url, '_blank');
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh]">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle>{receipt.file_name}</DialogTitle>
                            <DialogDescription>
                                Uploaded {new Date(receipt.uploaded_at).toLocaleDateString()}
                            </DialogDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="icon" onClick={handleDownload}>
                                <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={onClose}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                <div className="mt-4 overflow-auto max-h-[70vh]">
                    {isImage && (
                        <img
                            src={receipt.file_url}
                            alt={receipt.file_name}
                            className="w-full h-auto rounded-lg"
                        />
                    )}
                    {isPDF && (
                        <iframe
                            src={receipt.file_url}
                            className="w-full h-[70vh] rounded-lg"
                            title={receipt.file_name}
                        />
                    )}
                    {!isImage && !isPDF && (
                        <div className="text-center p-8 text-muted-foreground">
                            <p>Preview not available for this file type.</p>
                            <Button onClick={handleDownload} className="mt-4">
                                <Download className="h-4 w-4 mr-2" />
                                Download File
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
