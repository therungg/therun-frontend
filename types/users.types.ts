import { InferSelectModel } from "drizzle-orm";
import { users } from "~src/db/schema";
import { Role } from "./session.types";

export type User = InferSelectModel<typeof users>;
export type UserWithRoles = User & { roles: Role[] };
