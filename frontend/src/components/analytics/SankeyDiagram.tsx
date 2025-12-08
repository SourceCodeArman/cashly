import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Download } from 'lucide-react';
import type { SankeyData } from '@/types/analytics.types';
import { Sankey, Tooltip, ResponsiveContainer } from 'recharts';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SankeyDiagramProps {
    data: SankeyData | null;
    loading?: boolean;
}

export function SankeyDiagram({ data, loading }: SankeyDiagramProps) {
    const [chartData, setChartData] = useState<any>(null);
    const chartRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        if (data && data.nodes && data.links) {
            // Transform data to Recharts format
            setChartData({
                nodes: data.nodes,
                links: data.links
            });
        }
    }, [data]);

    const exportToPng = async () => {
        if (!chartRef.current) return;

        setIsExporting(true);
        try {
            const dataUrl = await toPng(chartRef.current, {
                quality: 1.0,
                pixelRatio: 2,
                backgroundColor: '#ffffff',
            });

            const link = document.createElement('a');
            link.download = `sankey-diagram-${new Date().toISOString().split('T')[0]}.png`;
            link.href = dataUrl;
            link.click();

            toast.success('Diagram exported as PNG');
        } catch (error) {
            console.error('Error exporting PNG:', error);
            toast.error('Failed to export diagram');
        } finally {
            setIsExporting(false);
        }
    };

    const exportToSvg = async () => {
        if (!chartRef.current) return;

        setIsExporting(true);
        try {
            // Find the SVG element within the chart
            const svgElement = chartRef.current.querySelector('svg');
            if (!svgElement) {
                throw new Error('SVG element not found');
            }

            // Clone the SVG to avoid modifying the original
            const clonedSvg = svgElement.cloneNode(true) as SVGElement;

            // Set background
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('width', '100%');
            rect.setAttribute('height', '100%');
            rect.setAttribute('fill', '#ffffff');
            clonedSvg.insertBefore(rect, clonedSvg.firstChild);

            // Serialize to string
            const serializer = new XMLSerializer();
            const svgString = serializer.serializeToString(clonedSvg);

            // Create blob and download
            const blob = new Blob([svgString], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.download = `sankey-diagram-${new Date().toISOString().split('T')[0]}.svg`;
            link.href = url;
            link.click();

            URL.revokeObjectURL(url);
            toast.success('Diagram exported as SVG');
        } catch (error) {
            console.error('Error exporting SVG:', error);
            toast.error('Failed to export diagram');
        } finally {
            setIsExporting(false);
        }
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Cash Flow Diagram</CardTitle>
                    <CardDescription>Visual representation of money flow</CardDescription>
                </CardHeader>
                <CardContent className="h-[500px] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    if (!data || !data.nodes || data.nodes.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Cash Flow Diagram</CardTitle>
                    <CardDescription>Visual representation of money flow</CardDescription>
                </CardHeader>
                <CardContent className="h-[500px] flex items-center justify-center">
                    <p className="text-muted-foreground">No transaction data available for the selected period.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Cash Flow Diagram</CardTitle>
                        <CardDescription>
                            Income sources flowing through expenses and savings
                        </CardDescription>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" disabled={isExporting}>
                                {isExporting ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Download className="h-4 w-4 mr-2" />
                                )}
                                Export
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={exportToPng}>
                                Export as PNG
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={exportToSvg}>
                                Export as SVG
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>
            <CardContent className="h-[500px]">
                <div ref={chartRef} className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <Sankey
                            data={chartData}
                            node={(props: any) => {
                                const { x, y, width, height, index } = props;
                                // Get color from original data
                                const nodeColor = data?.nodes?.[index]?.color || '#8b5cf6';
                                const nodeName = data?.nodes?.[index]?.name || '';

                                return (
                                    <g>
                                        <rect
                                            x={x}
                                            y={y}
                                            width={width}
                                            height={height}
                                            fill={nodeColor}
                                            fillOpacity={0.9}
                                        />
                                        <text
                                            x={x + width / 2}
                                            y={y + height + 15}
                                            textAnchor="middle"
                                            fontSize={11}
                                            fill="currentColor"
                                            fontWeight="500"
                                        >
                                            {nodeName}
                                        </text>
                                    </g>
                                );
                            }}
                            link={{ stroke: '#94a3b8', strokeOpacity: 0.5 }}
                            nodePadding={50}
                            margin={{ top: 20, right: 120, bottom: 40, left: 20 }}
                        >
                            <Tooltip
                                content={({ payload }) => {
                                    if (!payload || payload.length === 0) return null;
                                    const data = payload[0].payload;
                                    return (
                                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                                            {data.name ? (
                                                <p className="font-semibold">{data.name}</p>
                                            ) : (
                                                <>
                                                    <p className="text-sm">
                                                        {data.source?.name} → {data.target?.name}
                                                    </p>
                                                    <p className="font-semibold">
                                                        ${data.value?.toLocaleString(undefined, {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2
                                                        })}
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    );
                                }}
                            />
                        </Sankey>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
