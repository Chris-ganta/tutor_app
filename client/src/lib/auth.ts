import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "./queryClient";
import { useToast } from "@/hooks/use-toast";

export interface User {
    id: number;
    googleId: string;
    email: string;
    name: string;
    picture?: string;
}

export function useUser() {
    const { data: user, isLoading, error } = useQuery<User | null>({
        queryKey: ["/api/user"],
        retry: false,
    });

    return {
        user,
        isLoading,
        error,
    };
}

export function useLogout() {
    const { toast } = useToast();

    return useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/logout", { method: "POST" });
            if (!res.ok) {
                throw new Error("Logout failed");
            }
        },
        onSuccess: () => {
            queryClient.setQueryData(["/api/user"], null);
            toast({
                title: "Logged out",
                description: "You have been successfully logged out",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Logout failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });
}
