import { Plus, Home, Users, BookOpen, DollarSign } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

export function MobileNav() {
    const [location] = useLocation();

    const navItems = [
        { icon: Home, label: "Home", href: "/" },
        { icon: Users, label: "Students", href: "/students", match: (loc: string) => loc.startsWith("/student") },
        { icon: BookOpen, label: "History", href: "/history" },
        { icon: DollarSign, label: "Earnings", href: "/earnings" },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-lg pb-safe">
            <div className="flex items-center justify-around p-2">
                {navItems.map((item) => {
                    const isActive = location === item.href || (item.match && item.match(location));

                    return (
                        <Link key={item.href} href={item.href}>
                            <div
                                className={cn(
                                    "flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 active:scale-95 gap-1",
                                    isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted"
                                )}
                            >
                                <item.icon className={cn("h-6 w-6", isActive && "stroke-[2.5px]")} />
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </div>
                        </Link>
                    );
                })}

                <Link href="/class/new">
                    <div className="flex flex-col items-center justify-center -mt-8">
                        <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-transform active:scale-95 border-4 border-background">
                            <Plus className="h-7 w-7" />
                        </div>
                        <span className="text-[10px] font-medium mt-1 text-primary">New Class</span>
                    </div>
                </Link>
            </div>
        </div>
    );
}
