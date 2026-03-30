import { Suspense } from "react";
import TrackPageContent from "./trackPageContent";

export default function TrackPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <TrackPageContent />
        </Suspense>
    );
}