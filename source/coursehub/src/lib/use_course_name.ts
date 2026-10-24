"use client";

import { useEffect, useState } from "react";
import { fetchCourseName } from "@/lib/consultation";

// Returns the course name for the header, or null while loading / if it can't be loaded.
export function useCourseName(courseId: string | undefined) {
  const [name, setName] = useState<{ courseId: string; value: string } | null>(null);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    fetchCourseName(courseId)
      .then((value) => !cancelled && setName({ courseId, value }))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  return name && name.courseId === courseId ? name.value : null;
}