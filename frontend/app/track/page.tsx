import { Suspense } from "react";
import TrackPageContent from "./trackPageContent";
function TrackFallback() {
    return <div>Loading...</div>;
}

export default function TrackPage() {
    return (
        <Suspense fallback={<TrackFallback />}>
            <TrackPageContent />
        </Suspense>
    );
}