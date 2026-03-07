"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Plus, Search } from "lucide-react"
import { useState, useMemo } from "react"
import { Link } from "wouter"

interface Student {
    id: string
    name: string
    grade: number | string
    selected: boolean
}

interface StudentListProps {
    students: Student[]
    onToggle: (id: string) => void
    hideAdd?: boolean
    hideSearch?: boolean
}

const AVATAR_COLORS = [
    "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500",
    "bg-pink-500", "bg-teal-500", "bg-indigo-500", "bg-red-500",
]

function getAvatarColor(name: string) {
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(name: string) {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
}

export function StudentList({ students, onToggle, hideAdd = false, hideSearch = false }: StudentListProps) {
    const [search, setSearch] = useState("")

    const filtered = useMemo(() => {
        if (!search.trim()) return students
        const q = search.toLowerCase()
        return students.filter((s) => s.name.toLowerCase().includes(q))
    }, [students, search])

    const selectedCount = students.filter((s) => s.selected).length

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Students
                </h3>
                {selectedCount > 0 && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {selectedCount} selected
                    </span>
                )}
            </div>

            <div className="rounded-xl bg-card overflow-hidden border border-border/50">
                {/* Search bar - appears when list has more than 3 students and not hidden */}
                {!hideSearch && students.length > 3 && (
                    <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2">
                        <Search className="size-3.5 text-muted-foreground shrink-0" />
                        <input
                            type="text"
                            placeholder="Search students..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-transparent text-sm text-card-foreground placeholder:text-muted-foreground outline-none"
                        />
                    </div>
                )}

                {/* Scrollable student list capped at max-h-52 */}
                <div className="max-h-52 overflow-y-auto">
                    {filtered.length === 0 && (
                        <p className="px-4 py-3 text-sm text-muted-foreground text-center">
                            No students found
                        </p>
                    )}
                    {filtered.map((student, index) => (
                        <div key={student.id}>
                            <div
                                role="button"
                                tabIndex={0}
                                onClick={() => onToggle(student.id)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault()
                                        onToggle(student.id)
                                    }
                                }}
                                className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-secondary/50 transition-colors"
                                data-testid={`row-student-${student.id}`}
                            >
                                <Checkbox
                                    checked={student.selected}
                                    tabIndex={-1}
                                    onCheckedChange={() => onToggle(student.id)}
                                    className="rounded-full"
                                />
                                <Avatar className="h-7 w-7">
                                    <AvatarFallback
                                        className={`${getAvatarColor(student.name)} text-white text-[11px] font-semibold`}
                                    >
                                        {getInitials(student.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium text-card-foreground">
                                    {student.name}
                                </span>
                                <span className="ml-auto text-xs text-muted-foreground">
                                    {"Grade " + student.grade}
                                </span>
                            </div>
                            {index < filtered.length - 1 && (
                                <div className="mx-4 border-b border-border/50" />
                            )}
                        </div>
                    ))}
                </div>

                {/* Add student action - hidden if hideAdd is true */}
                {!hideAdd && (
                    <div className="border-t border-border/50">
                        <Link href="/students/new">
                            <div
                                className="flex w-full items-center gap-3 px-4 py-2.5 text-primary hover:bg-secondary/50 transition-colors cursor-pointer"
                                data-testid="link-add-student"
                            >
                                <Plus className="size-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Add Student</span>
                            </div>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}
