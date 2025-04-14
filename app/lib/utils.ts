import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts a UTC date string to the local timezone
 * @param dateString ISO date string in UTC timezone
 * @returns Date object in local timezone
 */
export function utcToLocalDate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Formats a date for display in the user's local timezone
 * @param dateString ISO date string in UTC timezone
 * @param options Intl.DateTimeFormatOptions for customizing output format
 * @returns Formatted date string in local timezone
 */
export function formatLocalDate(
  dateString: string, 
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }
): string {
  const date = utcToLocalDate(dateString);
  return new Intl.DateTimeFormat(navigator.language, options).format(date);
}

/**
 * Formats a datetime for display in the user's local timezone
 * @param dateString ISO date string in UTC timezone
 * @param options Intl.DateTimeFormatOptions for customizing output format
 * @returns Formatted datetime string in local timezone
 */
export function formatLocalDateTime(
  dateString: string,
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  }
): string {
  const date = utcToLocalDate(dateString);
  return new Intl.DateTimeFormat(navigator.language, options).format(date);
}

/**
 * Converts a local date to ISO date string in UTC timezone
 * @param date Date object in local timezone
 * @returns ISO date string in UTC timezone (YYYY-MM-DD)
 */
export function localDateToUTCString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Gets the current date in local timezone as YYYY-MM-DD
 */
export function getCurrentLocalDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
