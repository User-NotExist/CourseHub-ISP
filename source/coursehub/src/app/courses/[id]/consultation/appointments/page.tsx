import AppointmentsPage from "@/components/appointments";

// Route: /courses/[id]/consultation/appointments
// The w-full wrapper matches the Main page route; without it the cards get squashed by the layout.
export default function Page() {
  return (
    <div className="w-full">
      <AppointmentsPage />
    </div>
  );
}