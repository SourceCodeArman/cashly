import React from 'react';

interface SkeletonListProps {
    items?: number;
    className?: string;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
    items = 3,
    className = ''
}) => {
    return (
        <div className={`space-y-4 ${className}`}>
            {Array.from({ length: items }).map((_, index) => (
                <div
                    key={`skeleton-list-${index}`}
                    className="animate-pulse bg-white dark:bg-gray-800 rounded-lg shadow p-4"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3 flex-1">
                            <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                            <div className="flex-1">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                            </div>
                        </div>
                        <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                        <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    </div>
                </div>
            ))}
        </div>
    );
};
