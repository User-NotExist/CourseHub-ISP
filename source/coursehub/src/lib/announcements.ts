export type Announcement = {
  announcement_id: number
  announcement_owner_id: number
  creator: string
  title: string
  description: string | null
  comment_count: number
  createdAt: string
  updatedAt: string
  can_edit?: boolean
}

export function announcementErrorMessage(data: unknown, fallback: string) {
  if (typeof data !== "object" || data === null || !("detail" in data)) return fallback
  if (typeof data.detail === "string") return data.detail
  if (Array.isArray(data.detail) && data.detail[0]?.msg) return String(data.detail[0].msg)
  return fallback
}
