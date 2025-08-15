import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { DateRange } from "react-day-picker"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Global export function for CSV export
export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) {
    console.error("No data to export");
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle nested objects and arrays
        if (typeof value === 'object' && value !== null) {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        return `"${String(value || '').replace(/"/g, '""')}"`;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  console.log(`Exported ${data.length} records to ${filename}.csv`);
};

// Date helpers
export const formatDateDDMMYYYY = (date: Date) => {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export const formatDateISO = (date: Date) => {
  // YYYY-MM-DD
  return date.toISOString().split("T")[0]
}

export const formatDateRangeLabel = (
  range: DateRange | undefined,
  formatter: (d: Date) => string = formatDateDDMMYYYY
) => {
  if (range?.from && range?.to) {
    return `${formatter(range.from)} - ${formatter(range.to)}`
  }
  if (range?.from && !range?.to) {
    return `${formatter(range.from)} - `
  }
  if (!range?.from && range?.to) {
    return ` - ${formatter(range.to)}`
  }
  return "Select date range"
}
