'use client';

import { Button, Form } from 'react-bootstrap';
import type { DateRange } from '../../../../types/tournament.types';

function isoToLocalInput(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(local: string): string {
    if (!local) return '';
    const d = new Date(local);
    if (Number.isNaN(d.getTime())) return local;
    return d.toISOString();
}

export function HeatsEditor({
    value,
    onChange,
}: {
    value: DateRange[];
    onChange: (next: DateRange[]) => void;
}) {
    function update(i: number, patch: Partial<DateRange>) {
        onChange(value.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));
    }
    function remove(i: number) {
        onChange(value.filter((_, idx) => idx !== i));
    }
    function add() {
        onChange([...value, { startDate: '', endDate: '' }]);
    }

    return (
        <div>
            <Form.Label>Heats</Form.Label>
            {value.length === 0 && (
                <div className="text-muted small mb-2">
                    No heats yet — add at least one.
                </div>
            )}
            {value.map((h, i) => (
                <div key={i} className="d-flex gap-2 mb-2 align-items-end">
                    <Form.Group className="flex-grow-1">
                        <Form.Label className="small mb-0">
                            Heat {i + 1} start
                        </Form.Label>
                        <Form.Control
                            type="datetime-local"
                            value={isoToLocalInput(h.startDate)}
                            onChange={(e) =>
                                update(i, {
                                    startDate: localInputToIso(e.target.value),
                                })
                            }
                        />
                    </Form.Group>
                    <Form.Group className="flex-grow-1">
                        <Form.Label className="small mb-0">
                            Heat {i + 1} end
                        </Form.Label>
                        <Form.Control
                            type="datetime-local"
                            value={isoToLocalInput(h.endDate)}
                            onChange={(e) =>
                                update(i, {
                                    endDate: localInputToIso(e.target.value),
                                })
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
                Add heat
            </Button>
        </div>
    );
}
