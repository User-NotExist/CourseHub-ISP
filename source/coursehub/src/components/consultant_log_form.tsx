"use client";

import { useEffect, useId, useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import ConsultantPicker, { type Member } from "@/components/consultant_picker";
import { SAMPLE_COURSE } from "@/lib/mock_consultation_data";

// What the form hands to onSubmit. Maps onto the ConsultationLogs model:
// title -> title, consultantEmail -> consultant, date -> consultation_date, details -> description
export type NewLogValues = {
  title: string;
  consultantEmail: string;
  date: string; // YYYY-MM-DD
  details: string;
};

type Props = {
  // Send the new log to your API here. Throw to show an error message.
  onSubmit?: (values: NewLogValues) => Promise<void> | void;
};

type Errors = Partial<Record<keyof NewLogValues, string>>;

// Shape returned by GET /api_course/edit?course_id=... (BFF for FastAPI GET /course/edit/{course_id})
type CourseMemberResponse = { email: string; name: string; role: string };

const TITLE_MAX = 120;
const DETAILS_MAX = 2000;

const label = "text-sm font-medium uppercase tracking-wider text-white/60";
const inputBase =
  "w-full rounded-xl border bg-white/10 px-4 py-3 text-base text-white placeholder:text-white/50 focus:outline-none";
const ok = "border-white/10 focus:border-white/50";
const bad = "border-red-300";

const noopSubscribe = () => () => {};
const getToday = () => new Date().toLocaleDateString("en-CA");

function initialsOf(name: string, email: string) {
  const parts = (name || email).trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => Array.from(p)[0] ?? "");
  return letters.join("").toUpperCase() || "?";
}

