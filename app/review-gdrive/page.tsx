export const dynamic = "force-dynamic";

import { Suspense } from "react";
import ReviewGdriveClient from "./_components/review-gdrive-client";

export default function ReviewGdrivePage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <ReviewGdriveClient />
    </Suspense>
  );
}
