import React from 'react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
    className = '',
}) => {
    return (
        <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
            <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-6 mb-4">
                <Icon className="h-12 w-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                {description}
            </p>
            {actionLabel && onAction && (
                <Button onClick={onAction} size="lg">
                    {actionLabel}
                </Button>
            )}
        </div>
    );
};
