// Calls and checks for marking dates available / unavailable on the staff Appointments page.
//   available   = a slot exists for the date  -> create one
//   unavailable = no slot exists for the date -> delete them
// Requests go through the proxy routes in app/api_appointment.

export type NewSlotInput = {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  maxBookings: number;
  hostEmail: string; // the lecturer or TA creating the slot
  hostRole: "lecturer" | "ta"; // decides which list of the slot's hosts the email goes in
};

function errorText(data: unknown, fallback: string) {
  if (typeof data === "object" && data !== null && "detail" in data) {
    const detail = (data as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
  }
  return fallback;
}

async function send(url: string, method: "POST" | "DELETE", body: unknown, fallback: string) {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Unable to reach the server.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(errorText(data, fallback));
}

export async function createSlot(courseId: string, input: NewSlotInput) {
  await send(
    "/api_appointment/create",
    "POST",
    {
      course_id: courseId,
      appointment_head:
        input.hostRole === "ta"
          ? { lecturer: [], ta: [input.hostEmail] }
          : { lecturer: [input.hostEmail], ta: [] },
      available_date: input.date,
      start_time: `${input.startTime}:00`,
      end_time: `${input.endTime}:00`,
      notes: null,
      max_bookings: input.maxBookings,
    },
    "Couldn't mark this date as available.",
  );
}

// Also deletes every student booking on the slot (backend behaviour).
export async function deleteSlot(courseId: string, slotId: number) {
  await send("/api_appointment/delete", "DELETE", { course_id: courseId, slot_id: slotId }, "Couldn't remove this slot.");
}

// Mirrors the backend rules so mistakes show up before sending.
export function validateSlotInput(i: { start: string; end: string; max: string }): string | null {
  if (!i.start || !i.end) return "Enter a start and end time.";
  if (i.end <= i.start) return "End time must be after the start time.";
  const n = Number(i.max);
  if (!Number.isInteger(n) || n < 1) return "Max students must be a whole number of at least 1.";
  return null;
}

export type StaffContext = {
  role: "lecturer" | "ta" | "admin" | null; // null = not a lecturer/TA of this course or an admin (or unknown)
  email: string;
  problem: string | null; // set when the permission check itself failed
};

// Lecturers and TAs of the course, and admins, can change availability (the backend enforces this too).
export async function fetchStaffContext(courseId: string): Promise<StaffContext> {
  const failed = { role: null, email: "", problem: "Couldn't check your permissions." } as const;
  try {
    const [coursesRes, meRes] = await Promise.all([
      fetch("/api_course/read", { credentials: "include" }),
      fetch("/api_auth/me", { credentials: "include" }),
    ]);
    if (!coursesRes.ok || !meRes.ok) return failed;
    const courses: { course_id: string; role: string }[] = await coursesRes.json();
    const me: { email: string } = await meRes.json();
    const role = courses.find((c) => c.course_id === courseId)?.role;
    return { role: role === "lecturer" || role === "ta" || role === "admin" ? role : null, email: me.email ?? "", problem: null };
  } catch {
    return failed;
  }
}
