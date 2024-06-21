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
    "join",
    "edit",
    "delete",
    "ban",
    "style",
    "view-restricted",
    "moderate",
] as const;
export const subjects = [
    "user",
    "run",
    "race",
    "game",
    "leaderboard",
    "moderators",
] as const;
type AllowedActions = (typeof actions)[number];
type AllowedSubjects = (typeof subjects)[number];
type AppAbilities = [
    AllowedActions,
    (
        | AllowedSubjects
        | ForcedSubject<AllowedSubjects>
        | ForcedSubject<{ [key in AllowedSubjects]?: string }>
    ),
];

export type AppAbility = MongoAbility<AppAbilities>;
export const createAppAbility = createMongoAbility as CreateAbility<AppAbility>;

type DefinePermissions = (
    user: User,
    builder: AbilityBuilder<AppAbility>,
) => void;

const rolePermissions: Record<Role, DefinePermissions> = {
    admin(_user, { can }) {
        actions.forEach((action) => {
            subjects.forEach((subject) => {
                can(action, subject);
            });
        });
    },
    patreon1(_user, { can }) {
        can("style", "user");
    },
    patreon2(_user, { can }) {
        can("style", "user");
    },
    patreon3(_user, { can }) {
        can("style", "user");
    },
    moderator(_user, { can }) {
        can("ban", "user");
        can("ban", "run");
        can("edit", "run");
    },
    "board-admin": function (_user, { can }) {
        can("edit", "leaderboard");
        can("edit", "moderators");
    },
    "board-moderator": function (_user, { can }) {
        can("edit", "leaderboard");
    },
    "race-admin": function (_user, { can }) {
        can("edit", "race");
        can("delete", "race");
        can("moderate", "race");
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
        can("edit", "race", { creator: user.username });
        can("create", "race");
        can("join", "race");
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
