import { formatRunTimeEcho } from '~src/lib/run-time-input';
import styles from './submit-form.module.scss';

export interface TimeField {
    raw: string;
    ms?: number;
    error: boolean;
}

export const EMPTY_TIME: TimeField = { raw: '', ms: undefined, error: false };

export function TimeInput({
    id,
    label,
    required,
    field,
    onChange,
}: {
    id: string;
    label: string;
    required: boolean;
    field: TimeField;
    onChange: (raw: string) => void;
}) {
    return (
        <div>
            <label htmlFor={id} className="form-label">
                {label}
                {required && <span className={styles.required}> *</span>}
            </label>
            <input
                id={id}
                type="text"
                inputMode="numeric"
                className={`form-control ${field.error ? 'is-invalid' : ''}`}
                value={field.raw}
                placeholder="h:mm:ss.ms"
                required={required}
                onChange={(e) => onChange(e.target.value)}
                onBlur={(e) => onChange(e.target.value)}
            />
            {field.error ? (
                <div className="invalid-feedback">Unrecognized time.</div>
            ) : field.ms !== undefined ? (
                <div className={styles.timeEcho}>
                    Will be submitted as{' '}
                    <strong>{formatRunTimeEcho(field.ms)}</strong>
                </div>
            ) : null}
            <div className="form-text">A plain number is read as seconds.</div>
        </div>
    );
}
