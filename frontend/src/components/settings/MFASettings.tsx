import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function MFASettings() {
    const { user, initializeAuth } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<'initial' | 'setup' | 'verify'>('initial');
    const [secret, setSecret] = useState('');
    const [otpUrl, setOtpUrl] = useState('');
    const [code, setCode] = useState('');

    const startSetup = async () => {
        setIsLoading(true);
        try {
            const res = await authService.setupMFA();
            if (res.status === 'success' && res.data) {
                setSecret(res.data.secret);
                setOtpUrl(res.data.otpauth_url);
                setStep('setup');
            }
        } catch (error) {
            toast.error('Failed to start MFA setup');
        } finally {
            setIsLoading(false);
        }
    };

    const verifySetup = async () => {
        setIsLoading(true);
        try {
            const res = await authService.verifyMFASetup(code, secret);
            if (res.status === 'success') {
                toast.success('Two-Factor Authentication enabled');
                await initializeAuth();
                setStep('initial');
            }
        } catch (error) {
            toast.error('Invalid code');
        } finally {
            setIsLoading(false);
        }
    };

    const disableMFA = async () => {
        if (!confirm('Are you sure you want to disable 2FA?')) return;
        setIsLoading(true);
        try {
            const res = await authService.disableMFA();
            if (res.status === 'success') {
                toast.success('Two-Factor Authentication disabled');
                await initializeAuth();
            }
        } catch (error) {
            toast.error('Failed to disable MFA');
        } finally {
            setIsLoading(false);
        }
    };

    if (user?.mfaEnabled) {
        return (
            <div className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="font-medium">Two-Factor Authentication</div>
                        <div className="text-sm text-green-600 font-medium my-1">
                            Enabled
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Your account is secured with 2FA.
                        </div>
                    </div>
                    <Button variant="destructive" onClick={disableMFA} disabled={isLoading} size="sm">
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Disable
                    </Button>
                </div>
            </div>
        );
    }

    if (step === 'initial') {
        return (
            <div className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="font-medium">Two-Factor Authentication</div>
                        <div className="text-sm text-muted-foreground">
                            Add an extra layer of security to your account
                        </div>
                    </div>
                    <Button variant="outline" onClick={startSetup} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enable 2FA
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-border p-4 space-y-4">
            <div className="font-medium">Setup Two-Factor Authentication</div>
            <div className="flex flex-col items-center justify-center p-4 bg-muted/20 rounded-lg space-y-4">
                <QRCodeSVG value={otpUrl} size={192} />
                <div className="text-center text-sm text-muted-foreground">
                    <p>Scan this QR code with your authenticator app.</p>
                    <p className="mt-2 text-xs">Or enter this secret key:</p>
                    <p className="mt-1 font-mono bg-muted p-2 rounded select-all">{secret}</p>
                </div>
            </div>

            <div className="flex gap-2 max-w-sm mx-auto">
                <Input
                    placeholder="Enter 6-digit code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    maxLength={6}
                />
                <Button onClick={verifySetup} disabled={isLoading || code.length !== 6}>
                    Verify
                </Button>
            </div>
            <Button variant="ghost" onClick={() => setStep('initial')} className="w-full">Cancel</Button>
        </div>
    );
}
