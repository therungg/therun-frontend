'use client';

import { Button } from '~src/components/Button/Button';

interface Props {
    currentRange: 'week' | 'month';
    onRangeChange: (range: 'week' | 'month') => void;
    disabled?: boolean;
}

export function ControlButtons({
    currentRange,
    onRangeChange,
    disabled,
}: Props) {
    const nextRange = currentRange === 'week' ? 'month' : 'week';
    const buttonText =
        currentRange === 'week' ? 'Switch to Monthly' : 'Switch to Weekly';

    const handleClick = () => {
        onRangeChange(nextRange);
    };

    return (
        <Button
            variant="primary"
            className="px-4 py-2 rounded-3 fw-bold text-uppercase"
            style={{ letterSpacing: '0.5px', fontSize: '0.95rem' }}
            onClick={handleClick}
            disabled={disabled}
        >
            {buttonText}
        </Button>
    );
}
