import ConsultationLogPage from "@/components/consultation_log";

// Route: /courses/[courseId]/consultation/logs
export default async function Page({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  void courseId;

  return <ConsultationLogPage />;
}