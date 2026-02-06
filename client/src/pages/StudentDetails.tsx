import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Phone, Mail, Clock, DollarSign, Calendar, Loader2 } from "lucide-react";
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

export default function StudentDetails() {
    const [match, params] = useRoute("/students/:id");

    const { data: student, isLoading: studentLoading } = useQuery<any>({
        queryKey: ["/api/students", params?.id],
        enabled: !!params?.id,
    });

    const { data: studentClasses = [], isLoading: classesLoading } = useQuery<any[]>({
        queryKey: ["/api/classes/student", params?.id],
        enabled: !!params?.id,
    });

    const isLoading = studentLoading || classesLoading;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-muted/20 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loading-spinner" />
            </div>
        );
    }

    if (!student) {
        return (
            <div className="min-h-screen bg-muted/20 pb-24">
                <div className="bg-background border-b sticky top-0 z-10">
                    <div className="p-4 flex items-center gap-2">
                        <Link href="/students">
                            <Button variant="ghost" size="icon" data-testid="button-back">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <span className="font-semibold text-lg">Student Profile</span>
                    </div>
                </div>
                <div className="p-6 text-center text-muted-foreground" data-testid="text-student-not-found">
                    Student not found
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/20 pb-24">
            <div className="bg-background border-b sticky top-0 z-10">
                <div className="p-4 flex items-center gap-2">
                    <Link href="/students">
                        <Button variant="ghost" size="icon" data-testid="button-back">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <span className="font-semibold text-lg">Student Profile</span>
                    <Link href={`/students/${student.id}/edit`} className="ml-auto">
                        <Button variant="ghost" size="sm">Edit</Button>
                    </Link>
                </div>

                <div className="px-6 pb-6 flex flex-col items-center">
                    <div className={`h-24 w-24 rounded-full border-4 border-white shadow-lg mb-4 flex items-center justify-center text-white font-bold text-2xl ${getAvatarColor(student.name)}`}>
                        {getInitials(student.name)}
                    </div>
                    <h1 className="text-2xl font-bold font-display" data-testid="text-student-name">{student.name}</h1>
                    <p className="text-muted-foreground" data-testid="text-student-age">Age: {student.grade}</p>

                    <div className="flex gap-3 mt-4 w-full justify-center">
                        <Button size="sm" variant="outline" className="rounded-full gap-2" asChild data-testid="button-call-parent">
                            <a href={`tel:${student.parentPhone}`}>
                                <Phone className="h-4 w-4" /> Call Parent
                            </a>
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-full gap-2" asChild data-testid="button-email-parent">
                            <a href={`mailto:${student.parentEmail}`}>
                                <Mail className="h-4 w-4" /> Email
                            </a>
                        </Button>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <Card className="border-none shadow-sm bg-primary/5" data-testid="card-balance">
                        <CardContent className="p-4">
                            <p className="text-xs text-muted-foreground mb-1">Current Balance</p>
                            <p className={`text-xl font-bold ${student.balance > 0 ? "text-red-600" : "text-green-600"}`} data-testid="text-balance">
                                ${student.balance}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm" data-testid="card-hourly-rate">
                        <CardContent className="p-4">
                            <p className="text-xs text-muted-foreground mb-1">Hourly Rate</p>
                            <p className="text-xl font-bold" data-testid="text-hourly-rate">${student.hourlyRate}/hr</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Parent Details</h3>
                    <Card className="border-none shadow-sm">
                        <CardContent className="p-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Name</span>
                                <span className="font-medium" data-testid="text-parent-name">{student.parentName}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Phone</span>
                                <span className="font-medium" data-testid="text-parent-phone">{student.parentPhone}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Total Paid</span>
                                <span className="font-medium text-green-600" data-testid="text-total-paid">${student.totalPaid}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Class History</h3>
                    <div className="space-y-3">
                        {studentClasses.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-classes">No classes recorded yet.</p>
                        ) : (
                            studentClasses.map((session: any) => (
                                <Card key={session.id} className="border-none shadow-sm" data-testid={`card-class-${session.id}`}>
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-primary" />
                                                <span className="font-medium">{format(new Date(session.date), "MMM d, yyyy")}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                <Clock className="h-3 w-3" />
                                                <span>{session.durationMinutes}m</span>
                                            </div>
                                        </div>
                                        <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded-lg">
                                            {session.summary}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
