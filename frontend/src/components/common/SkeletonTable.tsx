import React from 'react';

interface SkeletonTableProps {
    rows?: number;
    columns?: number;
    className?: string;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
    rows = 5,
    columns = 4,
    className = ''
}) => {
    return (
        <div className={`animate-pulse ${className}`}>
            {/* Table Header */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-t-lg p-4 flex gap-4 border-b border-gray-200 dark:border-gray-700">
                {Array.from({ length: columns }).map((_, i) => (
                    <div key={`header-${i}`} className={`h-4 bg-gray-200 dark:bg-gray-700 rounded ${i === 0 ? 'w-1/4' : 'flex-1'}`}></div>
                ))}
            </div>

            {/* Table Rows */}
            <div className="bg-white dark:bg-gray-900 rounded-b-lg divide-y divide-gray-200 dark:divide-gray-700">
                {Array.from({ length: rows }).map((_, rowIndex) => (
                    <div key={`row-${rowIndex}`} className="p-4 flex gap-4">
                        {Array.from({ length: columns }).map((_, colIndex) => (
                            <div
                                key={`cell-${rowIndex}-${colIndex}`}
                                className={`h-4 bg-gray-200 dark:bg-gray-700 rounded ${colIndex === 0 ? 'w-1/4' : 'flex-1'}`}
                            ></div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};
