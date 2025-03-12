import { db } from "~src/db";
import { roles, userRoles, users } from "~src/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { PaginatedData } from "~src/components/pagination/pagination.types";
import { Role } from "../../types/session.types";
import { UserWithRoles } from "../../types/users.types";

export async function getPaginatedUsers(
    page = 1,
    pageSize = 10,
    search = "",
    role = "",
): Promise<PaginatedData<UserWithRoles>> {
    const offset = (page - 1) * pageSize;
    const lowerSearch = search.toLowerCase();

    const conditions = [];

    if (search) {
        conditions.push(
            sql`LOWER(${users.username}) LIKE ${"%" + lowerSearch + "%"}`,
        );
    }

    if (role) {
        conditions.push(sql`EXISTS (
                               SELECT 1
                               FROM ${userRoles} ur
                                        JOIN ${roles} r ON ur."roleId" = r.id
                               WHERE ur."userId" = ${users.id} AND r.name = ${role}
                           )`);
    }

    const result = await db
        .select({
            id: users.id,
            username: users.username,
            roles: sql<
                Role[]
            >`COALESCE(JSON_AGG(${roles.name}) FILTER (WHERE ${roles.name} IS NOT NULL), '[]')`,
        })
        .from(users)
        .leftJoin(userRoles, eq(users.id, userRoles.userId))
        .leftJoin(roles, eq(userRoles.roleId, roles.id))
        .where(and(...conditions))
        .groupBy(users.id)
        .orderBy(
            sql`CASE WHEN COUNT(${roles.name}) = 0 THEN 1 ELSE 0 END`,
            users.username,
        )
        .limit(pageSize)
        .offset(offset);

    const [{ count }] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(users)
        .where(and(...conditions));

    const totalPages = Math.ceil(count / pageSize);

    return {
        items: result,
        totalPages,
        totalItems: count,
        page,
        pageSize,
    };
}

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
