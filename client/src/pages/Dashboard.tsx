import { useUser, useLogout } from "@/lib/auth";
import { Users, Calendar, ArrowRight, Loader2, LogOut } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "wouter";

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

export default function Dashboard() {
    const { user } = useUser();
    const logoutMutation = useLogout();

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

    const totalStudents = stats?.totalStudents ?? 0;
    const classesThisWeek = stats?.classesThisWeek ?? 0;

    const recentClasses = (classes || []).slice(0, 5);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-muted/20 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loading-spinner" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/20 pb-24">
            <div className="bg-background pt-8 pb-6 px-6 border-b">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h1 className="text-2xl font-bold font-display text-primary" data-testid="text-app-title">TutorTrack</h1>
                        <p className="text-sm text-muted-foreground">Good afternoon, {user?.name.split(" ")[0] || "Coach"}!</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {user?.picture ? (
                            <img src={user.picture} alt={user.name} className="h-10 w-10 rounded-full border border-border" />
                        ) : (
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                {getInitials(user?.name || "Coach")}
                            </div>
                        )}
                        <button
                            onClick={() => logoutMutation.mutate()}
                            className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors"
                            title="Log out"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <Link href="/students">
                        <Card className="bg-background border-none shadow-sm active:scale-95 transition-transform cursor-pointer" data-testid="card-total-students">
                            <CardContent className="p-4 flex flex-col justify-between h-full">
                                <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-2">
                                    <Users className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold" data-testid="text-total-students">{totalStudents}</p>
                                    <p className="text-xs text-muted-foreground">Active Students</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/history">
                        <Card className="bg-background border-none shadow-sm active:scale-95 transition-transform cursor-pointer" data-testid="card-classes-week">
                            <CardContent className="p-4 flex flex-col justify-between h-full">
                                <div className="h-8 w-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-2">
                                    <Calendar className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold" data-testid="text-classes-week">{classesThisWeek}</p>
                                    <p className="text-xs text-muted-foreground">Classes this week</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold font-display">Recent Classes</h2>
                        <Link href="/history" className="text-xs font-medium text-primary flex items-center gap-1" data-testid="link-view-all-history">
                            View all <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>

                    {recentClasses.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground" data-testid="text-no-classes">
                            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No classes recorded yet.</p>
                            <p className="text-xs mt-1">Log your first class session to get started!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentClasses.map((session: any) => {
                                const student = (students || []).find((s: any) => s.id === session.studentIds[0]);
                                const studentName = student?.name || "Unknown Student";
                                return (
                                    <Link key={session.id} href={`/class/${session.id}`}>
                                        <Card className="border-none shadow-sm overflow-hidden hover:opacity-90 transition-opacity cursor-pointer" data-testid={`card-class-${session.id}`}>
                                            <div className="flex">
                                                <div className="w-1.5 bg-primary"></div>
                                                <CardContent className="p-4 flex-1 flex items-center gap-4">
                                                    <div className={`h-10 w-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-semibold text-sm ${getAvatarColor(studentName)}`}>
                                                        {getInitials(studentName)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-semibold text-sm truncate" data-testid={`text-class-student-${session.id}`}>{studentName}</h4>
                                                        <p className="text-xs text-muted-foreground truncate">{session.summary}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-medium">{format(new Date(session.date), "MMM d")}</p>
                                                        <p className="text-xs text-muted-foreground">{session.durationMinutes} min</p>
                                                    </div>
                                                </CardContent>
                                            </div>
                                        </Card>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
