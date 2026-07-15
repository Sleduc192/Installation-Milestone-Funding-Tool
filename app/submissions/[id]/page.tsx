import SubmissionDetailClient from "./_components/submission-detail-client";

export const dynamic = "force-dynamic";

export default function SubmissionDetailPage({ params }: { params: { id: string } }) {
  return <SubmissionDetailClient id={params?.id ?? ""} />;
}
