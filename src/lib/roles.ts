"use server";

import { db } from "~src/db";
import { roles, userRoles } from "~src/db/schema";
import { ManageableRole, RoleEntity } from "../../types/roles.types";
import { and, eq } from "drizzle-orm";

export const getAllRoles = async () => {
    return (await db.select().from(roles)) as RoleEntity[];
};

export const getRoleByName = async (role: ManageableRole) => {
    return db.query.roles.findFirst({
        where: eq(roles.name, role),
    });
};

export const addRoleToUser = async (userId: number, role: ManageableRole) => {
    const roleEntity = await getRoleByName(role);

    if (!roleEntity) {
        throw new Error("Role not found");
    }

    await db.insert(userRoles).values({
        userId,
        roleId: roleEntity.id,
    });
};

export const removeRoleFromUser = async (
    userId: number,
    role: ManageableRole,
) => {
    const roleEntity = await getRoleByName(role);

    if (!roleEntity) {
        throw new Error("Role not found");
    }

    await db
        .delete(userRoles)
        .where(
            and(
                eq(userRoles.roleId, roleEntity.id),
                eq(userRoles.userId, userId),
            ),
        );
};
