import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { PasswordChangeForm } from '@/components/settings/PasswordChangeForm'
import { MFASettings } from './MFASettings'
import { BackupCodesModal } from './BackupCodesModal'
import { Button } from '@/components/ui/button'
import { ShieldAlert } from 'lucide-react'

export function SecuritySettings() {
    const { user } = useAuth()
    const [isBackupCodesOpen, setIsBackupCodesOpen] = useState(false)

    return (
        <div className="space-y-8">
            <div className="space-y-4">
                <div className="font-medium">Change Password</div>
                <PasswordChangeForm />
            </div>

            <MFASettings />

            {user?.mfaEnabled && (
                <div className="rounded-lg border p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <div className="font-medium flex items-center">
                                <ShieldAlert className="w-4 h-4 mr-2" />
                                Backup Codes
                            </div>
                            <div className="text-sm text-muted-foreground">
                                Generate backup codes to access your account without your authenticator device.
                            </div>
                        </div>
                        <Button variant="outline" onClick={() => setIsBackupCodesOpen(true)}>
                            View Backup Codes
                        </Button>
                    </div>
                </div>
            )}

            <BackupCodesModal
                isOpen={isBackupCodesOpen}
                onClose={() => setIsBackupCodesOpen(false)}
            />
        </div>
    )
}
