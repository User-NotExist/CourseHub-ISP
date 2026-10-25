"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import ConsultationLogDetail from "@/components/consultant_details";
import { ApiError, fetchConsultationLog, type ConsultationLog } from "@/lib/consultation";
import { useCourseName } from "@/lib/use_course_name";

type LoadState = { key: string; log: ConsultationLog | null; error: string; notFound: boolean };

// Route: /courses/[id]/consultation/logs/[logId]
export default function Page() {
  const { id: courseId, logId } = useParams<{ id: string; logId: string }>();
  const courseName = useCourseName(courseId);
  const backHref = `/courses/${courseId}/consultation/logs`;

  const key = `${courseId}/${logId}`;
  const [state, setState] = useState<LoadState | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchConsultationLog(courseId, logId)
      .then((log) => !cancelled && setState({ key, log, error: "", notFound: false }))
      .catch((err: Error) => {
        if (cancelled) return;
        const notFound = err instanceof ApiError && err.status === 404;
        setState({ key, log: null, error: err.message, notFound });
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, logId, key]);

  if (state?.key === key && state.log) {
    return <ConsultationLogDetail log={state.log} courseName={courseName} backHref={backHref} />;
  }

  const failed = state?.key === key;
  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-4 p-8 text-center">
      {failed ? (
        <>
          <h1 className="text-2xl font-semibold text-[#0b5c4f]">
            {state.notFound ? "Consultation log not found" : "Couldn't load this consultation log"}
          </h1>
          {!state.notFound && <p className="text-sm text-neutral-600">{state.error}</p>}
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 rounded-xl border border-[#00695f]/30 bg-white px-5 py-3 text-base font-semibold text-[#0b5c4f] shadow-sm transition hover:bg-[#00695f] hover:text-white"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to logs
          </Link>
        </>
      ) : (
        <div className="flex items-center gap-3 text-neutral-600" role="status">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          <span>Loading consultation log…</span>
        </div>
      )}
    </div>
  );
}