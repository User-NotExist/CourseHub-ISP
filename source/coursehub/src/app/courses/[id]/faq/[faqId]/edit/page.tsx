import FaqForm from "@/components/faq-form"

export default async function EditFaqPage({
  params,
}: {
  params: Promise<{ faqId: string }>
}) {
  const { faqId } = await params
  return <FaqForm faqId={faqId} />
}