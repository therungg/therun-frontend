export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        const { migrate } = await import("drizzle-orm/node-postgres/migrator");
        const { db } = await import("./src/db/index");
        await migrate(db, { migrationsFolder: "./drizzle/" });
    }
}
