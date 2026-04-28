'use client';

import { Button, Form } from 'react-bootstrap';
import type { GameCategory } from '../../../../types/tournament.types';

export function EligibleRunsEditor({
    value,
    onChange,
}: {
    value: GameCategory[];
    onChange: (next: GameCategory[]) => void;
}) {
    function update(i: number, patch: Partial<GameCategory>) {
        onChange(value.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    }
    function remove(i: number) {
        onChange(value.filter((_, idx) => idx !== i));
    }
    function add() {
        onChange([...value, { game: '', category: '' }]);
    }

    return (
        <div>
            <Form.Label>Eligible games / categories</Form.Label>
            {value.length === 0 && (
                <div className="text-muted small mb-2">
                    Add at least one game/category pair.
                </div>
            )}
            {value.map((r, i) => (
                <div key={i} className="d-flex gap-2 mb-2 align-items-end">
                    <Form.Group className="flex-grow-1">
                        <Form.Label className="small mb-0">Game</Form.Label>
                        <Form.Control
                            value={r.game}
                            onChange={(e) =>
                                update(i, { game: e.target.value })
                            }
                        />
                    </Form.Group>
                    <Form.Group className="flex-grow-1">
                        <Form.Label className="small mb-0">Category</Form.Label>
                        <Form.Control
                            value={r.category}
                            onChange={(e) =>
                                update(i, { category: e.target.value })
                            }
                        />
                    </Form.Group>
                    <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => remove(i)}
                    >
                        Remove
                    </Button>
                </div>
            ))}
            <Button variant="outline-primary" size="sm" onClick={add}>
                Add game/category
            </Button>
        </div>
    );
}
