import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Calendar, Clock, Filter, DollarSign, CheckCircle2, Send, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

const AVATAR_COLORS = [
    "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500",
    "bg-pink-500", "bg-teal-500", "bg-indigo-500", "bg-red-500",
];

function getAvatarColor(name: string) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function History() {
    const { toast } = useToast();
    const [notifySession, setNotifySession] = useState<any>(null);

    const { data: classes = [], isLoading: classesLoading } = useQuery<any[]>({
        queryKey: ["/api/classes"],
    });

    const { data: students = [], isLoading: studentsLoading } = useQuery<any[]>({
        queryKey: ["/api/students"],
    });

    const isLoading = classesLoading || studentsLoading;

    const togglePaymentMutation = useMutation({
        mutationFn: async ({ id, isPaid }: { id: string; isPaid: boolean }) => {
            await apiRequest("PATCH", `/api/classes/${id}`, { isPaid });
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
            queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
            toast({
                title: variables.isPaid ? "Marked as Paid" : "Marked as Unpaid",
                description: "Class session has been updated.",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const togglePayment = (id: string, currentIsPaid: boolean) => {
        togglePaymentMutation.mutate({ id, isPaid: !currentIsPaid });
    };

    const handleSendNotification = () => {
        const session = notifySession;
        const sessionStudents = session.studentIds.map((sid: string) => students.find((s: any) => s.id === sid)).filter(Boolean);
        setNotifySession(null);
        toast({
            title: "Notification Sent!",
            description: `Summary sent to ${sessionStudents.length} parent(s).`,
        });
    };

    const getNotifyStudents = () => {
        if (!notifySession) return [];
        return notifySession.studentIds.map((sid: string) => students.find((s: any) => s.id === sid)).filter(Boolean);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-muted/20 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loading-spinner" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/20 pb-24">
            <div className="bg-background pt-8 pb-4 px-6 border-b sticky top-0 z-10 flex justify-between items-end">
                <h1 className="text-2xl font-bold font-display" data-testid="text-history-title">Class History</h1>
                <div className="p-2 bg-muted rounded-full">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                </div>
            </div>

            <div className="p-6 space-y-4">
                {classes.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground" data-testid="text-no-classes">
                        <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No classes recorded yet.</p>
                        <p className="text-xs mt-1">Log your first class to see it here!</p>
                    </div>
                ) : (
                    classes.map((session: any) => {
                        const student = students.find((s: any) => s.id === session.studentIds[0]);
                        const studentName = student?.name || "Unknown Student";
                        return (
                            <Card key={session.id} className="border-none shadow-sm" data-testid={`card-class-${session.id}`}>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${getAvatarColor(studentName)}`}>
                                                {getInitials(studentName)}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-sm" data-testid={`text-class-student-${session.id}`}>{studentName}</h4>
                                                <p className="text-xs text-muted-foreground">{format(new Date(session.date), "EEEE, MMM d")}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <button
                                                onClick={() => togglePayment(session.id, session.isPaid)}
                                                data-testid={`button-toggle-payment-${session.id}`}
                                                className={cn(
                                                    "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors gap-1",
                                                    session.isPaid
                                                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                                                        : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                                )}
                                            >
                                                {session.isPaid ? (
                                                    <>
                                                        <CheckCircle2 className="h-3 w-3" /> Paid
                                                    </>
                                                ) : (
                                                    <>
                                                        <Clock className="h-3 w-3" /> Pending
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="pl-[3.25rem]">
                                        <p className="text-sm text-foreground/80 mb-3">{session.summary}</p>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" /> {session.durationMinutes} mins
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <DollarSign className="h-3 w-3" /> ${Math.round((student?.hourlyRate || 0) * (session.durationMinutes / 60))} earned
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => window.location.href = `/classes/${session.id}/edit`}
                                                    data-testid={`button-edit-${session.id}`}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => setNotifySession(session)}
                                                    data-testid={`button-notify-${session.id}`}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                                                >
                                                    <Send className="h-3 w-3" /> Notify
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>

            <Dialog open={!!notifySession} onOpenChange={(open) => !open && setNotifySession(null)}>
                <DialogContent className="sm:max-w-md rounded-2xl mx-4">
                    <DialogHeader>
                        <DialogTitle>Notify Parents</DialogTitle>
                        <DialogDescription>
                            Send class details to parent(s).
                        </DialogDescription>
                    </DialogHeader>
                    {notifySession && (
                        <div className="bg-muted/50 p-4 rounded-lg space-y-3 my-2 border">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground border-b pb-2">
                                <Mail className="h-3 w-3" />
                                To: {getNotifyStudents().map((s: any) => s.parentEmail).join(", ") || "N/A"}
                            </div>
                            <div className="space-y-2">
                                <p className="font-semibold text-sm">
                                    Class Summary — {getNotifyStudents().map((s: any) => s.name).join(", ")}
                                </p>
                                <div className="text-sm text-foreground/80 space-y-1">
                                    <p>Hi! Here are the details from our recent session:</p>
                                    <div className="bg-background rounded-md p-3 space-y-1.5 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Date</span>
                                            <span className="font-medium">{format(new Date(notifySession.date), "EEEE, MMM d, yyyy")}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Duration</span>
                                            <span className="font-medium">{notifySession.durationMinutes} minutes</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Status</span>
                                            <span className={cn("font-medium", notifySession.isPaid ? "text-green-600" : "text-amber-600")}>
                                                {notifySession.isPaid ? "Paid" : "Payment Pending"}
                                            </span>
                                        </div>
                                    </div>
                                    {notifySession.summary && (
                                        <p className="italic mt-2">"{notifySession.summary}"</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setNotifySession(null)} data-testid="button-cancel-notify">Cancel</Button>
                        <Button onClick={handleSendNotification} className="w-full sm:w-auto" data-testid="button-send-notification">
                            <Send className="w-4 h-4 mr-2" /> Send Notification
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
