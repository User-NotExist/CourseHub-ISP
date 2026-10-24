import { notFound } from "next/navigation";
import ConsultationLogDetail from "@/components/consultant_details";
import { SAMPLE_COURSE, getLog } from "@/lib/mock_consultation_data";

// Route: /courses/[courseId]/consultation/logs/[logId]
export default async function Page({
  params,
}: {
  params: Promise<{ courseId: string; logId: string }>;
}) {
  const { courseId, logId } = await params;

  // TODO: replace with real fetches using courseId / logId once the API is ready.
  const log = getLog(logId);
  if (!log) notFound();

  return (
    <ConsultationLogDetail
      log={log}
      course={SAMPLE_COURSE}
      backHref={`/courses/${courseId}/consultation/logs`}
    />
  );
}