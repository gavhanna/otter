/**
 * Formats a date as "{Weekday} at {time}" for default recording names
 * @param date - The date to format (defaults to current date)
 * @returns Formatted string like "Monday at 2:30 PM"
 */
export function formatDefaultRecordingName(date: Date = new Date()): string {
    const weekdays = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
    ];
    const weekday = weekdays[date.getDay()];

    // Format time as 12-hour format with AM/PM
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12

    const timeString = `${hours}:${minutes
        .toString()
        .padStart(2, "0")} ${ampm}`;

    return `${weekday} at ${timeString}`;
}
