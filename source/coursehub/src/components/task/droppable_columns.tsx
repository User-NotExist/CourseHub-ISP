import { useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";

export function DroppableColumn({
  id,
  className = "",
  children,
}: {
  id: string;
  className?: string;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`${className} transition-shadow ${isOver ? "outline outline-2 -outline-offset-2 outline-brand" : ""}`}
    >
      {children}
    </div>
  );
}