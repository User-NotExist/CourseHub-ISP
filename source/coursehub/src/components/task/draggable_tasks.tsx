import { useDraggable } from "@dnd-kit/core";
import type { ReactNode } from "react";

export function DraggableTask({
  id,
  disabled = false,
  children,
}: {
  id: string | number;
  disabled?: boolean;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, disabled });

  // The card itself stays in place while dragging; a <DragOverlay> renders the
  // floating copy, so the column's overflow doesn't clip it.
  const style = {
    opacity: isDragging ? 0.4 : 1,
    cursor: disabled ? "default" : "grab",
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </div>
  );
}