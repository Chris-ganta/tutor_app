import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute, Link } from "wouter";
import { ArrowLeft, Calendar, Clock, DollarSign, Users, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

export default function ClassDetails() {
    const [match, params] = useRoute("/class/:id");
    const id = params?.id;
    const { toast } = useToast();
    const [, setLocation] = useLocation();

    const { data: session, isLoading: sessionLoading } = useQuery<any>({
        queryKey: ["/api/classes", id],
        queryFn: async () => {
            const res = await fetch(`/api/classes/${id}`);
            if (!res.ok) throw new Error("Failed to fetch class details");
            return res.json();
        },
        enabled: !!id,
    });

    const { data: students = [], isLoading: studentsLoading } = useQuery<any[]>({
        queryKey: ["/api/students"],
    });

    const togglePaymentMutation = useMutation({
        mutationFn: async ({ id, isPaid }: { id: string; isPaid: boolean }) => {
            await apiRequest("PATCH", `/api/classes/${id}`, { isPaid });
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["/api/classes", id] });
            queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
            queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
            toast({
                title: variables.isPaid ? "Marked as Paid" : "Marked as Unpaid",
                description: "Class payment status updated.",
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

    if (sessionLoading || studentsLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!session) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4">
                <p>Class not found</p>
                <Link href="/history">
                    <Button variant="outline">Go Back</Button>
                </Link>
            </div>
        );
    }

    const sessionStudents = session.studentIds.map((sid: string) =>
        students.find((s: any) => s.id === sid)
    ).filter(Boolean);

    if (sessionStudents.length === 0) return null;

    const mainStudentName = sessionStudents[0]?.name || "Unknown Student";
    const otherStudentsCount = sessionStudents.length - 1;
    const displayName = otherStudentsCount > 0
        ? `${mainStudentName} + ${otherStudentsCount} others`
        : mainStudentName;

    const totalEarned = sessionStudents.reduce(
        (sum: number, s: any) => sum + Math.round((s.hourlyRate || 0) * (session.durationMinutes / 60)),
        0
    );

    return (
        <div className="min-h-screen bg-muted/20 pb-24">
            <div className="bg-background border-b sticky top-0 z-10">
                <div className="p-4 flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => setLocation("/history")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-lg font-bold font-display">Class Details</h1>
                </div>
            </div>

            <div className="p-6 max-w-2xl mx-auto space-y-6">
                {/* Hero */}
                <div className="flex flex-col items-center py-6 text-center space-y-3 bg-background rounded-xl shadow-sm border p-6">
                    <div className="flex -space-x-3 justify-center">
                        {sessionStudents.map((s: any, i: number) => (
                            <div
                                key={s.id}
                                className={`h-16 w-16 rounded-full flex items-center justify-center text-white font-bold text-lg border-4 border-background ${getAvatarColor(s.name)}`}
                                style={{ zIndex: sessionStudents.length - i }}
                            >
                                {getInitials(s.name)}
                            </div>
                        ))}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">{displayName}</h2>
                        <p className="text-muted-foreground flex items-center justify-center gap-1.5 mt-2 text-sm font-medium">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(session.date), "EEEE, MMMM d, yyyy")}
                        </p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3">
                    <Card className="border-none shadow-sm bg-blue-50/50">
                        <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                            <Clock className="h-5 w-5 text-blue-500 mb-2" />
                            <span className="text-xl font-bold text-blue-700">{session.durationMinutes}</span>
                            <span className="text-xs text-blue-600/80 font-medium uppercase tracking-wide">Minutes</span>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm bg-green-50/50">
                        <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                            <DollarSign className="h-5 w-5 text-green-500 mb-2" />
                            <span className="text-xl font-bold text-green-700">${totalEarned}</span>
                            <span className="text-xs text-green-600/80 font-medium uppercase tracking-wide">Earned</span>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm bg-purple-50/50">
                        <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                            <Users className="h-5 w-5 text-purple-500 mb-2" />
                            <span className="text-xl font-bold text-purple-700">{sessionStudents.length}</span>
                            <span className="text-xs text-purple-600/80 font-medium uppercase tracking-wide">Students</span>
                        </CardContent>
                    </Card>
                </div>

                {/* Payment Status */}
                <div
                    className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all cursor-pointer ${session.isPaid
                            ? "bg-green-50 border-green-200 hover:bg-green-100"
                            : "bg-amber-50 border-amber-200 hover:bg-amber-100"
                        }`}
                    onClick={() => togglePaymentMutation.mutate({ id: session.id, isPaid: !session.isPaid })}
                >
                    <div className="flex items-center gap-4">
                        {session.isPaid ? (
                            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 shadow-sm">
                                <CheckCircle2 className="h-6 w-6" />
                            </div>
                        ) : (
                            <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shadow-sm">
                                <AlertCircle className="h-6 w-6" />
                            </div>
                        )}
                        <div className="text-left">
                            <p className={`text-lg font-bold ${session.isPaid ? "text-green-700" : "text-amber-700"}`}>
                                {session.isPaid ? "Payment Received" : "Payment Pending"}
                            </p>
                            <p className="text-sm text-muted-foreground/80 font-medium">
                                {session.isPaid ? "Tap to mark as unpaid" : "Tap to mark as paid"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Summary */}
                <Card className="border-none shadow-sm overflow-hidden">
                    <div className="bg-muted/30 px-6 py-3 border-b">
                        <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Class Summary</CardTitle>
                    </div>
                    <CardContent className="p-6">
                        <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground/90">
                            {session.summary || <span className="text-muted-foreground italic">No summary provided for this session.</span>}
                        </p>
                    </CardContent>
                </Card>

                {/* Students List */}
                <Card className="border-none shadow-sm overflow-hidden">
                    <div className="bg-muted/30 px-6 py-3 border-b">
                        <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Students in this Class</CardTitle>
                    </div>
                    <CardContent className="p-0 divide-y">
                        {sessionStudents.map((student: any) => (
                            <Link href={`/students/${student.id}`} key={student.id}>
                                <div className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors group">
                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm ${getAvatarColor(student.name)}`}>
                                        {getInitials(student.name)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm group-hover:text-primary transition-colors">{student.name}</p>
                                        <p className="text-xs text-muted-foreground">Grade {student.grade}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium">${student.hourlyRate}/hr</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
