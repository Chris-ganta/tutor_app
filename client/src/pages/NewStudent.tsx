import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StudentForm } from "@/components/StudentForm";

export default function NewStudent() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();

    const createStudentMutation = useMutation({
        mutationFn: async (data: any) => {
            await apiRequest("POST", "/api/students", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/students"] });
            queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
            toast({
                title: "Student Added",
                description: "Successfully added new student to your roster.",
            });
            setLocation("/students");
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    return (
        <div className="min-h-screen bg-muted/20 pb-24">
            <div className="bg-background pt-8 pb-4 px-6 border-b sticky top-0 z-10 flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => setLocation("/students")} data-testid="button-back">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-xl font-bold font-display">Add New Student</h1>
            </div>

            <StudentForm
                onSubmit={(data) => createStudentMutation.mutate(data)}
                isSubmitting={createStudentMutation.isPending}
            />
        </div>
    );
}
