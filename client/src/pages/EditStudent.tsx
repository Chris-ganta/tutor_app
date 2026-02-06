import { useRoute, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StudentForm } from "@/components/StudentForm";

export default function EditStudent() {
    const [match, params] = useRoute("/students/:id/edit");
    const [, setLocation] = useLocation();
    const { toast } = useToast();

    const { data: student, isLoading } = useQuery<any>({
        queryKey: ["/api/students", params?.id],
        enabled: !!params?.id,
    });

    const updateStudentMutation = useMutation({
        mutationFn: async (data: any) => {
            await apiRequest("PATCH", `/api/students/${params?.id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/students"] });
            queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
            queryClient.invalidateQueries({ queryKey: ["/api/students", params?.id] });
            toast({
                title: "Student Updated",
                description: "Student details have been saved.",
            });
            setLocation(`/students/${params?.id}`);
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-muted/20 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!student) {
        return <div>Student not found</div>;
    }

    return (
        <div className="min-h-screen bg-muted/20 pb-24">
            <div className="bg-background pt-8 pb-4 px-6 border-b sticky top-0 z-10 flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLocation(`/students/${params?.id}`)}
                    data-testid="button-back"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-xl font-bold font-display">Edit Student</h1>
            </div>

            <StudentForm
                initialData={student}
                onSubmit={(data) => updateStudentMutation.mutate(data)}
                isSubmitting={updateStudentMutation.isPending}
                submitLabel="Save Changes"
            />
        </div>
    );
}
