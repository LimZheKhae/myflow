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

// Money formatting with thousand separators
export interface MoneyFormatOptions {
  currency?: string
  locale?: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  showCurrency?: boolean
  showSymbol?: boolean
}

export const formatMoney = (
  amount: number | string,
  options: MoneyFormatOptions = {}
): string => {
  const {
    currency = 'MYR',
    locale = 'en-MY',
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    showCurrency = true,
    showSymbol = true
  } = options;

  // Convert string to number if needed
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Handle invalid numbers
  if (isNaN(numericAmount)) {
    return '0.00';
  }

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: showCurrency ? 'currency' : 'decimal',
      currency: showCurrency ? currency : undefined,
      minimumFractionDigits,
      maximumFractionDigits,
      useGrouping: true, // This enables thousand separators
    });

    let formatted = formatter.format(numericAmount);
    
    // If we don't want to show currency symbol but want currency formatting
    if (!showSymbol && showCurrency) {
      // Remove currency symbol but keep formatting
      const symbolRegex = /[^\d\s.,-]/g;
      formatted = formatted.replace(symbolRegex, '').trim();
    }

    return formatted;
  } catch (error) {
    // Fallback formatting if Intl.NumberFormat fails
    return numericAmount.toLocaleString(locale, {
      minimumFractionDigits,
      maximumFractionDigits,
    });
  }
};

// Simple thousand separator function (without currency)
export const formatNumber = (
  value: number | string,
  options: {
    locale?: string
    minimumFractionDigits?: number
    maximumFractionDigits?: number
  } = {}
): string => {
  const {
    locale = 'en-MY',
    minimumFractionDigits = 0,
    maximumFractionDigits = 2
  } = options;

  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numericValue)) {
    return '0';
  }

  return numericValue.toLocaleString(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  });
};

// Currency-specific formatters
export const formatMYR = (amount: number | string): string => {
  return formatMoney(amount, { currency: 'MYR', locale: 'en-MY' });
};

export const formatUSD = (amount: number | string): string => {
  return formatMoney(amount, { currency: 'USD', locale: 'en-US' });
};

export const formatVND = (amount: number | string): string => {
  return formatMoney(amount, { currency: 'VND', locale: 'vi-VN' });
};

export const formatGBP = (amount: number | string): string => {
  return formatMoney(amount, { currency: 'GBP', locale: 'en-GB' });
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
