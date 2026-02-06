import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MobileNav } from "@/components/MobileNav";
import { Loader2 } from "lucide-react";

import Dashboard from "@/pages/Dashboard";
import StudentList from "@/pages/StudentList";
import NewStudent from "@/pages/NewStudent";
import StudentDetails from "@/pages/StudentDetails";
import EditStudent from "@/pages/EditStudent";
import ClassSession from "@/pages/ClassSession";
import EditClassSession from "@/pages/EditClassSession";
import History from "@/pages/History";
import Earnings from "@/pages/Earnings";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import { useUser } from "@/lib/auth";

function Router() {
    const { user, isLoading } = useUser();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return (
            <Switch>
                <Route path="/login" component={Login} />
                <Route path="/login" component={Login} />
                <Route component={() => <Redirect to="/login" />} />
            </Switch>
        );
    }

    return (
        <div className="pb-16 md:pb-0 min-h-screen bg-background font-sans antialiased text-foreground">
            <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/students" component={StudentList} />
                <Route path="/students/new" component={NewStudent} />
                <Route path="/students/:id" component={StudentDetails} />
                <Route path="/students/:id/edit" component={EditStudent} />
                <Route path="/class/new" component={ClassSession} />
                <Route path="/classes/:id/edit" component={EditClassSession} />
                <Route path="/history" component={History} />
                <Route path="/earnings" component={Earnings} />
                <Route path="/login">
                    <Redirect to="/" />
                </Route>
                <Route component={NotFound} />
            </Switch>
            <MobileNav />
        </div>
    );
}

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <TooltipProvider>
                <Router />
                <Toaster />
            </TooltipProvider>
        </QueryClientProvider>
    );
}

export default App;
