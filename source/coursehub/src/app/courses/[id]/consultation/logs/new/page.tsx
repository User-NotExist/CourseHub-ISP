import ConsultationLogForm from "@/components/consultation/consultant_log_form"

// Route: /courses/[id]/consultation/logs/new
// (a static "new" segment wins over the dynamic [logId] segment)
export default function NewConsultationLogPage() {
  return <ConsultationLogForm />
}