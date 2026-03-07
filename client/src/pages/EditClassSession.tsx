import { useState, useEffect, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Save, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StudentList } from "@/components/student-list";
import { DurationPicker } from "@/components/duration-picker";
import { ClassSummary } from "@/components/class-summary";
import { PaymentToggle } from "@/components/payment-toggle";
import { format, parseISO, isValid } from "date-fns";

export default function EditClassSession() {
    const [, params] = useRoute("/classes/:id/edit");
    const id = params?.id;
    const [, setLocation] = useLocation();
    const { toast } = useToast();

    const { data: classSession, isLoading: sessionLoading } = useQuery<any>({
        queryKey: ["/api/classes", id],
        queryFn: async () => {
            if (!id) throw new Error("No ID provided");
            const res = await fetch(`/api/classes/${id}`);
            if (!res.ok) throw new Error("Failed to fetch class details");
            return res.json();
        },
        enabled: !!id,
    });

    const { data: students = [], isLoading: studentsLoading } = useQuery<any[]>({
        queryKey: ["/api/students"],
    });

    const [duration, setDuration] = useState(60);
    const [summary, setSummary] = useState("");
    const [date, setDate] = useState("");
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [isPaid, setIsPaid] = useState(false);

    // Initialize form when session data loads — keyed on classSession?.id to re-run correctly
    useEffect(() => {
        if (!classSession) return;

        setDuration(classSession.durationMinutes ?? 60);
        setSummary(classSession.summary ?? "");
        setIsPaid(!!classSession.isPaid);
        setSelectedStudents(classSession.studentIds ?? []);

        let dateStr = format(new Date(), "yyyy-MM-dd");
        if (classSession.date) {
            try {
                const parsed = typeof classSession.date === "string"
                    ? parseISO(classSession.date)
                    : new Date(classSession.date);
                if (isValid(parsed)) dateStr = format(parsed, "yyyy-MM-dd");
            } catch (_) { }
        }
        setDate(dateStr);
    }, [classSession?.id]); // Only re-init when the session ID changes

    const updateClassMutation = useMutation({
        mutationFn: async (data: any) => {
            await apiRequest("PATCH", `/api/classes/${id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
            queryClient.invalidateQueries({ queryKey: ["/api/classes", id] });
            queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
            toast({ title: "Class Updated", description: "Changes saved successfully." });
            setLocation(`/class/${id}`);
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const handleSave = () => {
        if (selectedStudents.length === 0) {
            toast({
                title: "No students selected",
                description: "Please select at least one student.",
                variant: "destructive",
            });
            return;
        }
        const dateObj = new Date(date);
        if (!isValid(dateObj)) {
            toast({ title: "Invalid Date", description: "Please select a valid date.", variant: "destructive" });
            return;
        }
        updateClassMutation.mutate({
            durationMinutes: duration,
            summary,
            date: dateObj.toISOString(),
            studentIds: selectedStudents,
            isPaid,
        });
    };

    const handleToggleStudent = (studentId: string) => {
        setSelectedStudents(prev =>
            prev.includes(studentId) ? prev.filter(s => s !== studentId) : [...prev, studentId]
        );
    };

    // Build enriched student list for StudentList component
    // Only show students who are already in the session
    const enrichedStudents = useMemo(() =>
        students
            .filter((s: any) => classSession?.studentIds?.includes(s.id))
            .map((s: any) => ({
                id: s.id,
                name: s.name,
                grade: s.grade,
                selected: selectedStudents.includes(s.id),
            })),
        [students, selectedStudents, classSession?.studentIds]
    );

    if (sessionLoading || studentsLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!classSession) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4">
                <p>Class session not found</p>
                <Button variant="outline" onClick={() => setLocation("/history")}>Go Back</Button>
            </div>
        );
    }

    const isSaving = updateClassMutation.isPending;

    return (
        <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background">
            {/* Sticky header — mirrors ClassSession.tsx */}
            <header className="sticky top-0 z-10 flex items-center gap-3 bg-background px-4 pb-2 pt-3 border-b border-border/50">
                <button
                    type="button"
                    className="flex size-8 items-center justify-center rounded-full text-foreground"
                    aria-label="Go back"
                    onClick={() => setLocation(`/class/${id}`)}
                >
                    <ArrowLeft className="size-5" />
                </button>
                <h1 className="flex-1 text-lg font-bold text-foreground">Edit Class Session</h1>
                <Button
                    size="sm"
                    className="rounded-xl font-semibold gap-1.5"
                    disabled={isSaving}
                    onClick={handleSave}
                >
                    {isSaving ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <Save className="size-4" />
                    )}
                    Save Changes
                </Button>
            </header>

            {/* Scrollable content */}
            <main className="flex-1 overflow-y-auto px-4 pb-8">
                <div className="flex flex-col gap-5 pt-4">

                    {/* Date */}
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Date</p>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <input
                                type="date"
                                className="w-full pl-10 pr-4 py-3 bg-muted/40 rounded-xl text-sm font-medium text-foreground border border-border/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Students */}
                    <StudentList
                        students={enrichedStudents}
                        onToggle={handleToggleStudent}
                        hideAdd={true}
                        hideSearch={true}
                    />

                    {/* Duration */}
                    <DurationPicker value={duration} onChange={setDuration} />

                    {/* Summary */}
                    <ClassSummary value={summary} onChange={setSummary} />

                    {/* Payment */}
                    <PaymentToggle checked={isPaid} onChange={setIsPaid} />

                </div>
            </main>
        </div>
    );
}
