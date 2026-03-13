'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDebounceValue } from 'usehooks-ts';

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
        <form className="mb-3 input-group">
            <input
                type="text"
                className="form-control"
                placeholder="Search users..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
                <button type="button" className="btn" onClick={clearSearch}>
                    x
                </button>
            )}
        </form>
    );
};
