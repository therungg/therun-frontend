'use client';
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
}

export const NameAsPatreon: React.FunctionComponent<NameAsPatreonProps> = ({
    name,
}) => {
    const { data: patreons, isLoading } = usePatreons();
    const patron = patreons?.[name];
    if (isLoading || !patron || patron.preferences?.hide) {
        return <>{safeDecodeURI(name)}</>;
    }
    return (
        <PatreonName
            name={name}
            preferences={patron.preferences}
            tier={patron.tier}
            icon={patron.preferences?.showIcon ?? true}
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
    const [theme, setTheme] = useState<Theme>('dark');
    useEffect(() => {
        setTheme(getColorMode() === 'light' ? 'light' : 'dark');
    }, []);

    const style = buildPatronStyle(preferences, tier, theme);

    return (
        <>
            <span style={style}>{safeDecodeURI(name)}</span>
            {icon && (
                <OverlayTrigger
                    placement="top"
                    overlay={
                        <Tooltip id={`patron-${name}`}>
                            therun.gg Patron
                        </Tooltip>
                    }
                >
                    <span>
                        {' '}
                        <BunnyIcon size={size} />
                    </span>
                </OverlayTrigger>
            )}
        </>
    );
};

export default PatreonName;
