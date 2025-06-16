
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parse, isValid } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateForDisplay(dateString?: string): string {
  if (!dateString || dateString === "N/A") return "N/A"
  try {
    let parsedDate: Date;
    // Try parsing DD/MM/YYYY first
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
      parsedDate = parse(dateString, "dd/MM/yyyy", new Date())
    } else {
      // Fallback to default Date constructor for ISO or YYYY-MM-DD
      parsedDate = new Date(dateString)
    }

    if (!isValid(parsedDate)) return dateString // Return original if invalid
    // For timestamps, format with time. For dates only, format without time.
    if (dateString.includes("T") || dateString.includes(":")) {
      return format(parsedDate, "MMM d, yyyy, h:mm:ss a");
    }
    return format(parsedDate, "MMM d, yyyy")
  } catch (e) {
    return dateString // Fallback to original string if formatting fails
  }
}

export function formatDateForInput(dateString: string): string {
  if (!dateString) return ""
  try {
    let parsedDate: Date;
    // Try parsing DD/MM/YYYY first
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
      parsedDate = parse(dateString, "dd/MM/yyyy", new Date())
    } else {
      // Fallback to default Date constructor for ISO or YYYY-MM-DD
      parsedDate = new Date(dateString)
    }
    
    if (!isValid(parsedDate)) return dateString; // Return original if invalid
    return format(parsedDate, "yyyy-MM-dd"); // Format to YYYY-MM-DD for date input
  } catch (e) {
    return dateString // Fallback to original string
  }
}

export function formatDateForAPI(dateString: string): string {
  if (!dateString) return "";
  try {
    // If already DD/MM/YYYY, no major conversion needed, but re-parse and format to ensure validity and consistency
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
       const parsed = parse(dateString, "dd/MM/yyyy", new Date());
       if (isValid(parsed)) return format(parsed, "dd/MM/yyyy");
       // If it looked like DD/MM/YYYY but wasn't valid, fall through to attempt with new Date()
    }
    
    // If YYYY-MM-DD (from date input) or ISO string, convert
    const date = new Date(dateString);
    if (!isValid(date)) { // Check if date is valid
        // console.warn("Invalid date string for API formatting:", dateString);
        return dateString; // If invalid date, return original to let backend handle/error
    }

    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0"); // Month is 0-indexed
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    console.error("Error formatting date for API:", e, "Original string:", dateString);
    return dateString; // Fallback
  }
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
