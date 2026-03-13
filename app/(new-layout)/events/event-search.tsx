'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Search as SearchIcon } from 'react-bootstrap-icons';
import { useDebounceValue } from 'usehooks-ts';
import styles from './event.styles.module.scss';

export const EventSearch = () => {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [searchInput, setSearchInput] = useState(
        searchParams.get('search') ?? null,
    );
    const [debouncedSearch] = useDebounceValue(searchInput, 300);

    useEffect(() => {
        if (debouncedSearch !== null) {
            const params = new URLSearchParams(searchParams.toString());
            params.set('page', '1');

            if (debouncedSearch) {
                params.set('search', debouncedSearch);
            } else {
                params.delete('search');
            }
            router.push(`?${params.toString()}`);
        }
    }, [debouncedSearch]);

    return (
        <div className={styles.searchWrapper}>
            <div className="input-group mw-search">
                <span
                    className={styles.searchIcon}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 0.75rem',
                        cursor: 'pointer',
                    }}
                    onClick={() => {
                        const searchElement = document.getElementById('search');
                        if (document.activeElement !== searchElement) {
                            searchElement?.focus();
                        }
                    }}
                >
                    <SearchIcon size={18} />
                </span>
                <input
                    type="search"
                    className={styles.searchInput}
                    placeholder="Search Event"
                    onChange={(e) => {
                        setSearchInput(e.target.value);
                    }}
                    value={searchInput ?? ''}
                    id="search"
                />
            </div>
        </div>
    );
};
