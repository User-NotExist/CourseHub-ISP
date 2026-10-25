// Types, helpers and API calls for the consultation log pages.
// All requests go through the Next.js proxy routes in app/api_consultation.

export type Consultant = { name: string; initials: string; email: string };

export type ConsultationLog = {
  id: string;
  title: string;
  date: string | null; // ISO date, e.g. "2026-10-21"
  consultant: Consultant | null; // null for logs created before the consultant field existed
  details: string; // plain text, line breaks are kept
  canEdit: boolean;
};

export type NewConsultationLog = {
  title: string;
  consultantEmail: string;
  date: string; // YYYY-MM-DD
  details: string;
};

type RawLog = {
  consultation_id: number;
  title: string;
  description: string | null;
  consultation_date: string | null;
  consultant: { email: string; name: string } | string | null;
  can_edit?: boolean;
};

export const getInitials = (name: string) => {
  const source = name.includes("@") ? name.split("@")[0].replace(/[._-]+/g, " ") : name;
  const parts = source.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const toConsultant = (raw: RawLog["consultant"]): Consultant | null => {
  if (!raw) return null;
  const email = typeof raw === "string" ? raw : raw.email;
  const name = typeof raw === "string" ? raw : raw.name;
  return { name, email, initials: getInitials(name) };
};

// The backend may send "None" for an unset date; only accept real YYYY-MM-DD values.
const toDate = (raw: string | null) => (raw && /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw : null);

const toLog = (raw: RawLog): ConsultationLog => ({
  id: String(raw.consultation_id),
  title: raw.title,
  date: toDate(raw.consultation_date),
  consultant: toConsultant(raw.consultant),
  details: raw.description ?? "",
  canEdit: raw.can_edit ?? false,
});

export const formatDate = (iso: string | null, long = false) => {
  if (!iso) return "No date";
  // Date-only strings are UTC midnight; format in UTC so the day never shifts.
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: long ? "long" : "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { credentials: "include", cache: "no-store", ...init });
  } catch {
    throw new ApiError("Unable to reach the server.", 0);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = typeof data?.detail === "string" ? data.detail : "Something went wrong.";
    throw new ApiError(detail, res.status);
  }
  return data as T;
}

export async function fetchConsultationLogs(courseId: string): Promise<ConsultationLog[]> {
  const data = await request<RawLog[]>(`/api_consultation/read?course_id=${encodeURIComponent(courseId)}`);
  return data.map(toLog);
}

export async function fetchConsultationLog(courseId: string, logId: string): Promise<ConsultationLog> {
  const data = await request<RawLog>(
    `/api_consultation/read?course_id=${encodeURIComponent(courseId)}&log_id=${encodeURIComponent(logId)}`,
  );
  return toLog(data);
}

export async function createConsultationLog(courseId: string, values: NewConsultationLog): Promise<ConsultationLog> {
  const data = await request<RawLog>("/api_consultation/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      course_id: courseId,
      title: values.title,
      consultant: values.consultantEmail,
      consultation_date: values.date,
      description: values.details,
    }),
  });
  return toLog(data);
}

export async function updateConsultationLog(
  courseId: string,
  logId: string,
  values: NewConsultationLog,
): Promise<ConsultationLog> {
  const data = await request<RawLog>("/api_consultation/edit", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      course_id: courseId,
      log_id: logId,
      title: values.title,
      consultant: values.consultantEmail,
      consultation_date: values.date,
      description: values.details,
    }),
  });
  return toLog(data);
}

export async function fetchCourseName(courseId: string): Promise<string> {
  const data = await request<{ course_name: string }>(
    `/api_course/read_name?course_id=${encodeURIComponent(courseId)}`,
  );
  return data.course_name;
}