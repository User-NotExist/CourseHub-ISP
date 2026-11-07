// Types, helpers and API calls for the staff Appointments page (Consultation > Appointments).
// All requests go through the Next.js proxy route in app/api_appointment.

export type Booking = {
  id: number;
  name: string;
  initials: string;
  email: string;
  description: string; // what the student wants to talk about, may be empty
};

export type AppointmentSlot = {
  id: number;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  hosts: { role: "Lecturer" | "TA"; email: string }[];
  notes: string;
  maxBookings: number;
  booked: number;
};

type RawSlot = {
  available_id: number; // (sic) the backend spells it this way
  appointment_head: { lecturer?: string[]; ta?: string[] } | null;
  available_date: string;
  start_time: string; // "HH:MM:SS"
  end_time: string;
  notes: string | null;
  max_bookings: number;
  booked: number;
};

type RawSlotDetail = RawSlot & {
  bookings: {
    appointment_id: number;
    student_first_name: string;
    student_last_name: string;
    student_email: string;
    appointments_description: string | null;
  }[];
};

const toSlot = (raw: RawSlot): AppointmentSlot => ({
  id: raw.available_id,
  date: raw.available_date,
  startTime: raw.start_time.slice(0, 5),
  endTime: raw.end_time.slice(0, 5),
  hosts: [
    ...(raw.appointment_head?.lecturer ?? []).map((email) => ({ role: "Lecturer" as const, email })),
    ...(raw.appointment_head?.ta ?? []).map((email) => ({ role: "TA" as const, email })),
  ],
  notes: raw.notes ?? "",
  maxBookings: raw.max_bookings,
  booked: raw.booked,
});

export const isFull = (slot: AppointmentSlot) => slot.booked >= slot.maxBookings;

async function request<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { credentials: "include", cache: "no-store" });
  } catch {
    throw new Error("Unable to reach the server.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(typeof data?.detail === "string" ? data.detail : "Something went wrong.");
  }
  return data as T;
}

export async function fetchAppointmentSlots(courseId: string): Promise<AppointmentSlot[]> {
  const data = await request<RawSlot[]>(`/api_appointment/read?course_id=${encodeURIComponent(courseId)}`);
  return data.map(toSlot);
}

// The list above only carries how many students booked; this returns who they are.
export async function fetchSlotBookings(courseId: string, slotId: number): Promise<Booking[]> {
  const data = await request<RawSlotDetail>(
    `/api_appointment/read?course_id=${encodeURIComponent(courseId)}&slot_id=${slotId}`,
  );
  return data.bookings.map((b) => ({
    id: b.appointment_id,
    name: `${b.student_first_name} ${b.student_last_name}`.trim(),
    initials: ((b.student_first_name[0] ?? "") + (b.student_last_name[0] ?? "")).toUpperCase() || "?",
    email: b.student_email,
    description: b.appointments_description ?? "",
  }));
}

// ---- date helpers (dates are "YYYY-MM-DD" keys, same as the Main page calendar) ----

const DAY_MS = 24 * 60 * 60 * 1000;

const toUTC = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

// whole days from today to a date (negative = past)
export const daysFromToday = (date: string, todayKey: string) =>
  Math.round((toUTC(date) - toUTC(todayKey)) / DAY_MS);

export const formatDate = (date: string) => {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
};

export const formatLongDate = (date: string) =>
  new Date(toUTC(date)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
