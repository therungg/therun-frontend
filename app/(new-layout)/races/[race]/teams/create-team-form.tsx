'use client';

import { useActionState, useState } from 'react';
import { Form } from 'react-bootstrap';
import { createTeamAction } from '~app/(new-layout)/races/actions/team-actions';
import { Race } from '~app/(new-layout)/races/races.types';
import { SubmitButton } from '~src/components/Button/SubmitButton';
import styles from './team-lobby.module.scss';

const TEAM_COLORS = [
    '#ef4444',
    '#f97316',
    '#f59e0b',
    '#22c55e',
    '#06b6d4',
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
];

export const CreateTeamForm = ({ race }: { race: Race }) => {
    const [state, formAction] = useActionState(createTeamAction, {});
    const [selectedColor, setSelectedColor] = useState(TEAM_COLORS[0]);

    return (
        <div className={styles.createTeamSection}>
            <span className="fw-bold">Create a Team</span>
            {state?.error && (
                <span style={{ color: 'red' }}>{state.error}</span>
            )}
            <Form action={formAction}>
                <input hidden name="raceId" value={race.raceId} readOnly />
                <input hidden name="teamColor" value={selectedColor} readOnly />
                <div className="d-flex gap-2 mb-2">
                    <Form.Control
                        name="teamName"
                        type="text"
                        placeholder="Team name"
                        maxLength={30}
                        required
                    />
                </div>
                <div className="d-flex gap-1 mb-2 align-items-center">
                    <span className="me-1" style={{ fontSize: '0.8rem' }}>
                        Color:
                    </span>
                    {TEAM_COLORS.map((color) => (
                        <button
                            key={color}
                            type="button"
                            onClick={() => setSelectedColor(color)}
                            style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                backgroundColor: color,
                                border:
                                    selectedColor === color
                                        ? '2px solid white'
                                        : '2px solid transparent',
                                cursor: 'pointer',
                                outline:
                                    selectedColor === color
                                        ? `2px solid ${color}`
                                        : 'none',
                            }}
                        />
                    ))}
                </div>
                {race.requiresPassword && (
                    <Form.Control
                        name="password"
                        type="password"
                        placeholder="Race password"
                        className="mb-2"
                    />
                )}
                <SubmitButton
                    innerText="Create Team"
                    pendingText="Creating..."
                    className="w-100"
                />
            </Form>
        </div>
    );
};
