'use client';

import type { NavGroup, NavItemId } from './nav-model';

interface Props {
    groups: NavGroup[];
    activeItem: NavItemId | null;
    onSelect: (id: NavItemId) => void;
    attentionCount: number;
    /** Category picker for the per-category group. */
    categories: Array<{ id: number; display: string }>;
    selectedCategoryId: number | null;
    onSelectCategory: (id: number) => void;
}

export function ConsoleSidebar({
    groups,
    activeItem,
    onSelect,
    attentionCount,
    categories,
    selectedCategoryId,
    onSelectCategory,
}: Props) {
    return (
        <nav className="d-flex flex-column gap-3" aria-label="Admin console">
            {groups.map((group) => (
                <div key={group.id}>
                    <div className="text-uppercase small fw-semibold text-muted px-2 mb-1">
                        {group.label}
                    </div>
                    {group.id === 'per-category' && categories.length > 0 && (
                        <select
                            className="form-select form-select-sm mb-2"
                            aria-label="Category"
                            value={selectedCategoryId ?? ''}
                            onChange={(e) => {
                                const id = Number.parseInt(e.target.value, 10);
                                if (Number.isFinite(id)) onSelectCategory(id);
                            }}
                        >
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.display}
                                </option>
                            ))}
                        </select>
                    )}
                    <ul className="nav nav-pills flex-column">
                        {group.items.map((item) => (
                            <li className="nav-item" key={item.id}>
                                <button
                                    type="button"
                                    className={`nav-link w-100 text-start d-flex align-items-center justify-content-between ${
                                        activeItem === item.id ? 'active' : ''
                                    }`}
                                    onClick={() => onSelect(item.id)}
                                >
                                    <span>
                                        {item.label}
                                        {item.reserved && (
                                            <span className="badge text-bg-light ms-2">
                                                soon
                                            </span>
                                        )}
                                    </span>
                                    {item.id === 'attention' &&
                                        attentionCount > 0 && (
                                            <span className="badge rounded-pill text-bg-danger">
                                                {attentionCount > 99
                                                    ? '99+'
                                                    : attentionCount}
                                            </span>
                                        )}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </nav>
    );
}
