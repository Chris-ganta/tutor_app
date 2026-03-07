import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Calendar, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { format, parseISO, isValid } from "date-fns";

const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return "U";
    return name.split(" ").filter(Boolean).map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U";
};

const AVATAR_COLORS = [
    "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500",
    "bg-pink-500", "bg-teal-500", "bg-indigo-500", "bg-red-500",
];

function getAvatarColor(name: string) {
    const s = name || "Unknown";
    let hash = 0;
    for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function EditClassSession() {
    const [match, params] = useRoute("/classes/:id/edit");
    const id = params?.id;
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const isInitialized = useRef<string | null>(null);

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

    const [duration, setDuration] = useState<number[]>([60]);
    const [summary, setSummary] = useState("");
    const [date, setDate] = useState("");
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [isPaid, setIsPaid] = useState(false);

    // Initialize form ONLY ONCE per session ID
    useEffect(() => {
        if (classSession && id && isInitialized.current !== id) {
            setDuration([classSession.durationMinutes || 60]);
            setSummary(classSession.summary || "");

            let dateStr = "";
            if (classSession.date) {
                try {
                    const parsedDate = typeof classSession.date === 'string' ? parseISO(classSession.date) : new Date(classSession.date);
                    if (isValid(parsedDate)) {
                        dateStr = format(parsedDate, "yyyy-MM-dd");
                    }
                } catch (e) {
                    console.error("Date parsing error", e);
                }
            }
            setDate(dateStr || format(new Date(), "yyyy-MM-dd"));
            setSelectedStudents(classSession.studentIds || []);
            setIsPaid(!!classSession.isPaid);
            isInitialized.current = id;
        }
    }, [classSession, id]);

    const updateClassMutation = useMutation({
        mutationFn: async (data: any) => {
            await apiRequest("PATCH", `/api/classes/${id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
            queryClient.invalidateQueries({ queryKey: ["/api/classes", id] });
            queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
            toast({
                title: "Class Updated",
                description: "Class session has been updated successfully.",
            });
            setLocation(`/class/${id}`);
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedStudents.length === 0) {
            toast({
                title: "No students selected",
                description: "Please select at least one student.",
                variant: "destructive"
            });
            return;
        }

        const dateObj = new Date(date);
        if (!isValid(dateObj)) {
            toast({
                title: "Invalid Date",
                description: "Please select a valid date.",
                variant: "destructive"
            });
            return;
        }

        updateClassMutation.mutate({
            durationMinutes: duration[0],
            summary,
            date: dateObj.toISOString(),
            studentIds: selectedStudents,
            isPaid,
        });
    };

    const handleToggleStudent = (sid: string) => {
        if (!sid) return;
        setSelectedStudents(prev =>
            prev.includes(sid) ? prev.filter(s => s !== sid) : [...prev, sid]
        );
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedStudents(students.map((s: any) => s.id));
        } else {
            setSelectedStudents([]);
        }
    };

    if (sessionLoading || studentsLoading) {
        return (
            <div className="min-h-screen bg-muted/20 flex items-center justify-center">
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

    return (
        <div className="min-h-screen bg-background pb-24 flex flex-col">
            <div className="bg-background p-6 border-b flex items-center gap-4 sticky top-0 z-10">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLocation(`/class/${id}`)}
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold font-display">Edit Class Session</h1>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-8">
                {/* Date Selection */}
                <section>
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Date</h2>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-3 h-5 w-5 text-muted-foreground pointer-events-none" />
                        <Input
                            type="date"
                            className="pl-12 bg-muted/30 border-none h-12 rounded-xl text-base"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                        />
                    </div>
                </section>

                {/* Attendance */}
                <section>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Attendance</h2>
                        <span className="text-xs text-primary font-medium">{selectedStudents.length}/{students.length} selected</span>
                    </div>

                    <div className="bg-muted/30 rounded-xl overflow-hidden border border-border/50">
                        {students.length > 1 && (
                            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-muted/20">
                                <Checkbox
                                    id="select-all"
                                    checked={selectedStudents.length === students.length && students.length > 0}
                                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                                />
                                <Label htmlFor="select-all" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none">
                                    Select All
                                </Label>
                            </div>
                        )}

                        {students.length === 0 && (
                            <div className="p-8 text-center text-muted-foreground italic">
                                No students found.
                            </div>
                        )}

                        {students.map((student: any) => {
                            if (!student || !student.id) return null;
                            const isSelected = selectedStudents.includes(student.id);
                            const studentName = student.name || "Unknown Student";
                            return (
                                <div
                                    key={student.id}
                                    onClick={() => handleToggleStudent(student.id)}
                                    className={`
                                        flex items-center gap-3 px-4 py-2.5 border-b border-border/30 cursor-pointer transition-colors
                                        ${isSelected ? "bg-primary/5" : "hover:bg-muted/50"}
                                    `}
                                >
                                    <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => { }} // Handled by div onClick
                                        className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground pointer-events-none"
                                    />
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0 ${getAvatarColor(studentName)}`}>
                                        {getInitials(studentName)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium leading-none truncate">{studentName}</p>
                                    </div>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">Grade {student.grade || "N/A"}</span>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Duration */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Duration</h2>
                        <span className="text-lg font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg">{(duration && duration[0]) || 0} min</span>
                    </div>
                    <div className="bg-muted/30 p-6 rounded-xl border-none">
                        <Slider
                            value={duration}
                            onValueChange={(val) => setDuration(val)}
                            max={180}
                            step={15}
                            min={15}
                            className="py-4"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-2">
                            <span>15m</span>
                            <span>1h</span>
                            <span>2h</span>
                            <span>3h</span>
                        </div>
                    </div>
                </section>

                {/* Summary & Payment */}
                <section className="space-y-6">
                    <div>
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Class Summary</h2>
                        <Textarea
                            placeholder="What did you cover in this session?"
                            className="min-h-[120px] bg-muted/30 border-none resize-none text-base p-4 rounded-xl focus-visible:ring-1"
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                        <div className="space-y-0.5">
                            <Label className="text-base font-medium">Mark as Paid</Label>
                            <p className="text-xs text-muted-foreground">Has this session been paid for?</p>
                        </div>
                        <Switch checked={isPaid} onCheckedChange={(val) => setIsPaid(val)} />
                    </div>
                </section>

                {/* Actions */}
                <div className="pt-4 pb-12">
                    <Button
                        type="submit"
                        className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20 rounded-xl"
                        disabled={updateClassMutation.isPending}
                    >
                        {updateClassMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                        )}
                        Save Changes
                    </Button>
                </div>
            </form>
        </div>
    );
}
