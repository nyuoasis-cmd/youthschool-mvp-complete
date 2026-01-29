import { Input } from "@/components/ui/input";
import { calculateDateRange } from "@/utils/dateFormat";

export type DateRangeValue = {
  start: string;
  end: string;
};

interface DateRangePickerProps {
  label: string;
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  showDaysBadge?: boolean;
  showSchoolDays?: boolean;
  autoTagLabel?: string;
  startAriaLabel?: string;
  endAriaLabel?: string;
}

export default function DateRangePicker({
  label,
  value,
  onChange,
  showDaysBadge = false,
  showSchoolDays = true,
  autoTagLabel,
  startAriaLabel,
  endAriaLabel,
}: DateRangePickerProps) {
  const range = calculateDateRange(value.start, value.end);

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-foreground">
        {label}
        {autoTagLabel ? (
          <span className="ml-2 inline-flex items-center rounded bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-600">
            {autoTagLabel}
          </span>
        ) : null}
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="date"
          value={value.start}
          onChange={(event) => onChange({ ...value, start: event.target.value })}
          aria-label={startAriaLabel || `${label} 시작 날짜`}
          className="h-10 w-[160px] rounded-lg border border-border bg-background"
        />
        <span className="text-sm text-muted-foreground">~</span>
        <Input
          type="date"
          value={value.end}
          onChange={(event) => onChange({ ...value, end: event.target.value })}
          aria-label={endAriaLabel || `${label} 종료 날짜`}
          className="h-10 w-[160px] rounded-lg border border-border bg-background"
        />
        {showDaysBadge && range ? (
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-600">
            📅 {range.totalDays}일간
            {showSchoolDays && typeof range.schoolDays === "number"
              ? ` (수업 ${range.schoolDays}일)`
              : ""}
          </div>
        ) : null}
      </div>
    </div>
  );
}
