import { useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";

export function DroppableColumn({ id, children }: { id: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[200px] rounded-lg transition-colors ${isOver ? "bg-muted/60" : ""}`}
    >
      {children}
    </div>
  );
}