export const SectionSkeleton = ({ height = 300 }: { height?: number }) => {
    return (
        <div
            className="rounded-4 placeholder-glow"
            role="status"
            aria-label="Loading section"
            style={{
                height: `${height}px`,
                backgroundColor: 'var(--bs-secondary-bg)',
            }}
        >
            <div className="p-4">
                <span className="placeholder col-3 mb-3 d-block" />
                <span className="placeholder col-8 mb-2 d-block" />
                <span className="placeholder col-6 d-block" />
            </div>
        </div>
    );
};
