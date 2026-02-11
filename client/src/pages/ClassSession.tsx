import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Clock, Send, CheckCircle2, Mail, Plus, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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

export default function ClassSession() {
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [duration, setDuration] = useState([60]);
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

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedStudents(students.map((s: any) => s.id));
        } else {
            setSelectedStudents([]);
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
            durationMinutes: duration[0],
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
                durationMinutes: duration[0],
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
        <div className="min-h-screen bg-background pb-24 flex flex-col">
            <div className="p-6 border-b flex items-center gap-4 bg-background sticky top-0 z-10">
                <Button variant="ghost" size="icon" onClick={() => setLocation("/")} data-testid="button-back">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-xl font-bold font-display">New Class Session</h1>
            </div>

            <div className="flex-1 p-6 space-y-8">
                <section>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">MARK ATTENDANCE</h2>
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

                        {students.map((student: any) => {
                            const isSelected = selectedStudents.includes(student.id);
                            return (
                                <div
                                    key={student.id}
                                    onClick={() => handleToggleStudent(student.id)}
                                    className={`
                                        flex items-center gap-3 px-4 py-2.5 border-b border-border/30 cursor-pointer transition-colors
                                        ${isSelected ? "bg-primary/5" : "hover:bg-muted/50"}
                                    `}
                                    data-testid={`row-student-${student.id}`}
                                >
                                    <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => handleToggleStudent(student.id)}
                                        className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                                    />
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0 ${getAvatarColor(student.name)}`}>
                                        {getInitials(student.name)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium leading-none truncate">{student.name}</p>
                                    </div>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">Grade {student.grade}</span>
                                </div>
                            );
                        })}

                        <Link href="/students/new">
                            <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors text-primary" data-testid="link-add-student">
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground/50">
                                    <Plus className="h-4 w-4" />
                                </div>
                                <span className="text-sm font-medium">Add Student</span>
                            </div>
                        </Link>
                    </div>
                </section>

                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Duration</h2>
                        <span className="text-lg font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg" data-testid="text-duration">{duration[0]} min</span>
                    </div>
                    <Card className="border-none bg-muted/30 shadow-none">
                        <CardContent className="pt-6">
                            <Slider
                                value={duration}
                                onValueChange={setDuration}
                                max={180}
                                step={15}
                                min={15}
                                className="py-4"
                                data-testid="slider-duration"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground mt-2">
                                <span>15m</span>
                                <span>1h</span>
                                <span>2h</span>
                                <span>3h</span>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                <section className="space-y-6">
                    <div>
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Class Summary</h2>
                        <Textarea
                            placeholder="What did you cover today? (Sent to parents)"
                            className="min-h-[120px] bg-muted/30 border-none resize-none text-base p-4 rounded-xl focus-visible:ring-1"
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            data-testid="input-summary"
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                        <div className="space-y-0.5">
                            <Label className="text-base font-medium">Paid Immediately?</Label>
                            <p className="text-xs text-muted-foreground">Mark this session as already paid</p>
                        </div>
                        <Switch checked={isPaid} onCheckedChange={setIsPaid} data-testid="switch-paid" />
                    </div>
                </section>
            </div>

            <div className="p-6 border-t bg-background space-y-3 sticky bottom-0 z-10 pb-10">
                <Button
                    className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20 rounded-xl"
                    onClick={handleLogClass}
                    disabled={createClassMutation.isPending}
                    data-testid="button-log-class"
                >
                    {createClassMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    Log Class
                </Button>
                <Button
                    variant="outline"
                    className="w-full h-12 text-base font-semibold rounded-xl"
                    onClick={handleNotifyParents}
                    data-testid="button-notify-parents"
                >
                    <Mail className="w-4 h-4 mr-2" />
                    Notify Parents
                </Button>
            </div>

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
                                Hi! Just letting you know we completed a {duration[0]} min session today.
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
