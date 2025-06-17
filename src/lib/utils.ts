
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parse, isValid, differenceInDays, isBefore, parseISO } from "date-fns"

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
    } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/.test(dateString)) {
      // ISO string like "2024-08-15T10:20:30Z" or "2024-08-15T10:20:30.000Z"
      parsedDate = parseISO(dateString);
    }
     else {
      // Fallback to default Date constructor for YYYY-MM-DD or other recognizable formats
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

export function generateRandomPassword(length = 14): string {
  const lowercaseChars = "abcdefghijklmnopqrstuvwxyz";
  const uppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numberChars = "0123456789";
  const symbolChars = "!@#$%^&*()_+-=[]{};':\",./<>?";
  
  const allChars = lowercaseChars + uppercaseChars + numberChars + symbolChars;
  
  let password = "";
  
  // Ensure at least one of each type
  password += lowercaseChars[Math.floor(Math.random() * lowercaseChars.length)];
  password += uppercaseChars[Math.floor(Math.random() * uppercaseChars.length)];
  password += numberChars[Math.floor(Math.random() * numberChars.length)];
  password += symbolChars[Math.floor(Math.random() * symbolChars.length)];
  
  // Fill the rest of the password length
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password to make it more random
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

export function getExpirationStatus(dateString?: string): "expired" | "expiring_soon" | "active" | "unknown" {
  if (!dateString || dateString === "N/A") return "unknown";

  let parsedDate: Date;
  try {
    // Attempt to parse common formats
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) { // DD/MM/YYYY
      parsedDate = parse(dateString, "dd/MM/yyyy", new Date());
    } else if (/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(dateString)) { // YYYY-MM-DD or ISO
        if (dateString.includes('T')) {
            parsedDate = parseISO(dateString);
        } else {
             parsedDate = parse(dateString, "yyyy-MM-dd", new Date());
        }
    } else {
      parsedDate = new Date(dateString); // Fallback for other Date constructor parsable formats
    }
    
    if (!isValid(parsedDate)) {
      return "unknown";
    }
  } catch (e) {
    return "unknown";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today to the beginning of the day

  const expirationDateOnly = new Date(parsedDate);
  expirationDateOnly.setHours(0,0,0,0); // Normalize expiration to beginning of day

  if (isBefore(expirationDateOnly, today)) {
    return "expired";
  }

  const daysDiff = differenceInDays(expirationDateOnly, today);
  if (daysDiff <= 7) {
    return "expiring_soon";
  }

  return "active";
}

export function getCoreApiErrorMessage(fullErrorMessage: string | undefined): string {
  if (!fullErrorMessage) return "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.";
  
  if (fullErrorMessage === "SESSION_EXPIRED") {
    return "Phiên của bạn đã hết hạn. Vui lòng đăng nhập lại.";
  }

  const prefix = "Server error: ";
  const index = fullErrorMessage.indexOf(prefix);
  if (index !== -1) {
    return fullErrorMessage.substring(index + prefix.length);
  }
  
  // Fallback for messages that don't match the "Server error: " prefix exactly,
  // but might still be from our API error handling (e.g., proxy errors before hitting the actual API)
  // or other client-side errors.
  return fullErrorMessage;
}

