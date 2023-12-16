import {
    AbilityBuilder,
    CreateAbility,
    createMongoAbility,
    ForcedSubject,
    MongoAbility,
} from "@casl/ability";
import { Role, User } from "../../types/session.types";

export const actions = [
    "create",
    "edit",
    "delete",
    "ban",
    "style",
    "view-restricted",
] as const;
export const subjects = [
    "user",
    "run",
    "race",
    "game",
    "leaderboard",
    "moderators",
] as const;
type AppAbilities = [
    (typeof actions)[number],
    (
        | (typeof subjects)[number]
        | ForcedSubject<Exclude<(typeof subjects)[number], "all">>
    )
];

export type AppAbility = MongoAbility<AppAbilities>;
export const createAppAbility = createMongoAbility as CreateAbility<AppAbility>;

type DefinePermissions = (
    // eslint-disable-next-line no-unused-vars
    user: User,
    // eslint-disable-next-line no-unused-vars
    builder: AbilityBuilder<AppAbility>
) => void;

const rolePermissions: Record<Role, DefinePermissions> = {
    admin(user, { can }) {
        actions.forEach((action) => {
            subjects.forEach((subject) => {
                can(action, subject);
            });
        });
    },
    patreon1(user, { can }) {
        can("style", "user");
    },
    patreon2(user, { can }) {
        can("style", "user");
    },
    patreon3(user, { can }) {
        can("style", "user");
    },
    moderator(user, { can }) {
        can("ban", "user");
        can("ban", "run");
        can("edit", "run");
    },
    "board-admin": function (user, { can }) {
        can("edit", "leaderboard");
        can("edit", "moderators");
    },
    "board-moderator": function (user, { can }) {
        can("edit", "leaderboard");
    },
    "race-admin": function (user, { can }) {
        actions.forEach((action) => {
            can(action, "race");
        });
    },
};

const defaultPermissions: DefinePermissions = (user, { can }) => {
    const moderatedGames = user.moderatedGames || [];
    actions.forEach((action) => {
        moderatedGames.forEach((game) => {
            can(action, "leaderboard", { game });
        });
        can(action, "user", { user: user.username });
        can(action, "run", { run: user.username });
        can(action, "race", { creator: user.username });
        can("create", "race");
    });
};

export function defineAbilityFor(user?: User): AppAbility {
    const builder = new AbilityBuilder(createAppAbility);

    if (!user || !user.username) return builder.build();

    const userRoles = user.roles || [];

    userRoles?.forEach((role) => {
        rolePermissions[role](user, builder);
    });

    defaultPermissions(user, builder);

    return builder.build();
}
