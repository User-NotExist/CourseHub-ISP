"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import ConsultationLogForm from "@/components/consultant_log_form";
import { fetchConsultationLog, type ConsultationLog } from "@/lib/consultation";

export default function EditConsultationLogPage() {
  const { id: courseId, logId } = useParams<{ id: string; logId: string }>();
  const detailHref = `/courses/${courseId}/consultation/logs/${logId}`;
  const [log, setLog] = useState<ConsultationLog | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchConsultationLog(courseId, logId)
      .then((result) => {
        if (cancelled) return;
        if (!result.canEdit) {
          setError("You don't have permission to edit this consultation log.");
          return;
        }
        setLog(result);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, logId]);

  if (log) return <ConsultationLogForm initial={log} logId={log.id} />;

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-4 p-8 text-center">
      {error ? (
        <>
          <h1 className="text-2xl font-semibold text-brand-ink">Could not edit this consultation log</h1>
          <p className="text-sm text-neutral-600">{error}</p>
          <Link
            href={detailHref}
            className="inline-flex items-center gap-2 rounded-xl border border-brand/30 bg-white px-5 py-3 text-base font-semibold text-brand-ink shadow-sm transition hover:bg-brand hover:text-brand-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to details
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
