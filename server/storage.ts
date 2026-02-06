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
} from "../shared/schema";

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
    getStudents(): Promise<Student[]>;
    getStudent(id: string): Promise<Student | undefined>;
    createStudent(student: InsertStudent): Promise<Student>;
    updateStudent(id: string, data: Partial<Student>): Promise<Student | undefined>;
    deleteStudent(id: string): Promise<boolean>;

    getClassSessions(): Promise<ClassSession[]>;
    getClassSession(id: string): Promise<ClassSession | undefined>;
    getClassSessionsByStudent(studentId: string): Promise<ClassSession[]>;
    createClassSession(session: InsertClassSession): Promise<ClassSession>;
    updateClassSession(id: string, data: Partial<ClassSession>): Promise<ClassSession | undefined>;

    getUser(id: number): Promise<User | undefined>;
    getUserByGoogleId(googleId: string): Promise<User | undefined>;
    createUser(user: InsertUser): Promise<User>;
}

export class DatabaseStorage implements IStorage {
    async getStudents(): Promise<Student[]> {
        const db = getDb();
        return await db.select().from(students);
    }

    async getStudent(id: string): Promise<Student | undefined> {
        const db = getDb();
        const [student] = await db.select().from(students).where(eq(students.id, id));
        return student;
    }

    async createStudent(insertStudent: InsertStudent): Promise<Student> {
        const db = getDb();
        const [student] = await db.insert(students).values(insertStudent).returning();
        return student;
    }

    async updateStudent(id: string, updateData: Partial<InsertStudent>): Promise<Student | undefined> {
        const db = getDb();
        const [student] = await db
            .update(students)
            .set(updateData)
            .where(eq(students.id, id))
            .returning();
        return student;
    }


    async deleteStudent(id: string): Promise<boolean> {
        const db = getDb();
        const result = await db.delete(students).where(eq(students.id, id)).returning();
        return result.length > 0;
    }

    async getClassSessions(): Promise<ClassSession[]> {
        const db = getDb();
        return await db.select().from(classSessions).orderBy(classSessions.date);
    }

    async getClassSession(id: string): Promise<ClassSession | undefined> {
        const db = getDb();
        const [session] = await db.select().from(classSessions).where(eq(classSessions.id, id));
        return session;
    }

    async getClassSessionsByStudent(studentId: string): Promise<ClassSession[]> {
        const db = getDb();
        const allSessions = await db.select().from(classSessions).orderBy(classSessions.date);
        return allSessions.filter(s => s.studentIds.includes(studentId));
    }

    async createClassSession(insertSession: InsertClassSession): Promise<ClassSession> {
        const db = getDb();
        const [session] = await db.insert(classSessions).values(insertSession).returning();
        return session;
    }

    async updateClassSession(id: string, data: Partial<ClassSession>): Promise<ClassSession | undefined> {
        const db = getDb();
        const [session] = await db.update(classSessions).set(data).where(eq(classSessions.id, id)).returning();
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
