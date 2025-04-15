"use server";

import { getSession } from "~src/actions/session.action";
import { confirmPermission } from "~src/rbac/confirm-permission";
import { addRoleToUser } from "~src/lib/roles";
import { ManageableRole } from "../../../../types/roles.types";
import { revalidatePath } from "next/cache";
import { insertLog } from "~src/lib/logs";
import { getOrCreateUser } from "~src/lib/users";

export async function addRoleToUserAction(
    userId: number,
    role: string,
    pathToRevalidate: string,
) {
    const user = await getSession();

    confirmPermission(user, "moderate", "roles", { role });

    await addRoleToUser(userId, role as ManageableRole);
    await insertLog({
        userId: await getOrCreateUser(user.username),
        action: "add-role",
        entity: "user",
        target: role,
        data: { userId, role },
    });

    revalidatePath(pathToRevalidate);
}
