import { SectionSkeleton } from './components/section-skeleton';

export default function Loading() {
    return (
        <div className="d-flex flex-column gap-4">
            <SectionSkeleton height={340} />
            <SectionSkeleton height={250} />
            <SectionSkeleton height={500} />
            <SectionSkeleton height={400} />
            <SectionSkeleton height={150} />
        </div>
    );
}
