import { db } from "~src/db";
import { roles } from "~src/db/schema";
import { RoleEntity } from "../../types/roles.types";

export const getAllRoles = async () => {
    return (await db.select().from(roles)) as RoleEntity[];
};
