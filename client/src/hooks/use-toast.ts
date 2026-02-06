import { useState, useEffect } from "react";

type ToastProps = {
    id: string;
    title?: string;
    description?: string;
    action?: React.ReactNode;
    variant?: "default" | "destructive";
};

let listeners: Array<(toasts: ToastProps[]) => void> = [];
let memoryToasts: ToastProps[] = [];

function dispatch(action: { type: "ADD_TOAST"; toast: ToastProps } | { type: "dismiss"; toastId?: string }) {
    if (action.type === "ADD_TOAST") {
        memoryToasts = [action.toast, ...memoryToasts].slice(0, 1);
    } else if (action.type === "dismiss") {
        memoryToasts = memoryToasts.filter((t) => t.id !== action.toastId);
    }
    listeners.forEach((listener) => listener(memoryToasts));
}

function toast({ ...props }: Omit<ToastProps, "id">) {
    const id = Math.random().toString(36).substring(2, 9);
    dispatch({
        type: "ADD_TOAST",
        toast: { ...props, id },
    });
    return {
        id,
        dismiss: () => dispatch({ type: "dismiss", toastId: id }),
    };
}

function useToast() {
    const [toasts, setToasts] = useState<ToastProps[]>(memoryToasts);

    useEffect(() => {
        listeners.push(setToasts);
        return () => {
            listeners = listeners.filter((l) => l !== setToasts);
        };
    }, []);

    return {
        toast,
        dismiss: (toastId?: string) => dispatch({ type: "dismiss", toastId }),
        toasts,
    };
}

export { useToast, toast };
