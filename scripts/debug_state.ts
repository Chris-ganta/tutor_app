
import { getPool } from "../api/storage";
import { students, classSessions, users } from "../api/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../api/schema";

async function main() {
    const pool = getPool();
    const db = drizzle(pool, { schema });

    console.log("--- Users ---");
    const allUsers = await db.query.users.findMany();
    console.log(JSON.stringify(allUsers, null, 2));

    console.log("\n--- Students ---");
    const allStudents = await db.query.students.findMany();
    console.log(JSON.stringify(allStudents, null, 2));

    console.log("\n--- Class Sessions ---");
    const allSessions = await db.query.classSessions.findMany();
    console.log(JSON.stringify(allSessions, null, 2));

    pool.end();
}

main().catch(console.error);
