/**
 * Date utilities
 * Provides helpers to work with device-local date/time values.
 */

/**
 * Returns the current date/time in the user's local timezone.
 * Relies on the device clock, respecting platform-specific timezone settings.
 */
export const getDeviceCurrentDate = (): Date => {
  // `new Date()` leverages the host environment's timezone configuration.
  // Wrapping it here ensures a single abstraction point for future adjustments.
  return new Date();
};

/**
 * Formats a date into an ISO YYYY-MM-DD string without converting to UTC.
 */
export const formatDateToLocalISO = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parses a YYYY-MM-DD string into a Date object using local timezone semantics.
 */
export const parseLocalISODate = (isoDate: string): Date => {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
};

/**
 * Convenience helper for retrieving today's date formatted as local ISO.
 */
export const getTodayLocalISO = (): string => {
  return formatDateToLocalISO(getDeviceCurrentDate());
};

/**
 * Calculates the user's age in years from their date of birth.
 * Accounts for whether the birthday has occurred yet this calendar year.
 *
 * @param dateOfBirth - Date of birth in ISO string format (YYYY-MM-DD)
 * @returns Age in whole years, or null if dateOfBirth is invalid/missing
 */
export const calculateAge = (dateOfBirth: string | null | undefined): number | null => {
  if (!dateOfBirth) return null;

  try {
    const birth = parseLocalISODate(dateOfBirth);
    const today = getDeviceCurrentDate();

    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age >= 0 ? age : null;
  } catch {
    return null;
  }
};

/**
 * Checks if today is the user's birthday based on their date of birth.
 * Uses the device's local timezone to ensure accuracy regardless of timezone.
 * 
 * @param dateOfBirth - Date of birth in ISO string format (YYYY-MM-DD)
 * @returns true if today is the user's birthday, false otherwise
 */
export const isUserBirthday = (dateOfBirth: string | null | undefined): boolean => {
  if (!dateOfBirth) {
    return false;
  }

  try {
    // Parse the birth date using local timezone
    const birthDate = parseLocalISODate(dateOfBirth);
    
    // Get today's date using local timezone
    const today = getDeviceCurrentDate();
    
    // Compare month and day (ignore year)
    return birthDate.getMonth() === today.getMonth() && 
           birthDate.getDate() === today.getDate();
  } catch (error) {
    console.warn('[DateUtils] Error parsing birth date:', dateOfBirth, error);
    return false;
  }
};
