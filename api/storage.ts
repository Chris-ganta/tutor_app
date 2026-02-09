import { eq } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
    students,
    classSessions,
    users,
    type Student,
    type InsertStudent,
    type ClassSession,
    type InsertClassSession,
    type User,
    type InsertUser,
} from "./schema.js";

// Lazy initialize pool and db
let poolInstance: pg.Pool | null = null;
let dbInstance: NodePgDatabase<any> | null = null;

export function getPool() {
    if (!poolInstance) {
        poolInstance = new pg.Pool({
            connectionString: process.env.DATABASE_URL,
        });

        // Error handling for the pool
        poolInstance.on('error', (err) => {
            console.error('Unexpected error on idle client', err);
        });
    }
    return poolInstance;
}

export function getDb() {
    if (!dbInstance) {
        dbInstance = drizzle(getPool());
    }
    return dbInstance;
}

export interface IStorage {
    getStudents(userId: number): Promise<Student[]>;
    getStudent(id: string, userId: number): Promise<Student | undefined>;
    createStudent(student: InsertStudent & { userId: number }): Promise<Student>;
    updateStudent(id: string, userId: number, data: Partial<Student>): Promise<Student | undefined>;
    deleteStudent(id: string, userId: number): Promise<boolean>;

    getClassSessions(userId: number): Promise<ClassSession[]>;
    getClassSession(id: string, userId: number): Promise<ClassSession | undefined>;
    getClassSessionsByStudent(studentId: string, userId: number): Promise<ClassSession[]>;
    createClassSession(session: InsertClassSession & { userId: number }): Promise<ClassSession>;
    updateClassSession(id: string, userId: number, data: Partial<ClassSession>): Promise<ClassSession | undefined>;

    getUser(id: number): Promise<User | undefined>;
    getUserByGoogleId(googleId: string): Promise<User | undefined>;
    createUser(user: InsertUser): Promise<User>;
}

import { and } from "drizzle-orm";

export class DatabaseStorage implements IStorage {
    async getStudents(userId: number): Promise<Student[]> {
        const db = getDb();
        return await db.select().from(students).where(eq(students.userId, userId));
    }

    async getStudent(id: string, userId: number): Promise<Student | undefined> {
        const db = getDb();
        const [student] = await db.select().from(students).where(
            and(eq(students.id, id), eq(students.userId, userId))
        );
        return student;
    }

    async createStudent(insertStudent: InsertStudent & { userId: number }): Promise<Student> {
        const db = getDb();
        const [student] = await db.insert(students).values(insertStudent).returning();
        return student;
    }

    async updateStudent(id: string, userId: number, updateData: Partial<Student>): Promise<Student | undefined> {
        const db = getDb();
        const [student] = await db
            .update(students)
            .set(updateData)
            .where(and(eq(students.id, id), eq(students.userId, userId)))
            .returning();
        return student;
    }


    async deleteStudent(id: string, userId: number): Promise<boolean> {
        const db = getDb();
        const result = await db.delete(students).where(
            and(eq(students.id, id), eq(students.userId, userId))
        ).returning();
        return result.length > 0;
    }

    async getClassSessions(userId: number): Promise<ClassSession[]> {
        const db = getDb();
        return await db.select().from(classSessions)
            .where(eq(classSessions.userId, userId))
            .orderBy(classSessions.date);
    }

    async getClassSession(id: string, userId: number): Promise<ClassSession | undefined> {
        const db = getDb();
        const [session] = await db.select().from(classSessions).where(
            and(eq(classSessions.id, id), eq(classSessions.userId, userId))
        );
        return session;
    }

    async getClassSessionsByStudent(studentId: string, userId: number): Promise<ClassSession[]> {
        const db = getDb();
        const sessions = await db.select().from(classSessions).where(
            and(eq(classSessions.userId, userId))
        ).orderBy(classSessions.date);
        return sessions.filter(s => s.studentIds.includes(studentId));
    }

    async recalculateStudentBalance(studentId: string, userId: number): Promise<void> {
        const db = getDb();
        const student = await this.getStudent(studentId, userId);
        if (!student) return;

        const sessions = await this.getClassSessionsByStudent(studentId, userId);
        const unpaidSessions = sessions.filter(s => !s.isPaid);

        let newBalance = 0;
        let newTotalPaid = 0; // If we tracked payments separately, but for now let's just focus on balance = outstanding

        // Calculate outstanding balance
        for (const session of unpaidSessions) {
            newBalance += (student.hourlyRate * session.durationMinutes) / 60;
        }

        // Calculate total paid (sum of paid sessions)
        const paidSessions = sessions.filter(s => s.isPaid);
        for (const session of paidSessions) {
            newTotalPaid += (student.hourlyRate * session.durationMinutes) / 60;
        }

        await this.updateStudent(studentId, userId, {
            balance: Math.round(newBalance),
            totalPaid: Math.round(newTotalPaid)
        });
    }

    async createClassSession(insertSession: InsertClassSession & { userId: number }): Promise<ClassSession> {
        const db = getDb();
        const [session] = await db.insert(classSessions).values(insertSession).returning();

        // Recalculate balance for all students in this session
        for (const studentId of session.studentIds) {
            await this.recalculateStudentBalance(studentId, insertSession.userId);
        }

        return session;
    }

    async updateClassSession(id: string, userId: number, data: Partial<ClassSession>): Promise<ClassSession | undefined> {
        const db = getDb();
        const [session] = await db.update(classSessions).set(data).where(
            and(eq(classSessions.id, id), eq(classSessions.userId, userId))
        ).returning();

        if (session) {
            // Recalculate balance for all students in this session
            for (const studentId of session.studentIds) {
                await this.recalculateStudentBalance(studentId, userId);
            }
        }

        return session;
    }

    async getUser(id: number): Promise<User | undefined> {
        const db = getDb();
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user;
    }

    async getUserByGoogleId(googleId: string): Promise<User | undefined> {
        const db = getDb();
        const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
        return user;
    }

    async createUser(insertUser: InsertUser): Promise<User> {
        const db = getDb();
        const [user] = await db.insert(users).values(insertUser).returning();
        return user;
    }
}

export const storage = new DatabaseStorage();
export { poolInstance as pool }; // For compatibility, though it will be null initially
