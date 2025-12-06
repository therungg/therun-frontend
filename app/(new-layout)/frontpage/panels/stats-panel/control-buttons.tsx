'use client';

interface Props {
    currentRange: 'week' | 'month';
    onRangeChange: (range: 'week' | 'month') => void;
    disabled?: boolean;
}

export function ControlButtons({ currentRange, onRangeChange, disabled }: Props) {
    const nextRange = currentRange === 'week' ? 'month' : 'week';
    const buttonText = currentRange === 'week' ? 'Switch to Monthly' : 'Switch to Weekly';

    const handleClick = () => {
        onRangeChange(nextRange);
    };

    return (
        <button
            className="btn btn-primary px-3"
            onClick={handleClick}
            disabled={disabled}
        >
            {buttonText}
        </button>
    );
}