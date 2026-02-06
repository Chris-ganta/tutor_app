import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Upload, Mail, Phone, DollarSign } from "lucide-react";

interface StudentFormData {
    name: string;
    grade: string;
    hourlyRate: number;
    parentName: string;
    parentEmail: string;
    parentPhone: string;
}

interface StudentFormProps {
    initialData?: StudentFormData;
    onSubmit: (data: StudentFormData) => void;
    isSubmitting?: boolean;
    submitLabel?: string;
}

export function StudentForm({ initialData, onSubmit, isSubmitting = false, submitLabel = "Save Student" }: StudentFormProps) {
    const [name, setName] = useState(initialData?.name || "");
    const [grade, setGrade] = useState(initialData?.grade || "");
    const [rate, setRate] = useState(initialData?.hourlyRate?.toString() || "");
    const [parentName, setParentName] = useState(initialData?.parentName || "");
    const [parentEmail, setParentEmail] = useState(initialData?.parentEmail || "");
    const [parentPhone, setParentPhone] = useState(initialData?.parentPhone || "");

    // Update form if initialData loads later (e.g. edit mode)
    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setGrade(initialData.grade);
            setRate(initialData.hourlyRate.toString());
            setParentName(initialData.parentName);
            setParentEmail(initialData.parentEmail);
            setParentPhone(initialData.parentPhone);
        }
    }, [initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            name,
            grade,
            hourlyRate: parseInt(rate) || 0,
            parentName,
            parentEmail,
            parentPhone,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="flex justify-center">
                <div className="h-24 w-24 rounded-full bg-muted border-2 border-dashed border-muted-foreground/50 flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:bg-muted/70 transition-colors">
                    <Upload className="h-6 w-6 mb-1" />
                    <span className="text-[10px]">Add Photo</span>
                </div>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Student Name</Label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="name" placeholder="e.g. Alex Johnson" className="pl-9" required value={name} onChange={(e) => setName(e.target.value)} data-testid="input-name" />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="grade">Age</Label>
                    <Input id="grade" placeholder="e.g. 15" required value={grade} onChange={(e) => setGrade(e.target.value)} data-testid="input-age" />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="rate">Hourly Rate ($)</Label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="rate" type="number" placeholder="50" className="pl-9" required value={rate} onChange={(e) => setRate(e.target.value)} data-testid="input-rate" />
                    </div>
                </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Parent Details</h3>

                <div className="space-y-2">
                    <Label htmlFor="parentName">Parent Name</Label>
                    <Input id="parentName" placeholder="e.g. Sarah Johnson" required value={parentName} onChange={(e) => setParentName(e.target.value)} data-testid="input-parent-name" />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="email" type="email" placeholder="parent@example.com" className="pl-9" required value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} data-testid="input-parent-email" />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" className="pl-9" required value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} data-testid="input-parent-phone" />
                    </div>
                </div>
            </div>

            <div className="pt-4">
                <Button type="submit" className="w-full h-11 text-base shadow-lg shadow-primary/20" disabled={isSubmitting} data-testid="button-save-student">
                    {isSubmitting ? "Saving..." : submitLabel}
                </Button>
            </div>
        </form>
    );
}
