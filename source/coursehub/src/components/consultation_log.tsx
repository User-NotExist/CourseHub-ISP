"use client";

import { useMemo, useState } from "react";
import { Plus, Search, ArrowDown, ArrowUp, ChevronRight, MessageSquareText } from "lucide-react";

export type ConsultationLog = {
  id: number | string;
  title: string;
  date: string; // ISO date, e.g. "2026-10-21"
  consultant: { name: string; initials: string };
};

type Course = { code: string; section: string; name: string; sec: string };

type Props = {
  course?: Course;
  logs?: ConsultationLog[];
  onNew?: () => void; // creation flow comes later
  onOpenLog?: (log: ConsultationLog) => void;
};

// Placeholder data until the consultation API is ready.
const SAMPLE_LOGS: ConsultationLog[] = [
  { id: 1, title: "Assignment 5 question", date: "2026-10-21", consultant: { name: "Kanya Chaiyasit", initials: "KC" } },
  { id: 2, title: "Normalization of the hotel schema", date: "2026-10-14", consultant: { name: "Somchai Wongsa", initials: "SW" } },
  { id: 3, title: "Midterm review: SQL joins", date: "2026-10-02", consultant: { name: "Kanya Chaiyasit", initials: "KC" } },
  { id: 4, title: "Project proposal feedback", date: "2026-09-18", consultant: { name: "Pim Rattanakul", initials: "PR" } },
];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function ConsultationLogPage({
  course = { code: "0981567", section: "56", name: "Database", sec: "450" },
  logs = SAMPLE_LOGS,
  onNew,
  onOpenLog,
}: Props) {
  const [query, setQuery] = useState("");
  const [newestFirst, setNewestFirst] = useState(true);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs
      .filter((l) => !q || l.title.toLowerCase().includes(q) || l.consultant.name.toLowerCase().includes(q))
      .sort((a, b) => (newestFirst ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));
  }, [logs, query, newestFirst]);

  const SortIcon = newestFirst ? ArrowDown : ArrowUp;

  return (
    <div className="flex min-h-svh w-full flex-col items-stretch justify-start gap-8 self-start p-8 lg:p-12">
      {/* Page header, anchored top-left */}
      <header className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight text-[#0b5c4f]">Consultation Log</h1>
          <p className="mt-2 truncate text-lg font-semibold text-neutral-900">
            {course.code} - {course.section} {course.name}
          </p>
          <p className="mt-0.5 text-sm text-neutral-600">SEC {course.sec}</p>
        </div>
        <button
          type="button"
          onClick={onNew}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#00695f] px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-[#00574f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00695f]"
        >
          <Plus className="size-4" aria-hidden />
          New
        </button>
      </header>

      {/* Log panel fills the remaining space */}
      <section className="flex flex-1 flex-col overflow-hidden rounded-3xl bg-[#04453f] shadow-lg ring-1 ring-black/10">
        <div className="flex items-center gap-4 px-6 pt-6 lg:px-8 lg:pt-8">
          <label className="relative flex-1">
            <span className="sr-only">Search consultations</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/60" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title or consultant"
              className="w-full rounded-xl border border-white/10 bg-white/10 py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none"
            />
          </label>
          <span className="shrink-0 text-sm text-white/70">
            {visible.length} {visible.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        <div className="mx-6 mt-6 hidden grid-cols-[1fr_11rem_16rem] items-center rounded-2xl bg-white/20 px-6 py-3.5 text-base font-semibold text-white sm:grid lg:mx-8">
          <span>Title</span>
          <button
            type="button"
            onClick={() => setNewestFirst((v) => !v)}
            className="inline-flex items-center gap-1.5 text-left hover:text-white/80"
            aria-label={`Sort by date, currently ${newestFirst ? "newest" : "oldest"} first`}
          >
            Date <SortIcon className="size-3.5" aria-hidden />
          </button>
          <span>Consultant</span>
        </div>

        <ul className="flex-1 space-y-3 p-6 sm:pt-4 lg:p-8 lg:pt-4">
          {visible.map((log) => (
            <li key={log.id}>
              <button
                type="button"
                onClick={() => onOpenLog?.(log)}
                className="group grid w-full grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 rounded-2xl bg-white/10 px-6 py-5 text-left text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/70 sm:grid-cols-[1fr_11rem_16rem]"
              >
                <span className="truncate text-base font-medium">{log.title}</span>
                <span className="order-3 text-sm text-white/70 sm:order-none sm:text-base sm:text-white">
                  {formatDate(log.date)}
                </span>
                <span className="order-2 flex items-center justify-end gap-3.5 sm:order-none sm:justify-start">
                  <span
                    title={log.consultant.name}
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-[#00695f] text-xs font-semibold ring-2 ring-white/30"
                  >
                    {log.consultant.initials}
                  </span>
                  <span className="hidden truncate text-sm text-white/85 md:inline">{log.consultant.name}</span>
                  <ChevronRight className="ml-auto hidden size-4 shrink-0 text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white/80 sm:block" aria-hidden />
                </span>
              </button>
            </li>
          ))}

          {visible.length === 0 && (
            <li className="flex flex-col items-center justify-center gap-3 py-24 text-center text-white/80">
              <MessageSquareText className="size-10 text-white/40" aria-hidden />
              <p className="text-base font-medium">{query ? "No consultations match your search" : "No consultations yet"}</p>
              <p className="text-sm text-white/60">
                {query ? "Try a different title or consultant name." : "Select New to log your first consultation."}
              </p>
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}