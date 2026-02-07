import { PanelSkeleton } from './components/panel-skeleton';

export default function Loading() {
    return (
        <div>
            {/* Hero skeleton */}
            <div
                style={{
                    height: '350px',
                    borderRadius: '1.1rem',
                    backgroundColor: 'var(--bs-secondary-bg)',
                    opacity: 0.3,
                    marginBottom: '1rem',
                }}
            />

            {/* Panels skeleton */}
            <div className="row d-flex flex-wrap">
                <div className="col col-lg-6 col-xl-7 col-12">
                    <PanelSkeleton />
                    <PanelSkeleton />
                </div>
                <div className="col col-lg-6 col-xl-5 col-12">
                    <PanelSkeleton />
                    <PanelSkeleton />
                </div>
            </div>
        </div>
    );
}
