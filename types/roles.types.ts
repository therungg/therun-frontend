import { InferSelectModel } from "drizzle-orm";
import { roles } from "~src/db/schema";
import { Role } from "./session.types";

export type RoleEntity = InferSelectModel<typeof roles> & { name: Role };
