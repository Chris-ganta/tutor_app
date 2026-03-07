import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface DurationPickerProps {
    value: number
    onChange: (value: number) => void
}

const PRESETS = [
    { value: 15, label: "15 min" },
    { value: 30, label: "30 min" },
    { value: 45, label: "45 min" },
    { value: 60, label: "1 hour" },
    { value: 90, label: "1.5 hours" },
    { value: 120, label: "2 hours" },
    { value: 150, label: "2.5 hours" },
    { value: 180, label: "3 hours" },
]

export function DurationPicker({ value, onChange }: DurationPickerProps) {
    const selectedLabel = PRESETS.find((p) => p.value === value)?.label ?? ""

    return (
        <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Duration
            </h3>
            <Select
                value={String(value)}
                onValueChange={(v) => onChange(Number(v))}
            >
                <SelectTrigger className="w-32 rounded-lg bg-card border-border text-sm font-medium" data-testid="select-duration">
                    <SelectValue placeholder="Select">{selectedLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                    {PRESETS.map((preset) => (
                        <SelectItem key={preset.value} value={String(preset.value)}>
                            {preset.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}
