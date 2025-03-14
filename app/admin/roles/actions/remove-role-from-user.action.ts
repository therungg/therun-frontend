"use server";

import { getSession } from "~src/actions/session.action";
import { removeRoleFromUser } from "~src/lib/roles";
import { ManageableRole } from "../../../../types/roles.types";
import { revalidatePath } from "next/cache";
import { confirmPermission } from "~src/rbac/confirm-permission";

export async function removeRoleFromUserAction(
    userId: number,
    role: string,
    pathToRevalidate: string,
) {
    const user = await getSession();

    confirmPermission(user, "moderate", "roles", { role });

    await removeRoleFromUser(userId, role as ManageableRole);
    revalidatePath(pathToRevalidate);
}
