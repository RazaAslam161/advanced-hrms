import type { ReactNode } from 'react';
import { DndContext, type DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { cn } from '../lib/utils';

export interface KanbanItem {
  _id: string;
  name: string;
  stage: string;
  email?: string;
}

const DraggableCard = ({ item }: { item: KanbanItem }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item._id });
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-grab touch-none rounded-xl border border-white/10 bg-white/6 p-3 active:cursor-grabbing"
    >
      <p className="font-medium text-white">{item.name}</p>
      <p className="text-xs text-white/45">{item.email}</p>
    </div>
  );
};

const DroppableColumn = ({ column, count, children }: { column: string; count: number; children: ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({ id: column });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'space-y-3 rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4 shadow-panel transition',
        isOver && 'border-secondary/60 bg-secondary/10',
      )}
    >
      <div>
        <h3 className="font-semibold text-white">{column}</h3>
        <p className="text-xs text-white/45">{count} candidates</p>
      </div>
      <div className="min-h-[3rem] space-y-3">{children}</div>
    </div>
  );
};

export const KanbanBoard = ({
  items,
  columns,
  onMove,
}: {
  items: KanbanItem[];
  columns: string[];
  onMove: (id: string, stage: string) => void;
}) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const candidateId = event.active.id.toString();
    const targetStage = event.over?.id?.toString();
    if (!targetStage) {
      return;
    }

    const current = items.find((item) => item._id === candidateId);
    if (current && current.stage !== targetStage) {
      onMove(candidateId, targetStage);
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {columns.map((column) => (
          <DroppableColumn key={column} column={column} count={items.filter((item) => item.stage === column).length}>
            {items
              .filter((item) => item.stage === column)
              .map((item) => (
                <DraggableCard key={item._id} item={item} />
              ))}
          </DroppableColumn>
        ))}
      </div>
    </DndContext>
  );
};
