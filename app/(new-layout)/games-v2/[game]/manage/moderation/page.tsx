import { subject as caslSubject } from '@casl/ability';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { defineAbilityFor } from '~src/rbac/ability';
import { loadModDoorClaim, ModDoor } from '../mod-door';

interface Props {
    params: Promise<{ game: string }>;
}

// Legacy URL. Task 12 made this a redirect into the unified console —
// gate it the same way the console page does *before* redirecting, so a
// non-mod hitting this old link gets the recruiting door, not a redirect
// loop into the console's own notFound().
export default async function ModerationPage({ params }: Props) {
    const { game: slug } = await params;

    const game = await resolveGame(slug);
    if (!game) notFound();

    const session = await getSession();
    if (!session?.username || !session.id) {
        return <ModDoor game={game} claim={null} />;
    }

    const ability = defineAbilityFor(session);
    const canModerate = canModerateGame(session, game.name);
    const canConfigure = ability.can(
        'edit',
        caslSubject('category-settings', { game: game.name }),
    );
    if (!canModerate && !canConfigure) {
        return (
            <ModDoor
                game={game}
                claim={await loadModDoorClaim(session.id, game.id)}
            />
        );
    }

    redirect(`/games-v2/${slug}/manage?pane=attention`);
}
