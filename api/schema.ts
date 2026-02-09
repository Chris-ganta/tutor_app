import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const students = pgTable("students", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: integer("user_id").notNull().references(() => users.id),
    name: text("name").notNull(),
    grade: text("grade").notNull(),
    parentName: text("parent_name").notNull(),
    parentEmail: text("parent_email").notNull(),
    parentPhone: text("parent_phone").notNull(),
    hourlyRate: integer("hourly_rate").notNull().default(50),
    balance: integer("balance").notNull().default(0),
    totalPaid: integer("total_paid").notNull().default(0),
});

export const classSessions = pgTable("class_sessions", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: integer("user_id").notNull().references(() => users.id),
    date: timestamp("date").notNull().defaultNow(),
    durationMinutes: integer("duration_minutes").notNull(),
    summary: text("summary").notNull().default(""),
    studentIds: text("student_ids").array().notNull(),
    status: text("status").notNull().default("completed"),
    isPaid: boolean("is_paid").notNull().default(false),
});

export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    googleId: text("google_id").unique().notNull(),
    email: text("email").unique().notNull(),
    name: text("name").notNull(),
    picture: text("picture"),
});

export const session = pgTable("session", {
    sid: varchar("sid").primaryKey(),
    sess: text("sess").notNull(),
    expire: timestamp("expire").notNull(),
});

export const insertStudentSchema = createInsertSchema(students).omit({ id: true, userId: true, balance: true, totalPaid: true });
export const insertClassSessionSchema = createInsertSchema(classSessions).omit({ id: true, userId: true, date: true });
export const insertUserSchema = createInsertSchema(users);

export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;

export type InsertClassSession = z.infer<typeof insertClassSessionSchema>;
export type ClassSession = typeof classSessions.$inferSelect;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
