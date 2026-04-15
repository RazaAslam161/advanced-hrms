import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Card } from './ui/card';

export interface KanbanItem {
  _id: string;
  name: string;
  stage: string;
  email?: string;
}

export const KanbanBoard = ({
  items,
  columns,
  onMove,
}: {
  items: KanbanItem[];
  columns: string[];
  onMove: (id: string, stage: string) => void;
}) => {
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const candidateId = event.active.id.toString();
    const targetStage = event.over?.id?.toString();
    if (targetStage) {
      onMove(candidateId, targetStage);
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="grid gap-4 xl:grid-cols-6 md:grid-cols-3">
        {columns.map((column) => (
          <Card key={column} id={column as never} className="space-y-3 bg-white/[0.04]">
            <div>
              <h3 className="font-semibold text-white">{column}</h3>
              <p className="text-xs text-white/45">{items.filter((item) => item.stage === column).length} candidates</p>
            </div>
            <div className="space-y-3">
              {items
                .filter((item) => item.stage === column)
                .map((item) => (
                  <div key={item._id} id={item._id} className="rounded-xl border border-white/10 bg-white/6 p-3">
                    <p className="font-medium text-white">{item.name}</p>
                    <p className="text-xs text-white/45">{item.email}</p>
                  </div>
                ))}
            </div>
          </Card>
        ))}
      </div>
    </DndContext>
  );
};
