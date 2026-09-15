import { getSession } from '~src/actions/session.action';
import type { ResolvedStrip } from './resolve';
import { StripPicker } from './strip-picker';

/** Only the runner themself can choose their strip's stats. */
export async function StripEditor({
    name,
    strip,
}: {
    name: string;
    strip: ResolvedStrip;
}) {
    const session = await getSession();
    if (session.username?.toLowerCase() !== name.toLowerCase()) return null;
    return <StripPicker strip={strip} />;
}
