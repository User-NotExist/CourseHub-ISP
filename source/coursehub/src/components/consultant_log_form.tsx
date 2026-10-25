"use client";

import { useId, useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  createConsultationLog,
  updateConsultationLog,
  type ConsultationLog,
  type NewConsultationLog,
} from "@/lib/consultation";
import { useCourseName } from "@/lib/use_course_name";

type NewLogValues = NewConsultationLog;

type Props = {
  initial?: ConsultationLog;
  logId?: string;
  // Overrides the default save. Throw to show an error message.
  onSubmit?: (values: NewLogValues) => Promise<void> | void;
};

type Errors = Partial<Record<keyof NewLogValues, string>>;

const TITLE_MAX = 120;
const DETAILS_MAX = 2000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const label = "text-sm font-medium uppercase tracking-wider text-white/60";
const inputBase =
  "w-full rounded-xl border bg-white/10 px-4 py-3 text-base text-white placeholder:text-white/50 focus:outline-none";
const ok = "border-white/10 focus:border-white/50";
const bad = "border-red-300";

const noopSubscribe = () => () => {};
const getToday = () => new Date().toLocaleDateString("en-CA");

export default function ConsultationLogForm({ initial, logId, onSubmit }: Props) {
  const router = useRouter();
  const id = useId();
  const { id: courseId } = useParams<{ id: string }>();
  const courseName = useCourseName(courseId);
  const backHref = `/courses/${courseId}/consultation/logs`;
  const cancelHref = logId ? `${backHref}/${logId}` : backHref;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [consultantEmail, setConsultantEmail] = useState(initial?.consultant?.email ?? "");
  // Today's date in the browser's timezone. useSyncExternalStore keeps server and client renders consistent.
  const today = useSyncExternalStore(noopSubscribe, getToday, () => "");
  const [dateInput, setDateInput] = useState<string | null>(initial?.date ?? null); // null = untouched, use today
  const date = dateInput ?? (initial ? "" : today);
  const [details, setDetails] = useState(initial?.details ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const validate = (): Errors => {
    const e: Errors = {};
    if (!title.trim()) e.title = "Enter a title.";
    if (!consultantEmail.trim()) e.consultantEmail = "Enter the consultant's email.";
    else if (!EMAIL_PATTERN.test(consultantEmail.trim())) e.consultantEmail = "Enter a valid email address.";
    if (!date) e.date = "Pick a date.";
    if (!details.trim()) e.details = "Add some details about the consultation.";
    return e;
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    setSubmitting(true);
    setSubmitError("");
    const values: NewLogValues = {
      title: title.trim(),
      consultantEmail: consultantEmail.trim().toLowerCase(),
      date,
      details: details.trim(),
    };
    try {
      // The backend also checks that the consultant's email belongs to someone in the course.
      await (onSubmit ?? ((v) =>
        logId
          ? updateConsultationLog(courseId, logId, v)
          : createConsultationLog(courseId, v)))(values);
      router.push(logId ? `${backHref}/${logId}` : backHref);
      router.refresh();
    } catch (err) {
      const reason = err instanceof Error && err.message ? ` ${err.message}` : "";
      setSubmitError(`Couldn't save the consultation log.${reason}`);
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-svh w-full flex-col gap-8 self-start p-8 lg:p-12">
      <header className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight text-[#0b5c4f]">
            {logId ? "Edit Consultation Log" : "New Consultation Log"}
          </h1>
          <p className="mt-2 truncate text-lg font-semibold text-neutral-900">{courseName ?? "\u00a0"}</p>
        </div>
        <Link
          href={cancelHref}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#00695f]/30 bg-white px-5 py-3 text-base font-semibold text-[#0b5c4f] shadow-sm transition hover:bg-[#00695f] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00695f]"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {logId ? "Back to details" : "Back to logs"}
        </Link>
      </header>

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
            <label htmlFor={`${id}-consultant`} className={label}>Consultant</label>
            <input
              id={`${id}-consultant`}
              type="email"
              inputMode="email"
              autoComplete="email"
              value={consultantEmail}
              onChange={(e) => setConsultantEmail(e.target.value)}
              placeholder="consultant@ku.th"
              aria-invalid={!!errors.consultantEmail}
              aria-describedby={errors.consultantEmail ? `${id}-consultant-err` : `${id}-consultant-hint`}
              className={`mt-2 ${inputBase} ${errors.consultantEmail ? bad : ok}`}
            />
            {errors.consultantEmail ? (
              <p id={`${id}-consultant-err`} className="mt-1.5 text-sm text-red-200">{errors.consultantEmail}</p>
            ) : (
              <p id={`${id}-consultant-hint`} className="mt-1.5 text-sm text-white/50">
                Email of the person who gave the consultation.
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
            href={cancelHref}
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
            {submitting ? "Saving…" : logId ? "Save changes" : "Create log"}
          </button>
        </div>
      </form>
    </div>
  );
}