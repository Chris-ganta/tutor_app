import { useState } from "react";
import { LucideIcon, ChevronDown, ChevronRight, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface Option {
    id: string;
    label: string;
    [key: string]: any;
}

interface FilterSectionProps {
    label: string;
    icon: LucideIcon;
    options: Option[];
    selected: Set<string>;
    onSelectionChange: (selected: Set<string>) => void;
    searchTerm?: string;
    renderOption?: (option: Option) => React.ReactNode;
}

export function FilterSection({
    label,
    icon: Icon,
    options,
    selected,
    onSelectionChange,
    searchTerm = "",
    renderOption,
}: FilterSectionProps) {
    const [isOpen, setIsOpen] = useState(true);
    const [expanded, setExpanded] = useState(false);

    // Filter options based on search term
    const visibleOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // If search is active and no matches, don't render section if it was purely for search visibility
    // But requirement says "hide sections with 0 matches"
    if (searchTerm && visibleOptions.length === 0) return null;

    const VISIBLE_LIMIT = 8;
    const showAll = searchTerm.length > 0 || expanded;
    const displayedOptions = showAll ? visibleOptions : visibleOptions.slice(0, VISIBLE_LIMIT);
    const hiddenCount = visibleOptions.length - displayedOptions.length;

    const allSelected = visibleOptions.length > 0 && visibleOptions.every(opt => selected.has(opt.id));
    const someSelected = visibleOptions.some(opt => selected.has(opt.id));

    const toggleAll = () => {
        const newSelected = new Set(selected);
        if (allSelected) {
            visibleOptions.forEach(opt => newSelected.delete(opt.id));
        } else {
            visibleOptions.forEach(opt => newSelected.add(opt.id));
        }
        onSelectionChange(newSelected);
    };

    const toggleOption = (id: string) => {
        const newSelected = new Set(selected);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        onSelectionChange(newSelected);
    };

    return (
        <div className="py-2">
            <button
                className="flex items-center justify-between w-full px-2 py-1.5 text-sm font-semibold text-foreground/80 hover:bg-muted/50 rounded-md transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{label}</span>
                </div>
                {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </button>

            {isOpen && (
                <div className="mt-1 space-y-1 px-2">
                    {/* Select All Row */}
                    {visibleOptions.length > 1 && !searchTerm && (
                        <div
                            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer"
                            onClick={toggleAll}
                        >
                            <Checkbox
                                checked={allSelected}
                                className={cn("h-4 w-4", !allSelected && someSelected && "opacity-50")}
                            />
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">(Select All)</span>
                        </div>
                    )}

                    {/* Options */}
                    {displayedOptions.map(option => {
                        const isSelected = selected.has(option.id);
                        return (
                            <div
                                key={option.id}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer"
                                onClick={() => toggleOption(option.id)}
                            >
                                <Checkbox checked={isSelected} id={`filter-${option.id}`} />
                                <div className="flex-1 text-sm truncate">
                                    {renderOption ? renderOption(option) : option.label}
                                </div>
                            </div>
                        );
                    })}

                    {/* Expand Button */}
                    {!showAll && hiddenCount > 0 && (
                        <button
                            className="w-full text-left px-2 py-1.5 text-xs text-primary hover:underline"
                            onClick={() => setExpanded(true)}
                        >
                            +{hiddenCount} more — use search to find
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
