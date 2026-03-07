import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface PaymentToggleProps {
    checked: boolean
    onChange: (checked: boolean) => void
}

export function PaymentToggle({ checked, onChange }: PaymentToggleProps) {
    return (
        <div className="flex items-center justify-between">
            <Label
                htmlFor="paid-toggle"
                className="text-sm font-medium text-card-foreground cursor-pointer"
            >
                Paid immediately
            </Label>
            <Switch id="paid-toggle" checked={checked} onCheckedChange={onChange} data-testid="switch-paid" />
        </div>
    )
}
