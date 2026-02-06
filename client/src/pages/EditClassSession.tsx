import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function EditClassSession() {
    const [match, params] = useRoute("/classes/:id/edit");
    const [, setLocation] = useLocation();
    const { toast } = useToast();

    const { data: classSession, isLoading } = useQuery<any>({
        queryKey: [`/api/classes/${params?.id}`],
        enabled: !!params?.id,
    });

    const [duration, setDuration] = useState("");
    const [summary, setSummary] = useState("");

    // Initialize form when data loads
    useEffect(() => {
        if (classSession) {
            setDuration(classSession.durationMinutes.toString());
            setSummary(classSession.summary);
        }
    }, [classSession]);

    const updateClassMutation = useMutation({
        mutationFn: async (data: any) => {
            await apiRequest("PATCH", `/api/classes/${params?.id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
            queryClient.invalidateQueries({ queryKey: [`/api/classes/${params?.id}`] });
            queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
            toast({
                title: "Class Updated",
                description: "Class session has been updated successfully.",
            });
            setLocation("/history");
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
        updateClassMutation.mutate({
            durationMinutes: parseInt(duration),
            summary,
        });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-muted/20 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!classSession) {
        return <div>Class session not found</div>;
    }

    return (
        <div className="min-h-screen bg-muted/20 pb-24">
            <div className="bg-background pt-8 pb-4 px-6 border-b sticky top-0 z-10 flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLocation("/history")}
                    data-testid="button-back"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-xl font-bold font-display">Edit Class Session</h1>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                        id="duration"
                        type="number"
                        placeholder="60"
                        required
                        value={duration || (classSession ? classSession.durationMinutes : "")}
                        onChange={(e) => setDuration(e.target.value)}
                        data-testid="input-duration"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="summary">Summary</Label>
                    <Textarea
                        id="summary"
                        placeholder="What did you cover in this session?"
                        required
                        rows={6}
                        value={summary || (classSession ? classSession.summary : "")}
                        onChange={(e) => setSummary(e.target.value)}
                        data-testid="input-summary"
                        className="resize-none"
                    />
                </div>

                <div className="pt-4">
                    <Button
                        type="submit"
                        className="w-full h-11 text-base shadow-lg shadow-primary/20"
                        disabled={updateClassMutation.isPending}
                        data-testid="button-save-class"
                    >
                        {updateClassMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
