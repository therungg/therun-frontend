import Switch from 'react-switch';

export const GametimeForm = ({ useGameTime, setUseGameTime }) => {
    return (
        <div className="d-flex justify-content-end align-self-end">
            <label htmlFor="switch" className="align-self-center me-2">
                {useGameTime ? 'Using Ingame Time (IGT)' : 'Using Real Time'}
            </label>
            <Switch
                name="switch"
                onChange={(checked) => {
                    setUseGameTime(checked);
                }}
                checked={useGameTime}
            />
        </div>
    );
};
