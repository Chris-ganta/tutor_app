import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Mail, Phone, ChevronRight, Plus, Loader2, Users } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

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

export default function StudentList() {
    const [search, setSearch] = useState("");

    const { data: students = [], isLoading } = useQuery<any[]>({
        queryKey: ["/api/students"],
    });

    const filteredStudents = students.filter((s: any) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.grade.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-muted/20 pb-24">
            <div className="bg-background pt-8 pb-4 px-6 border-b sticky top-0 z-10">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold font-display" data-testid="text-students-title">Students</h1>
                    <Link href="/students/new">
                        <Button size="sm" className="h-9 px-4 rounded-full shadow-sm" data-testid="button-add-student">
                            <Plus className="h-4 w-4 mr-1.5" /> Add Student
                        </Button>
                    </Link>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search students..."
                        className="pl-9 bg-muted/50 border-none h-11"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        data-testid="input-search-students"
                    />
                </div>
            </div>

            <div className="p-6 space-y-4">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loading-spinner" />
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground" data-testid="text-no-students">
                        <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">{search ? "No students match your search." : "No students yet."}</p>
                        {!search && <p className="text-xs mt-1">Add your first student to get started!</p>}
                    </div>
                ) : (
                    filteredStudents.map((student: any) => (
                        <Link href={`/students/${student.id}`} key={student.id}>
                            <Card className="border-none shadow-sm mb-3 active:scale-[0.99] transition-transform" data-testid={`card-student-${student.id}`}>
                                <CardContent className="p-4 flex items-center gap-4">
                                    <div className={`h-12 w-12 rounded-full border-2 border-background shadow-sm flex items-center justify-center text-white font-semibold text-sm ${getAvatarColor(student.name)}`}>
                                        {getInitials(student.name)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-base" data-testid={`text-student-name-${student.id}`}>{student.name}</h4>
                                        <p className="text-xs text-muted-foreground">Age: {student.grade}</p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className={`text-xs px-2 py-1 rounded-full font-medium ${student.balance > 0
                                            ? "bg-red-100 text-red-700"
                                            : student.balance < 0
                                                ? "bg-green-100 text-green-700"
                                                : "bg-gray-100 text-gray-700"
                                            }`} data-testid={`status-balance-${student.id}`}>
                                            {student.balance > 0 ? `Due: $${student.balance}` : "Paid"}
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
