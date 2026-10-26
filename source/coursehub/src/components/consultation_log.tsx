"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { Plus, Search, ArrowDown, ArrowUp, ChevronRight, MessageSquareText, Loader2 } from "lucide-react";
import { fetchConsultationLogs, formatDate, type ConsultationLog } from "@/lib/consultation";
import { useCourseName } from "@/lib/use_course_name";

type Props = {
  onNew?: () => void; // overrides the default navigation to /new
  onOpenLog?: (log: ConsultationLog) => void; // overrides the default navigation
};

export default function ConsultationLogPage({ onNew, onOpenLog }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { id: courseId } = useParams<{ id: string }>();
  const courseName = useCourseName(courseId);
  const [query, setQuery] = useState("");

  // `loaded` records which course the current logs/error belong to; anything else means "loading".
  const [state, setState] = useState<{
    courseId: string;
    logs: ConsultationLog[];
    error: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchConsultationLogs(courseId)
      .then((logs) => !cancelled && setState({ courseId, logs, error: "" }))
      .catch((err: Error) => !cancelled && setState({ courseId, logs: [], error: err.message }));
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const loading = state?.courseId !== courseId;
  const logs = useMemo(() => (loading ? [] : state.logs), [loading, state]);
  const error = loading ? "" : state.error;

  const base = pathname.replace(/\/$/, "");
  const openLog = (log: ConsultationLog) =>
    onOpenLog ? onOpenLog(log) : router.push(`${base}/${log.id}`);
  const handleNew = () => (onNew ? onNew() : router.push(`${base}/new`));

  const [newestFirst, setNewestFirst] = useState(true);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs
      .filter(
        (l) =>
          !q ||
          l.title.toLowerCase().includes(q) ||
          l.consultant?.name.toLowerCase().includes(q) ||
          l.consultant?.email.toLowerCase().includes(q),
      )
      .sort((a, b) => {
        const [da, db] = [a.date ?? "", b.date ?? ""];
        return newestFirst ? db.localeCompare(da) : da.localeCompare(db);
      });
  }, [logs, query, newestFirst]);

  const SortIcon = newestFirst ? ArrowDown : ArrowUp;

  return (
    <div className="flex w-full flex-col justify-start gap-8 self-start p-8 lg:p-12 h-screen">
      {/* Page header, anchored top-left */}
      <header className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight text-[#0b5c4f]">Consultation Log</h1>
          <p className="mt-2 truncate text-lg font-semibold text-neutral-900">{courseName ?? "\u00a0"}</p>
        </div>
        <button
          type="button"
          onClick={handleNew}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#00695f] px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-[#00574f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00695f]"
        >
          <Plus className="size-4" aria-hidden />
          New
        </button>
      </header>

      {/* Log panel fills the remaining space */}
      <section className="flex flex-1 flex-col overflow-hidden rounded-3xl bg-[#04453f] shadow-lg ring-1 ring-black/10 overflow-y-auto h-screen scrollbar-none">
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
            {loading ? "Loading…" : `${visible.length} ${visible.length === 1 ? "entry" : "entries"}`}
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
                onClick={() => openLog(log)}
                className="group grid w-full grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 rounded-2xl bg-white/10 px-6 py-5 text-left text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/70 sm:grid-cols-[1fr_11rem_16rem]"
              >
                <span className="truncate text-base font-medium">{log.title}</span>
                <span className="order-3 text-sm text-white/70 sm:order-none sm:text-base sm:text-white">
                  {formatDate(log.date)}
                </span>
                <span className="order-2 flex items-center justify-end gap-3.5 sm:order-none sm:justify-start">
                  <span
                    title={log.consultant?.name ?? "No consultant recorded"}
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-[#00695f] text-xs font-semibold ring-2 ring-white/30"
                  >
                    {log.consultant?.initials ?? "?"}
                  </span>
                  <span className="hidden truncate text-sm text-white/85 md:inline">
                    {log.consultant?.name ?? "Not recorded"}
                  </span>
                  <ChevronRight className="ml-auto hidden size-4 shrink-0 text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white/80 sm:block" aria-hidden />
                </span>
              </button>
            </li>
          ))}

          {loading && (
            <li className="flex items-center justify-center gap-3 py-24 text-white/80" role="status">
              <Loader2 className="size-5 animate-spin" aria-hidden />
              <span className="text-base font-medium">Loading consultations…</span>
            </li>
          )}

          {!loading && error && (
            <li role="alert" className="flex flex-col items-center justify-center gap-3 py-24 text-center text-white/80">
              <MessageSquareText className="size-10 text-white/40" aria-hidden />
              <p className="text-base font-medium">Couldn&apos;t load consultations</p>
              <p className="text-sm text-white/60">{error}</p>
            </li>
          )}

          {!loading && !error && visible.length === 0 && (
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