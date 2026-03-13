'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDebounceValue } from 'usehooks-ts';
import styles from '../admin.module.scss';

export const UserSearch = ({ searchQuery }: { searchQuery: string }) => {
    const [searchInput, setSearchInput] = useState(searchQuery);
    const [debouncedSearch, setValue] = useDebounceValue(searchInput, 500);
    const router = useRouter();

    useEffect(() => {
        if (debouncedSearch !== searchQuery && searchInput !== '') {
            router.push(`/admin/roles?page=1&search=${debouncedSearch}`);
        }
    }, [debouncedSearch, searchQuery, router]);

    useEffect(() => {
        if (searchInput === '') {
            router.push(`/admin/roles?page=1`);
        } else {
            setValue(searchInput);
        }
    }, [searchInput]);

    const clearSearch = () => {
        setSearchInput('');
    };

    return (
        <div className={styles.searchGroup}>
            <input
                type="text"
                className={styles.searchGroupInput}
                placeholder="Search users..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
                <button
                    type="button"
                    className={styles.btnClear}
                    onClick={clearSearch}
                >
                    x
                </button>
            )}
        </div>
    );
};
