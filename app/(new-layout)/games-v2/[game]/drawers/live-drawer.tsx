'use client';

import { Modal } from 'react-bootstrap';
import { LiveRunsForGame } from '~src/components/game/live-runs-for-game';

interface Props {
    show: boolean;
    onHide: () => void;
    gameDisplay: string;
}

export function LiveDrawer({ show, onHide, gameDisplay }: Props) {
    return (
        <Modal show={show} onHide={onHide} size="xl">
            <Modal.Header closeButton>
                <Modal.Title>Live runners — {gameDisplay}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <LiveRunsForGame game={gameDisplay} category={null} />
            </Modal.Body>
        </Modal>
    );
}
