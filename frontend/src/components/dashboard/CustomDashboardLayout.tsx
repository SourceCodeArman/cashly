import { useMemo, useState } from 'react'
import { Responsive, WidthProvider } from 'react-grid-layout'
import { useDashboardStore } from '@/store/dashboardStore'
import type { WidgetType } from '@/store/dashboardStore'
import { Button } from '@/components/ui/button'
import { Edit2, Check } from 'lucide-react'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

const ResponsiveGridLayout = WidthProvider(Responsive)

interface CustomDashboardLayoutProps {
    renderWidget: (type: WidgetType) => React.ReactNode
}

export function CustomDashboardLayout({ renderWidget }: CustomDashboardLayoutProps) {
    const { widgets, customLayout, setCustomLayout } = useDashboardStore()
    const [isEditing, setIsEditing] = useState(false)

    // Filter only visible widgets
    const visibleWidgets = widgets.filter(w => w.isVisible)

    // Create layout for visible widgets
    // We need to ensure all visible widgets have a layout entry
    const currentLayout = useMemo(() => {
        return visibleWidgets.map(widget => {
            const existingLayout = customLayout.find(l => l.i === widget.id)
            if (existingLayout) return existingLayout

            // Default position for new visible widgets (append to bottom)
            return {
                i: widget.id,
                x: 0,
                y: Infinity, // Puts it at the bottom
                w: 4,
                h: 4
            }
        })
    }, [visibleWidgets, customLayout])

    const handleLayoutChange = (layout: any) => {
        if (isEditing) {
            setCustomLayout(layout)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button
                    variant={isEditing ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                    className="gap-2"
                >
                    {isEditing ? (
                        <>
                            <Check className="h-4 w-4" />
                            Done Editing
                        </>
                    ) : (
                        <>
                            <Edit2 className="h-4 w-4" />
                            Edit Layout
                        </>
                    )}
                </Button>
            </div>

            <div className={isEditing ? "border-2 border-dashed border-primary/20 rounded-lg p-4 bg-muted/10" : ""}>
                <ResponsiveGridLayout
                    className="layout"
                    layouts={{ lg: currentLayout, md: currentLayout, sm: currentLayout }}
                    breakpoints={{ lg: 1000, md: 768, sm: 480, xs: 200, xxs: 0 }}
                    cols={{ lg: 12, md: 12, sm: 12, xs: 4, xxs: 2 }}
                    rowHeight={60}
                    isDraggable={isEditing}
                    isResizable={isEditing}
                    onLayoutChange={handleLayoutChange}
                    margin={[24, 24]}
                    containerPadding={[0, 0]}
                >
                    {visibleWidgets.map((widget) => (
                        <div key={widget.id} className="h-full">
                            <div className={`h-full ${isEditing ? 'pointer-events-none select-none' : ''}`}>
                                {renderWidget(widget.id)}
                            </div>
                            {isEditing && (
                                <div className="absolute inset-0 bg-primary/5 hover:bg-primary/10 transition-colors rounded-lg cursor-move z-10 flex items-center justify-center opacity-0 hover:opacity-100 group">
                                    <div className="bg-background/80 backdrop-blur-sm p-2 rounded text-xs font-medium shadow-sm">
                                        Drag to move • Resize from corner
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </ResponsiveGridLayout>
            </div>
        </div>
    )
}
