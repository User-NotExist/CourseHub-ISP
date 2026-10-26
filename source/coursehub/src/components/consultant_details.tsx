"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, CalendarDays, Loader2, Mail, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteConsultationLog, formatDate, type ConsultationLog } from "@/lib/consultation";

type Props = {
  log: ConsultationLog;
  courseName: string | null;
  backHref: string; // the consultation logs list
};

export default function ConsultationLogDetail({ log, courseName, backHref }: Props) {
  const router = useRouter();
  const { id: courseId } = useParams<{ id: string }>();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteConsultationLog(courseId, log.id);
      toast.success("Consultation log deleted.");
      router.push(backHref);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete the consultation log.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex min-h-svh w-full flex-col gap-8 self-start p-8 lg:p-12">
      {/* Page header, same style as the list page */}
      <header className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight text-brand-ink">Consultation Log Details</h1>
          <p className="mt-2 truncate text-lg font-semibold text-neutral-900">{courseName ?? "\u00a0"}</p>
        </div>
        <Link
          href={backHref}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-brand/30 bg-white px-5 py-3 text-base font-semibold text-brand-ink shadow-sm transition hover:bg-brand hover:text-brand-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to logs
        </Link>
      </header>

      {/* Detail panel */}
      <article className="flex flex-1 flex-col gap-6 overflow-hidden rounded-3xl bg-panel p-6 shadow-sm ring-1 ring-panel-border lg:p-8">
        {log.canEdit && (
          <div className="flex self-start items-center gap-3">
            <Link
              href={`${backHref}/${log.id}/edit`}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground shadow-sm transition hover:bg-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <Pencil className="size-4" aria-hidden />
              Edit
            </Link>
            <Button
              type="button"
              onClick={() => setIsDeleteOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-destructive/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
            >
              <Trash2 className="size-4" aria-hidden />
              Delete
            </Button>
          </div>
        )}

        {/* Title */}
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-panel-muted">Title</p>
          <h2 className="mt-2 text-2xl font-semibold leading-snug text-panel-foreground lg:text-3xl">{log.title}</h2>
        </div>

        {/* Consultant + Date */}
        <div className="grid gap-4 sm:grid-cols-2">
          <section className="rounded-2xl bg-panel-surface p-5">
            <p className="text-sm font-medium uppercase tracking-wider text-panel-muted">Consultant</p>
            <div className="mt-3 flex items-center gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand text-sm font-semibold text-brand-foreground ring-2 ring-panel-border">
                {log.consultant?.initials ?? "?"}
              </span>
              <div className="min-w-0">
                <p className="truncate text-lg font-medium text-panel-foreground">{log.consultant?.name ?? "Not recorded"}</p>
                {log.consultant && (
                  <p className="flex items-center gap-1.5 truncate text-sm text-panel-muted">
                    <Mail className="size-3.5 shrink-0" aria-hidden />
                    {log.consultant.email}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-panel-surface p-5">
            <p className="text-sm font-medium uppercase tracking-wider text-panel-muted">Date</p>
            <div className="mt-3 flex items-center gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-panel-surface-strong text-panel-foreground">
                <CalendarDays className="size-5" aria-hidden />
              </span>
              <p className="text-lg font-medium text-panel-foreground">{formatDate(log.date, true)}</p>
            </div>
          </section>
        </div>

        {/* Details: scrolls on its own when the text is long */}
        <section className="flex min-h-0 flex-1 flex-col rounded-2xl bg-panel-surface p-5 lg:p-6">
          <p className="text-sm font-medium uppercase tracking-wider text-panel-muted">Details</p>
          <div className="mt-3 max-h-[50svh] min-h-40 flex-1 overflow-y-auto pr-3 [scrollbar-color:var(--panel-border)_transparent] [scrollbar-width:thin]">
            <p className="whitespace-pre-line text-base leading-7 text-panel-muted">{log.details}</p>
          </div>
        </section>
      </article>
      <AlertDialog open={isDeleteOpen} onOpenChange={(open) => !isDeleting && setIsDeleteOpen(open)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
              <Trash2 />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete this consultation log?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{log.title}&quot; will be permanently removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline" disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}