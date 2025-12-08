import React, { useState } from 'react'
import { Copy, Download, AlertTriangle, RefreshCw } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { authService } from '@/services/authService'
import { toast } from 'sonner'

interface BackupCodesModalProps {
    isOpen: boolean
    onClose: () => void
    onCodesGenerated?: () => void
}

export const BackupCodesModal: React.FC<BackupCodesModalProps> = ({
    isOpen,
    onClose,
    onCodesGenerated,
}) => {
    const [codes, setCodes] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isGenerated, setIsGenerated] = useState(false)

    const generateCodes = async () => {
        setIsLoading(true)
        try {
            const response = await authService.generateBackupCodes()
            if (response.status === 'success' && response.data) {
                setCodes(response.data.backup_codes)
                setIsGenerated(true)
                if (onCodesGenerated) onCodesGenerated()
                toast.success('Backup codes generated successfully')
            }
        } catch (error) {
            toast.error('Failed to generate backup codes')
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code)
        toast.success('Code copied to clipboard')
    }

    const copyAllCodes = () => {
        navigator.clipboard.writeText(codes.join('\n'))
        toast.success('All codes copied to clipboard')
    }

    const downloadCodes = () => {
        const element = document.createElement('a')
        const file = new Blob([codes.join('\n')], { type: 'text/plain' })
        element.href = URL.createObjectURL(file)
        element.download = 'cashly-backup-codes.txt'
        document.body.appendChild(element)
        element.click()
        document.body.removeChild(element)
    }

    const handleClose = () => {
        // Only reset state if closed successfully or cancelled
        setCodes([])
        setIsGenerated(false)
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Backup Codes</DialogTitle>
                    <DialogDescription>
                        Generate backup codes to access your account if you lose your authenticator device.
                    </DialogDescription>
                </DialogHeader>

                {!isGenerated ? (
                    <div className="py-4">
                        <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Warning</AlertTitle>
                            <AlertDescription>
                                Generating new codes will invalidate any existing backup codes.
                            </AlertDescription>
                        </Alert>
                        <div className="mt-6 flex justify-center">
                            <Button onClick={generateCodes} disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    'Generate Codes'
                                )}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="py-4 space-y-4">
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Save these codes!</AlertTitle>
                            <AlertDescription>
                                These codes will only be shown once. Please copy or download them and store them in a safe place.
                            </AlertDescription>
                        </Alert>

                        <div className="grid grid-cols-2 gap-2 bg-muted p-4 rounded-lg">
                            {codes.map((code, index) => (
                                <div key={index} className="flex items-center justify-between font-mono text-sm bg-background p-2 rounded border">
                                    <span>{code}</span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => copyCode(code)}
                                    >
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2 justify-center">
                            <Button variant="outline" onClick={copyAllCodes} className="flex-1">
                                <Copy className="mr-2 h-4 w-4" />
                                Copy All
                            </Button>
                            <Button variant="outline" onClick={downloadCodes} className="flex-1">
                                <Download className="mr-2 h-4 w-4" />
                                Download
                            </Button>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="secondary" onClick={handleClose}>
                        {isGenerated ? 'I have saved them' : 'Cancel'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
