"use server";

import { getSession } from "~src/actions/session.action";
import { confirmPermission } from "~src/rbac/confirm-permission";
import { addRoleToUser } from "~src/lib/roles";
import { ManageableRole } from "../../../../types/roles.types";
import { revalidatePath } from "next/cache";

export async function addRoleToUserAction(
    userId: number,
    role: string,
    pathToRevalidate: string,
) {
    const user = await getSession();

    confirmPermission(user, "moderate", "roles", { role });

    await addRoleToUser(userId, role as ManageableRole);
    revalidatePath(pathToRevalidate);
}
