import { getAllPatrons } from '~app/(old-layout)/api/patreons/get-all-patrons.action';
import { UserLink } from '~src/components/links/links';

const DEFAULT_ANIMATION_DURATION = 30;

export const PatreonBar: React.FunctionComponent = async () => {
    const patrons = await getAllPatrons();
    const patronCount = Object.keys(patrons || {}).length;
    const animationDuration =
        Math.floor(patronCount * 0.5) + DEFAULT_ANIMATION_DURATION;

    if (!patronCount) return null;
    1;
    return (
        <div className="patreon-scroll-bar bg-body-tertiary">
            <div
                style={{
                    animationDuration: `${animationDuration}s`,
                }}
            >
                <div className="d-flex">
                    <span className="me-4">
                        A special thanks to our Tier 3 Patrons:
                    </span>

                    {Object.entries(patrons || {})
                        .sort(() => Math.random() - 0.5)
                        .filter(([, v]) => {
                            if (!v.tier || v.tier < 3) return false;

                            return (
                                !v.preferences ||
                                v.preferences.featureInScrollbar
                            );
                        })
                        .map(([k]) => {
                            return (
                                <div className="me-4" key={`${k}patron`}>
                                    <UserLink key={`${k}patron`} username={k} />
                                </div>
                            );
                        })}
                </div>
            </div>
        </div>
    );
};
