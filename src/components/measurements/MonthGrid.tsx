import { Button } from "@/components/ui/button";
import { monthGrid } from "@/lib/journal-calendar";

interface MonthGridProps {
  month: string;
  selectedDay: string;
  disabledDays: ReadonlySet<string>;
  onDaySelect: (day: string) => void;
}

function dayNumber(day: string): number {
  return Number(day.slice(8, 10));
}

export default function MonthGrid({ month, selectedDay, disabledDays, onDaySelect }: MonthGridProps) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {monthGrid(month).map((day) => {
        const pressed = day === selectedDay;
        return (
          <Button
            key={day}
            type="button"
            variant={pressed ? "default" : "outline"}
            className="min-w-9 px-2"
            aria-pressed={pressed}
            disabled={disabledDays.has(day)}
            onClick={() => {
              onDaySelect(day);
            }}
          >
            {dayNumber(day)}
          </Button>
        );
      })}
    </div>
  );
}
