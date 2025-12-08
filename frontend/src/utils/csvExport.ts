import type { TrendData, PatternData, NetWorthData } from '@/types/analytics.types';

/**
 * Convert array of objects to CSV string
 */
function convertToCSV(data: any[], headers: string[]): string {
    const csvRows = [];

    // Add header row
    csvRows.push(headers.join(','));

    // Add data rows
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header];
            // Handle values that might contain commas or quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value ?? '';
        });
        csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
}

/**
 * Trigger CSV file download
 */
function downloadCSV(csvContent: string, filename: string) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

/**
 * Export spending trends to CSV
 */
export function exportTrendsToCSV(data: TrendData[]) {
    const headers = ['month', 'amount'];
    const csvContent = convertToCSV(data, headers);
    const filename = `spending-trends-${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csvContent, filename);
}

/**
 * Export spending patterns to CSV
 */
export function exportPatternsToCSV(data: PatternData[]) {
    const headers = ['day', 'amount', 'count'];
    const csvContent = convertToCSV(data, headers);
    const filename = `spending-patterns-${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csvContent, filename);
}

/**
 * Export net worth data to CSV
 */
export function exportNetWorthToCSV(data: NetWorthData) {
    const csvData = [
        { category: 'Net Worth', value: data.net_worth },
        { category: 'Assets', value: data.assets },
        { category: 'Liabilities', value: data.liabilities }
    ];
    const headers = ['category', 'value'];
    const csvContent = convertToCSV(csvData, headers);
    const filename = `net-worth-${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csvContent, filename);
}

/**
 * Export all analytics data to CSV
 */
export function exportAllAnalyticsToCSV(
    trendsData: TrendData[],
    patternsData: PatternData[],
    netWorthData: NetWorthData
) {
    let csvContent = 'Analytics Export\n\n';

    // Net Worth Section
    csvContent += 'NET WORTH\n';
    csvContent += 'Category,Value\n';
    csvContent += `Net Worth,${netWorthData.net_worth}\n`;
    csvContent += `Assets,${netWorthData.assets}\n`;
    csvContent += `Liabilities,${netWorthData.liabilities}\n\n`;

    // Trends Section
    csvContent += 'SPENDING TRENDS\n';
    csvContent += 'Month,Amount\n';
    trendsData.forEach(trend => {
        csvContent += `${trend.month},${trend.amount}\n`;
    });
    csvContent += '\n';

    // Patterns Section
    csvContent += 'SPENDING PATTERNS\n';
    csvContent += 'Day,Amount,Count\n';
    patternsData.forEach(pattern => {
        csvContent += `${pattern.day},${pattern.amount},${pattern.count}\n`;
    });

    const filename = `analytics-report-${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csvContent, filename);
}
