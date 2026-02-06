import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, DollarSign, Clock, CheckCircle2, Loader2, Calendar } from "lucide-react";
import { format } from "date-fns";

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

export default function Earnings() {
    const { data: stats, isLoading: statsLoading } = useQuery<{ totalStudents: number; classesThisWeek: number; revenueThisMonth: number; unpaidCount: number }>({
        queryKey: ["/api/stats"],
    });

    const { data: classes, isLoading: classesLoading } = useQuery<any[]>({
        queryKey: ["/api/classes"],
    });

    const { data: students, isLoading: studentsLoading } = useQuery<any[]>({
        queryKey: ["/api/students"],
    });

    const isLoading = statsLoading || classesLoading || studentsLoading;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-muted/20 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loading-spinner" />
            </div>
        );
    }

    const revenueThisMonth = stats?.revenueThisMonth ?? 0;
    const unpaidCount = stats?.unpaidCount ?? 0;
    const allClasses = classes || [];
    const allStudents = students || [];

    const paidClasses = allClasses.filter(c => c.isPaid);
    const unpaidClasses = allClasses.filter(c => !c.isPaid);

    const totalEarned = allClasses.reduce((sum: number, c: any) => {
        let sessionTotal = 0;
        for (const sid of c.studentIds) {
            const student = allStudents.find((s: any) => s.id === sid);
            if (student) {
                sessionTotal += (student.hourlyRate * c.durationMinutes) / 60;
            }
        }
        return sum + sessionTotal;
    }, 0);

    const totalPaid = paidClasses.reduce((sum: number, c: any) => {
        let sessionTotal = 0;
        for (const sid of c.studentIds) {
            const student = allStudents.find((s: any) => s.id === sid);
            if (student) {
                sessionTotal += (student.hourlyRate * c.durationMinutes) / 60;
            }
        }
        return sum + sessionTotal;
    }, 0);

    const totalUnpaid = totalEarned - totalPaid;

    return (
        <div className="min-h-screen bg-muted/20 pb-24">
            <div className="bg-background pt-8 pb-4 px-6 border-b">
                <h1 className="text-2xl font-bold font-display">Earnings</h1>
            </div>

            <div className="p-6 space-y-6">
                <Card className="bg-primary text-primary-foreground border-none shadow-md overflow-hidden relative" data-testid="card-revenue">
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 -ml-8 -mb-8 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>

                    <CardContent className="p-6 relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                <DollarSign className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full text-white backdrop-blur-sm flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" /> This month
                            </span>
                        </div>
                        <div className="space-y-1">
                            <p className="text-3xl font-bold text-white" data-testid="text-revenue">${revenueThisMonth}</p>
                            <p className="text-blue-100 text-sm">Earned this month</p>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                    <Card className="border-none shadow-sm" data-testid="card-total-paid">
                        <CardContent className="p-4">
                            <div className="h-8 w-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-2">
                                <CheckCircle2 className="h-4 w-4" />
                            </div>
                            <p className="text-xl font-bold text-green-600" data-testid="text-total-paid">${Math.round(totalPaid)}</p>
                            <p className="text-xs text-muted-foreground">Collected</p>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm" data-testid="card-total-unpaid">
                        <CardContent className="p-4">
                            <div className="h-8 w-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-2">
                                <Clock className="h-4 w-4" />
                            </div>
                            <p className="text-xl font-bold text-amber-600" data-testid="text-total-unpaid">${Math.round(totalUnpaid)}</p>
                            <p className="text-xs text-muted-foreground">{unpaidCount} unpaid</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-4">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">All Sessions</h2>

                    {allClasses.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No earnings yet.</p>
                            <p className="text-xs mt-1">Log your first class to start tracking.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {allClasses.map((session: any) => {
                                const student = allStudents.find((s: any) => s.id === session.studentIds[0]);
                                const studentName = student?.name || "Unknown Student";
                                const sessionEarned = student ? Math.round((student.hourlyRate * session.durationMinutes) / 60) : 0;

                                return (
                                    <Card key={session.id} className="border-none shadow-sm" data-testid={`card-earning-${session.id}`}>
                                        <CardContent className="p-4 flex items-center gap-3">
                                            <div className={`h-10 w-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-semibold text-sm ${getAvatarColor(studentName)}`}>
                                                {getInitials(studentName)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-sm truncate">{studentName}</h4>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {format(new Date(session.date), "MMM d")} · {session.durationMinutes} min
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-sm">${sessionEarned}</p>
                                                <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${session.isPaid
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-amber-100 text-amber-700"
                                                    }`}>
                                                    {session.isPaid ? "Paid" : "Pending"}
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