export default function ConsultationLogForm({ onSubmit }: Props) {
  const router = useRouter();
  const id = useId();
  const { id: courseId } = useParams<{ id: string }>();
  const course = SAMPLE_COURSE; // TODO: real course header data (code / section / SEC are not in the API yet)
  const backHref = `/courses/${courseId}/consultation/logs`;

  const [title, setTitle] = useState("");
  const [consultant, setConsultant] = useState<Member | null>(null);
  // Today's date in the browser's timezone. useSyncExternalStore keeps server and client renders consistent.
  const today = useSyncExternalStore(noopSubscribe, getToday, () => "");
  const [dateInput, setDateInput] = useState<string | null>(null); // null = untouched, use today
  const date = dateInput ?? today;
  const [details, setDetails] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [members, setMembers] = useState<Member[] | null>(null); // null = still loading
  const [membersError, setMembersError] = useState("");

  // Load the people who are actually in this course
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch(`/api_course/edit?course_id=${encodeURIComponent(courseId)}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          // /api_course/edit is lecturer-only on the backend, so TAs get 403 here.
          setMembersError(
            response.status === 403
              ? "Only lecturers can load the course member list right now."
              : "Couldn't load the course members. Please try again.",
          );
          setMembers([]);
          return;
        }
        const data: { members?: CourseMemberResponse[] } = await response.json();
        setMembers(
          (data.members ?? [])
            .map((m) => ({ ...m, initials: initialsOf(m.name, m.email) }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
      } catch {
        if (controller.signal.aborted) return;
        setMembersError("Couldn't load the course members. Please try again.");
        setMembers([]);
      }
    })();
    return () => controller.abort();
  }, [courseId]);

  const validate = (): Errors => {
    const e: Errors = {};
    if (!title.trim()) e.title = "Enter a title.";
    if (!consultant) e.consultantEmail = "Choose a consultant from the course.";
    if (!date) e.date = "Pick a date.";
    if (!details.trim()) e.details = "Add some details about the consultation.";
    return e;
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length || !consultant) return;

    setSubmitting(true);
    setSubmitError("");
    const values: NewLogValues = {
      title: title.trim(),
      consultantEmail: consultant.email,
      date,
      details: details.trim(),
    };
    try {
      // TODO: replace this default with a real API call once the consultation create route exists.
      await (onSubmit ?? ((v) => console.log("New consultation log (not saved yet):", v)))(values);
      router.push(backHref);
      router.refresh();
    } catch {
      setSubmitError("Couldn't save the consultation log. Please try again.");
      setSubmitting(false);
    }
  };

  const loadingMembers = members === null;

  return (
    <div className="flex min-h-svh w-full flex-col gap-8 self-start p-8 lg:p-12">
      <header className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight text-[#0b5c4f]">New Consultation Log</h1>
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

      {/* No overflow-hidden here: the consultant dropdown must be able to extend past the panel */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-1 flex-col gap-6 rounded-3xl bg-[#04453f] p-6 shadow-lg ring-1 ring-black/10 lg:p-8"
      >
        {/* Title */}
        <div>
          <label htmlFor={`${id}-title`} className={label}>Title</label>
          <input
            id={`${id}-title`}
            value={title}
            maxLength={TITLE_MAX}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Assignment 5 question"
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? `${id}-title-err` : undefined}
            className={`mt-2 ${inputBase} ${errors.title ? bad : ok}`}
          />
          {errors.title && <p id={`${id}-title-err`} className="mt-1.5 text-sm text-red-200">{errors.title}</p>}
        </div>

        {/* Consultant + Date */}
        <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
          <div>
            <span id={`${id}-consultant`} className={label}>Consultant</span>
            <div className="mt-2" aria-labelledby={`${id}-consultant`}>
              <ConsultantPicker
                members={members ?? []}
                value={consultant}
                onChange={setConsultant}
                invalid={!!errors.consultantEmail || !!membersError}
                disabled={loadingMembers || !!membersError}
                placeholder={loadingMembers ? "Loading course members…" : undefined}
                describedBy={
                  errors.consultantEmail || membersError ? `${id}-consultant-err` : undefined
                }
              />
            </div>
            {(membersError || errors.consultantEmail) && (
              <p id={`${id}-consultant-err`} className="mt-1.5 text-sm text-red-200">
                {membersError || errors.consultantEmail}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={`${id}-date`} className={label}>Date</label>
            <input
              id={`${id}-date`}
              type="date"
              value={date}
              onChange={(e) => setDateInput(e.target.value)}
              aria-invalid={!!errors.date}
              aria-describedby={errors.date ? `${id}-date-err` : undefined}
              className={`mt-2 [color-scheme:dark] ${inputBase} ${errors.date ? bad : ok}`}
            />
            {errors.date && <p id={`${id}-date-err`} className="mt-1.5 text-sm text-red-200">{errors.date}</p>}
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-1 flex-col">
          <div className="flex items-baseline justify-between">
            <label htmlFor={`${id}-details`} className={label}>Details</label>
            <span className="text-sm text-white/50">{details.length}/{DETAILS_MAX}</span>
          </div>
          <textarea
            id={`${id}-details`}
            value={details}
            maxLength={DETAILS_MAX}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="What was discussed, what the consultant recommended, and any next steps"
            aria-invalid={!!errors.details}
            aria-describedby={errors.details ? `${id}-details-err` : undefined}
            className={`mt-2 min-h-56 flex-1 resize-y leading-7 ${inputBase} ${errors.details ? bad : ok}`}
          />
          {errors.details && <p id={`${id}-details-err`} className="mt-1.5 text-sm text-red-200">{errors.details}</p>}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/10 pt-6">
          {submitError && <p role="alert" className="mr-auto text-sm text-red-200">{submitError}</p>}
          <Link
            href={backHref}
            className="rounded-xl px-5 py-3 text-base font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-semibold text-[#04453f] shadow-sm transition hover:bg-white/90 disabled:opacity-60"
          >
            {submitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {submitting ? "Saving…" : "Create log"}
          </button>
        </div>
      </form>
    </div>
  );
}