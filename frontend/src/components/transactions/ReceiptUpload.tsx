import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@/services/transactionService';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Loader2, File as FileIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ReceiptUploadProps {
    transactionId: string;
    onSuccess?: () => void;
}

export function ReceiptUpload({ transactionId, onSuccess }: ReceiptUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const queryClient = useQueryClient();

    const uploadMutation = useMutation({
        mutationFn: (file: File) => transactionService.uploadReceipt(transactionId, file),
        onSuccess: () => {
            toast.success('Receipt uploaded successfully');
            queryClient.invalidateQueries({ queryKey: ['receipts', transactionId] });
            setSelectedFile(null);
            onSuccess?.();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to upload receipt');
        },
    });

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            const file = acceptedFiles[0];

            // Validate file size (10MB)
            if (file.size > 10 * 1024 * 1024) {
                toast.error('File size must be less than 10MB');
                return;
            }

            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
            if (!allowedTypes.includes(file.type)) {
                toast.error('Only images (JPEG, PNG, GIF) and PDF files are allowed');
                return;
            }

            setSelectedFile(file);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
            'application/pdf': ['.pdf'],
        },
        maxFiles: 1,
        multiple: false,
    });

    const handleUpload = async () => {
        if (!selectedFile) return;

        setUploading(true);
        try {
            await uploadMutation.mutateAsync(selectedFile);
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = () => {
        setSelectedFile(null);
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardContent className="pt-6">
                    <div
                        {...getRootProps()}
                        className={cn(
                            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                            isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
                            selectedFile && 'border-solid border-primary'
                        )}
                    >
                        <input {...getInputProps()} />
                        {!selectedFile ? (
                            <div className="space-y-2">
                                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-medium">
                                        {isDragActive ? 'Drop the file here' : 'Drag & drop a receipt here'}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        or click to browse (images or PDF, max 10MB)
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FileIcon className="h-8 w-8 text-primary" />
                                    <div className="text-left">
                                        <p className="text-sm font-medium">{selectedFile.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {(selectedFile.size / 1024).toFixed(2)} KB
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemove();
                                    }}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {selectedFile && (
                <div className="flex gap-2">
                    <Button onClick={handleUpload} disabled={uploading}>
                        {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Upload Receipt
                    </Button>
                    <Button variant="outline" onClick={handleRemove} disabled={uploading}>
                        Cancel
                    </Button>
                </div>
            )}
        </div>
    );
}
