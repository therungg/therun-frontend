'use client';

import { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa6';
import { SECTION_METADATA } from '~src/lib/frontpage-sections-metadata';
import type { SectionId } from '../../../../types/frontpage-config.types';
import styles from './hidden-sections-dropdown.module.scss';

interface HiddenSectionsDropdownProps {
    hiddenSections: SectionId[];
    onRestore: (sectionId: SectionId) => void;
}

export const HiddenSectionsDropdown: React.FC<HiddenSectionsDropdownProps> = ({
    hiddenSections,
    onRestore,
}) => {
    const [isOpen, setIsOpen] = useState(false);

    if (hiddenSections.length === 0) {
        return null;
    }

    return (
        <div className={styles.dropdown}>
            <button
                className={styles.dropdownButton}
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <FaEyeSlash size={14} />
                {hiddenSections.length} hidden
            </button>
            {isOpen && (
                <div className={styles.dropdownMenu}>
                    {hiddenSections.map((sectionId) => (
                        <button
                            key={sectionId}
                            className={styles.dropdownItem}
                            onClick={() => {
                                onRestore(sectionId);
                                setIsOpen(false);
                            }}
                        >
                            <FaEye className={styles.icon} />
                            {SECTION_METADATA[sectionId].name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
