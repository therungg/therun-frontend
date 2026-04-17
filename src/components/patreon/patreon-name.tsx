'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { BunnyIcon } from '~src/icons/bunny-icon';
import { getColorMode } from '~src/utils/colormode';
import { safeDecodeURI } from '~src/utils/uri';
import type { PatronPreferences } from '../../../types/patreon.types';
import { buildPatronStyle, type Theme } from './patron-style';
import { usePatreons } from './use-patreons';

interface NameAsPatreonProps {
    name: string;
    icon?: boolean;
    size?: number;
}

export const NameAsPatreon: React.FunctionComponent<NameAsPatreonProps> = ({
    name,
    icon,
    size,
}) => {
    const { data: patreons, isLoading } = usePatreons();
    const patron = patreons?.[name];
    if (isLoading || !patron || patron.preferences?.hide) {
        return <>{safeDecodeURI(name)}</>;
    }
    const showIcon = icon ?? patron.preferences?.showIcon ?? true;
    return (
        <PatreonName
            name={name}
            preferences={patron.preferences}
            tier={patron.tier}
            icon={showIcon}
            size={size}
        />
    );
};

export interface PatreonNameProps {
    name: string;
    preferences: PatronPreferences | null | undefined;
    tier: number;
    icon?: boolean;
    size?: number;
}

export const PatreonName: React.FunctionComponent<PatreonNameProps> = ({
    name,
    preferences,
    tier,
    icon = true,
    size = 20,
}) => {
    const router = useRouter();
    const [theme, setTheme] = useState<Theme>('dark');
    useEffect(() => {
        setTheme(getColorMode() === 'light' ? 'light' : 'dark');
    }, []);

    const style = buildPatronStyle(preferences, tier, theme);

    const handleBunnyClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        router.push('/support');
    };

    return (
        <>
            <span style={style}>{safeDecodeURI(name)}</span>
            {icon && (
                <OverlayTrigger
                    placement="top"
                    overlay={
                        <Tooltip id={`patron-${name}`}>
                            therun.gg Supporter
                        </Tooltip>
                    }
                >
                    <span
                        onClick={handleBunnyClick}
                        role="link"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                router.push('/support');
                            }
                        }}
                        style={{ cursor: 'pointer' }}
                        aria-label="Learn about supporting therun.gg"
                    >
                        {' '}
                        <BunnyIcon size={size} />
                    </span>
                </OverlayTrigger>
            )}
        </>
    );
};

export default PatreonName;
