import Link from "next/link";
import { ArrowLeft, CalendarDays, Mail } from "lucide-react";
import { formatDate, type ConsultationLog, type Course } from "@/lib/mock_consultation_data";

type Props = {
  log: ConsultationLog;
  course: Course;
  backHref: string; // the consultation logs list
};

export default function ConsultationLogDetail({ log, course, backHref }: Props) {
  return (
    <div className="flex min-h-svh w-full flex-col gap-8 self-start p-8 lg:p-12">
      {/* Page header, same style as the list page */}
      <header className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight text-[#0b5c4f]">Consultation Log Details</h1>
          <p className="mt-2 truncate text-lg font-semibold text-neutral-900">
            {course.code} - {course.section} {course.name}
          </p>
          <p className="mt-0.5 text-sm text-neutral-600">SEC {course.sec}</p>
        </div>
        <Link
          href={backHref}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#00695f]/30 bg-white px-5 py-3 text-base font-semibold text-[#0b5c4f] shadow-sm transition hover:bg-[#00695f] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00695f]"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to logs
        </Link>
      </header>

      {/* Detail panel */}
      <article className="flex flex-1 flex-col gap-6 overflow-hidden rounded-3xl bg-[#04453f] p-6 shadow-lg ring-1 ring-black/10 lg:p-8">
        {/* Title */}
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-white/60">Title</p>
          <h2 className="mt-2 text-2xl font-semibold leading-snug text-white lg:text-3xl">{log.title}</h2>
        </div>

        {/* Consultant + Date */}
        <div className="grid gap-4 sm:grid-cols-2">
          <section className="rounded-2xl bg-white/10 p-5">
            <p className="text-sm font-medium uppercase tracking-wider text-white/60">Consultant</p>
            <div className="mt-3 flex items-center gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#00695f] text-sm font-semibold text-white ring-2 ring-white/30">
                {log.consultant.initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-lg font-medium text-white">{log.consultant.name}</p>
                <p className="flex items-center gap-1.5 truncate text-sm text-white/70">
                  <Mail className="size-3.5 shrink-0" aria-hidden />
                  {log.consultant.email}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-white/10 p-5">
            <p className="text-sm font-medium uppercase tracking-wider text-white/60">Date</p>
            <div className="mt-3 flex items-center gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white/15 text-white">
                <CalendarDays className="size-5" aria-hidden />
              </span>
              <p className="text-lg font-medium text-white">{formatDate(log.date, true)}</p>
            </div>
          </section>
        </div>

        {/* Details: scrolls on its own when the text is long */}
        <section className="flex min-h-0 flex-1 flex-col rounded-2xl bg-white/10 p-5 lg:p-6">
          <p className="text-sm font-medium uppercase tracking-wider text-white/60">Details</p>
          <div className="mt-3 max-h-[50svh] min-h-40 flex-1 overflow-y-auto pr-3 [scrollbar-color:rgba(255,255,255,0.35)_transparent] [scrollbar-width:thin]">
            <p className="whitespace-pre-line text-base leading-7 text-white/90">{log.details}</p>
          </div>
        </section>
      </article>
    </div>
  );
}