import { db } from "~src/db";
import { roles, userRoles, users } from "~src/db/schema";
import { eq } from "drizzle-orm";

export async function getOrCreateUser(username: string): Promise<number> {
    let user = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1)
        .then((res) => res[0]);

    if (!user) {
        const inserted = await db
            .insert(users)
            .values({ username })
            .returning();
        user = inserted[0];
    }

    return user.id;
}

export async function getUserRoles(userId: number) {
    const roleRows = await db
        .select({ roleName: roles.name })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, userId));

    return roleRows.map((row) => row.roleName);
}
