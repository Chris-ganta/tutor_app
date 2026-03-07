import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ArrowLeft, Clock, Send, Mail, Loader2 } from "lucide-react";
import { StudentList } from "@/components/student-list";
import { DurationPicker } from "@/components/duration-picker";
import { ClassSummary } from "@/components/class-summary";
import { PaymentToggle } from "@/components/payment-toggle";

export default function ClassSession() {
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [duration, setDuration] = useState(60);
    const [summary, setSummary] = useState("");
    const [showPreview, setShowPreview] = useState(false);
    const [isPaid, setIsPaid] = useState(false);
    const { toast } = useToast();
    const [, setLocation] = useLocation();

    const { data: students = [], isLoading } = useQuery<any[]>({
        queryKey: ["/api/students"],
    });

    const createClassMutation = useMutation({
        mutationFn: async (data: { durationMinutes: number; summary: string; studentIds: string[]; status: string; isPaid: boolean }) => {
            await apiRequest("POST", "/api/classes", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
            queryClient.invalidateQueries({ queryKey: ["/api/classes/student"] });
            queryClient.invalidateQueries({ queryKey: ["/api/students"] });
            queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
            toast({
                title: "Class Logged!",
                description: `Notification sent to ${selectedStudents.length} parents.${isPaid ? " Marked as paid." : ""}`,
            });
            setTimeout(() => setLocation("/"), 500);
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleToggleStudent = (id: string) => {
        if (selectedStudents.includes(id)) {
            setSelectedStudents(selectedStudents.filter(s => s !== id));
        } else {
            setSelectedStudents([...selectedStudents, id]);
        }
    };

    const handleLogClass = () => {
        if (selectedStudents.length === 0) {
            toast({
                title: "No students selected",
                description: "Please select at least one student.",
                variant: "destructive"
            });
            return;
        }
        createClassMutation.mutate({
            durationMinutes: duration,
            summary,
            studentIds: selectedStudents,
            status: "completed",
            isPaid,
        });
    };

    const handleNotifyParents = () => {
        if (selectedStudents.length === 0) {
            toast({
                title: "No students selected",
                description: "Please select at least one student.",
                variant: "destructive"
            });
            return;
        }
        setShowPreview(true);
    };

    const notifyMutation = useMutation({
        mutationFn: async () => {
            await apiRequest("POST", "/api/notify/class-summary", {
                studentIds: selectedStudents,
                date: new Date().toLocaleDateString(),
                durationMinutes: duration,
                summary,
            });
        },
        onSuccess: () => {
            setShowPreview(false);
            toast({
                title: "📧 Notification Sent!",
                description: `Class summary emailed to ${selectedStudents.length} parent(s).`,
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Failed to send",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleSendNotification = () => {
        notifyMutation.mutate();
    };

    // Build enriched student list for the StudentList component
    const enrichedStudents = useMemo(() =>
        students.map((s: any) => ({
            id: s.id,
            name: s.name,
            grade: s.grade,
            selected: selectedStudents.includes(s.id),
        })),
        [students, selectedStudents]
    );

    const hasSelected = selectedStudents.length > 0;

    const studentNames = selectedStudents.map(id => students.find((s: any) => s.id === id)?.name).join(", ");
    const parentEmail = selectedStudents.length > 0 ? students.find((s: any) => s.id === selectedStudents[0])?.parentEmail : "";

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loading-spinner" />
            </div>
        );
    }

    return (
        <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background">
            {/* Sticky header */}
            <header className="sticky top-0 z-10 flex items-center gap-3 bg-background px-4 pb-2 pt-3">
                <button
                    type="button"
                    className="flex size-8 items-center justify-center rounded-full text-foreground"
                    aria-label="Go back"
                    onClick={() => setLocation("/")}
                    data-testid="button-back"
                >
                    <ArrowLeft className="size-5" />
                </button>
                <h1 className="text-lg font-bold text-foreground">
                    New Class Session
                </h1>
            </header>

            {/* Scrollable content */}
            <main className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="flex flex-col gap-5 pt-2">
                    <StudentList students={enrichedStudents} onToggle={handleToggleStudent} />
                    <DurationPicker value={duration} onChange={setDuration} />
                    <ClassSummary value={summary} onChange={setSummary} />
                    <PaymentToggle checked={isPaid} onChange={setIsPaid} />
                </div>
            </main>

            {/* Sticky footer with compact side-by-side CTAs */}
            <div className="sticky bottom-0 z-10 border-t border-border bg-card pb-20">
                <div className="flex items-center gap-3 px-4 py-3">
                    <Button
                        size="lg"
                        className="flex-1 h-11 rounded-xl text-sm font-semibold"
                        disabled={!hasSelected || createClassMutation.isPending}
                        onClick={handleLogClass}
                        data-testid="button-log-class"
                    >
                        {createClassMutation.isPending ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <Clock className="size-4" />
                        )}
                        Log Class
                    </Button>
                    <Button
                        variant="outline"
                        size="lg"
                        className="flex-1 h-11 rounded-xl text-sm font-semibold"
                        disabled={!hasSelected}
                        onClick={handleNotifyParents}
                        data-testid="button-notify-parents"
                    >
                        <Mail className="size-4" />
                        Notify Parents
                    </Button>
                </div>
            </div>

            {/* Notification Preview Dialog */}
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="sm:max-w-md rounded-2xl mx-4">
                    <DialogHeader>
                        <DialogTitle>Notification Preview</DialogTitle>
                        <DialogDescription>
                            This message will be sent to the parent(s).
                        </DialogDescription>
                    </DialogHeader>
                    <div className="bg-muted/50 p-4 rounded-lg space-y-3 my-2 border">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground border-b pb-2">
                            <Mail className="h-3 w-3" />
                            To: {selectedStudents.length > 1 ? "Parents (Multiple)" : parentEmail}
                        </div>
                        <div className="space-y-1">
                            <p className="font-semibold text-sm">Class Summary: {studentNames}</p>
                            <p className="text-sm text-foreground/80">
                                Hi! Just letting you know we completed a {duration} min session today.
                            </p>
                            {summary && (
                                <p className="text-sm text-foreground/80 italic mt-2">
                                    "{summary}"
                                </p>
                            )}
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setShowPreview(false)} data-testid="button-edit-preview">Edit</Button>
                        <Button onClick={handleSendNotification} className="w-full sm:w-auto" data-testid="button-send-notification">
                            <Send className="w-4 h-4 mr-2" /> Send Notification
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
