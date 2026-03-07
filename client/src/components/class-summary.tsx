import { Textarea } from "@/components/ui/textarea"

interface ClassSummaryProps {
    value: string
    onChange: (value: string) => void
}

export function ClassSummary({ value, onChange }: ClassSummaryProps) {
    return (
        <div>
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-3">
                Class Summary
            </h3>
            <Textarea
                placeholder="What did you cover today? (Sent to parents)"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={5}
                className="resize-none rounded-xl bg-card border-none shadow-none text-sm min-h-28"
                data-testid="input-summary"
            />
        </div>
    )
}
