import { Settings2, GripVertical, LayoutGrid, List, Grid3X3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useDashboardStore, PRESET_LAYOUTS, type PresetName } from '@/store/dashboardStore'
import { Reorder, useDragControls } from 'framer-motion'

function DraggableWidget({ widget, onToggle }: { widget: any; onToggle: (id: any) => void }) {
    const controls = useDragControls()

    return (
        <Reorder.Item
            value={widget}
            id={widget.id}
            className="flex items-center justify-between rounded-md border border-border bg-card p-3 shadow-sm"
            dragListener={false}
            dragControls={controls}
        >
            <div className="flex items-center gap-3">
                <div
                    className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
                    onPointerDown={(e) => controls.start(e)}
                >
                    <GripVertical className="h-5 w-5" />
                </div>
                <span className="font-medium">{widget.label}</span>
            </div>
            <Switch checked={widget.isVisible} onCheckedChange={() => onToggle(widget.id)} />
        </Reorder.Item>
    )
}

function LayoutPreview({ layout, visibleWidgets }: { layout: any[]; visibleWidgets: string[] }) {
    // Create a 12x10 grid for preview
    const grid = Array(10).fill(null).map(() => Array(12).fill(false))

    // Mark occupied cells
    layout.forEach(item => {
        if (visibleWidgets.includes(item.i)) {
            for (let y = item.y; y < Math.min(item.y + item.h, 10); y++) {
                for (let x = item.x; x < Math.min(item.x + item.w, 12); x++) {
                    grid[y][x] = true
                }
            }
        }
    })

    return (
        <div className="w-full aspect-[12/8] bg-muted/20 rounded-md p-1 gap-[2px] grid grid-rows-[repeat(10,1fr)] grid-cols-12">
            {layout.filter(l => visibleWidgets.includes(l.i)).map((item) => (
                <div
                    key={item.i}
                    className="bg-primary/20 rounded-[1px] border border-primary/30"
                    style={{
                        gridColumn: `${item.x + 1} / span ${item.w}`,
                        gridRow: `${item.y + 1} / span ${item.h}`,
                    }}
                />
            ))}
        </div>
    )
}

export function DashboardCustomizer() {
    const { layoutMode, widgets, setLayoutMode, toggleWidget, reorderWidgets, resetDefaults, applyPreset } = useDashboardStore()

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Settings2 className="h-4 w-4" />
                    Customize
                </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Customize Dashboard</SheetTitle>
                    <SheetDescription>
                        Manage your dashboard layout and widgets. Drag to reorder.
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                    {/* Layout Selection */}
                    <div className="space-y-3">
                        <Label>Layout View</Label>
                        <div className="grid grid-cols-3 gap-4">
                            <Button
                                variant={layoutMode === 'grid' ? 'default' : 'outline'}
                                className="justify-start gap-2 px-2"
                                onClick={() => setLayoutMode('grid')}
                            >
                                <LayoutGrid className="h-4 w-4" />
                                Grid
                            </Button>
                            <Button
                                variant={layoutMode === 'list' ? 'default' : 'outline'}
                                className="justify-start gap-2 px-2"
                                onClick={() => setLayoutMode('list')}
                            >
                                <List className="h-4 w-4" />
                                List
                            </Button>
                            <Button
                                variant={layoutMode === 'custom' ? 'default' : 'outline'}
                                className="justify-start gap-2 px-2"
                                onClick={() => setLayoutMode('custom')}
                            >
                                <Grid3X3 className="h-4 w-4" />
                                Custom
                            </Button>
                        </div>
                    </div>

                    {/* Presets */}
                    <div className="space-y-3">
                        <Label>Layout Presets</Label>
                        <div className="grid grid-cols-2 gap-3">
                            {(Object.keys(PRESET_LAYOUTS) as PresetName[]).map((preset) => (
                                <div
                                    key={preset}
                                    className="cursor-pointer group relative"
                                    onClick={() => applyPreset(preset)}
                                >
                                    <div className="mb-2">
                                        <LayoutPreview
                                            layout={PRESET_LAYOUTS[preset].layout}
                                            visibleWidgets={PRESET_LAYOUTS[preset].visible}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">{PRESET_LAYOUTS[preset].label}</span>
                                    </div>
                                    <div className="absolute inset-0 rounded-md ring-2 ring-primary opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none" />
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Applying a preset will switch to Custom view.
                        </p>
                    </div>

                    {/* Widget Management */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label>Widgets</Label>
                            <Button variant="ghost" size="sm" onClick={resetDefaults} className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground">
                                Reset to Default
                            </Button>
                        </div>

                        {layoutMode !== 'custom' && (
                            <p className="text-xs text-muted-foreground">
                                Drag to reorder widgets in Grid and List views.
                            </p>
                        )}

                        <Reorder.Group axis="y" values={widgets} onReorder={reorderWidgets} className="space-y-2">
                            {widgets.map((widget) => (
                                <DraggableWidget key={widget.id} widget={widget} onToggle={toggleWidget} />
                            ))}
                        </Reorder.Group>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
