import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { DateRange } from "react-day-picker"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Debug SQL function to log SQL queries and their parameters
 * @param sql - The SQL query string with placeholders
 * @param params - The parameters array to bind to the SQL
 * @param label - Optional label for the log (default: "SQL Debug")
 */
export function debugSQL(sql: string, params: any[] = [], label: string = "SQL Debug") {
  console.log(`\n🔍 ${label}:`);
  console.log("📝 SQL Query:", sql);
  console.log("📊 Parameters:", params);
  
  // Create a formatted version showing parameter types
  const paramDetails = params.map((param, index) => ({
    position: index + 1,
    value: param,
    type: typeof param,
    isNull: param === null,
    isUndefined: param === undefined
  }));
  
  console.log("🔢 Parameter Details:", paramDetails);
  
  // Show the query with actual values (for debugging only - don't use in production)
  let debugQuery = sql;
  params.forEach((param, index) => {
    const placeholder = `?`;
    const value = param === null ? 'NULL' : 
                  param === undefined ? 'UNDEFINED' : 
                  typeof param === 'string' ? `'${param}'` : 
                  String(param);
    debugQuery = debugQuery.replace(placeholder, value);
  });
  
  console.log("🎯 Debug Query (with values):", debugQuery);
  console.log("─".repeat(80));
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

/**
 * Convert Snowflake file URL to our proxy endpoint URL for image display
 * @param snowflakeUrl - The Snowflake file URL (e.g., https://sm23176.ap-northeast-1.aws.snowflakecomputing.com/api/files/MY_FLOW/PUBLIC/IMAGE_FILES/mkt-proof-131-1755677533103.jpg)
 * @returns Our proxy endpoint URL for serving the image
 */
export function getImageProxyUrl(snowflakeUrl: string | null): string | null {
  if (!snowflakeUrl) return null;
  
  try {
    // Extract filename from Snowflake URL
    // URL format: https://sm23176.ap-northeast-1.aws.snowflakecomputing.com/api/files/MY_FLOW/PUBLIC/IMAGE_FILES/filename.jpg
    const urlParts = snowflakeUrl.split('/');
    const filename = urlParts[urlParts.length - 1];
    
    if (!filename) return null;
    
    // Create our proxy endpoint URL - using the same format as the working test-imageupload
    return `/api/gift-approval/serve-image?filename=${encodeURIComponent(filename)}&stage=MY_FLOW.PUBLIC.IMAGE_FILES`;
  } catch (error) {
    console.error('Error parsing Snowflake URL:', error);
    return null;
  }
}

/**
 * Convert Snowflake file URL to our download endpoint URL
 * @param snowflakeUrl - The Snowflake file URL (e.g., https://sm23176.ap-northeast-1.aws.snowflakecomputing.com/api/files/MY_FLOW/PUBLIC/IMAGE_FILES/mkt-proof-131-1755677533103.jpg)
 * @returns Our download endpoint URL for downloading the image
 */
export function getImageDownloadUrl(snowflakeUrl: string | null): string | null {
  if (!snowflakeUrl) return null;
  
  try {
    // Extract filename from Snowflake URL
    // URL format: https://sm23176.ap-northeast-1.aws.snowflakecomputing.com/api/files/MY_FLOW/PUBLIC/IMAGE_FILES/filename.jpg
    const urlParts = snowflakeUrl.split('/');
    const filename = urlParts[urlParts.length - 1];
    
    if (!filename) return null;
    
    // Create our download endpoint URL
    return `/api/gift-approval/download-image/${encodeURIComponent(filename)}`;
  } catch (error) {
    console.error('Error parsing Snowflake URL:', error);
    return null;
  }
}
