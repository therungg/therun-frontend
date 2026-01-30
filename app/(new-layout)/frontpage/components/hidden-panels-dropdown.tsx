'use client';

import { useState } from 'react';
import { FaEye } from 'react-icons/fa6';
import { PANEL_METADATA } from '~src/lib/frontpage-panels';
import { PanelId } from '../../../../types/frontpage-config.types';
import styles from './hidden-panels-dropdown.module.scss';

interface HiddenPanelsDropdownProps {
    hiddenPanels: PanelId[];
    onRestore: (panelId: PanelId) => void;
}

export const HiddenPanelsDropdown: React.FC<HiddenPanelsDropdownProps> = ({
    hiddenPanels,
    onRestore,
}) => {
    const [isOpen, setIsOpen] = useState(false);

    if (hiddenPanels.length === 0) {
        return null;
    }

    return (
        <div className={styles.dropdown}>
            <button
                className={styles.dropdownButton}
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                Hidden Panels ({hiddenPanels.length})
            </button>
            {isOpen && (
                <div className={styles.dropdownMenu}>
                    {hiddenPanels.map((panelId) => (
                        <button
                            key={panelId}
                            className={styles.dropdownItem}
                            onClick={() => {
                                onRestore(panelId);
                                setIsOpen(false);
                            }}
                        >
                            <FaEye className={styles.icon} />
                            {PANEL_METADATA[panelId].name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
