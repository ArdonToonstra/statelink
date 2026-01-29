/**
 * Calendar utilities for generating .ics files and Google Calendar URLs
 * for vibe check-in reminders
 */

export type CalendarFrequency = 'daily' | 'every-other-day' | 'weekly'

export interface CalendarOptions {
    /** Time in 24-hour format, e.g., "09:00" */
    time: string
    /** Recurrence frequency */
    frequency: CalendarFrequency
    /** For weekly: days of week (0=Sunday, 1=Monday, etc.) */
    days?: number[]
    /** URL to the check-in page */
    checkInUrl: string
}

/**
 * Convert day number to RRULE day abbreviation
 */
function dayToRrule(day: number): string {
    const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
    return days[day] || 'MO'
}

/**
 * Format date to iCalendar format (YYYYMMDDTHHMMSS)
 */
function formatIcsDate(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`
}

/**
 * Generate RRULE string based on frequency and days
 */
function generateRrule(frequency: CalendarFrequency, days?: number[]): string {
    switch (frequency) {
        case 'daily':
            return 'RRULE:FREQ=DAILY'
        case 'every-other-day':
            return 'RRULE:FREQ=DAILY;INTERVAL=2'
        case 'weekly':
            if (days && days.length > 0) {
                const byDay = days.map(dayToRrule).join(',')
                return `RRULE:FREQ=WEEKLY;BYDAY=${byDay}`
            }
            return 'RRULE:FREQ=WEEKLY;BYDAY=MO'
        default:
            return 'RRULE:FREQ=DAILY'
    }
}

/**
 * Generate a unique ID for the calendar event
 */
function generateUid(): string {
    return `vibecheck-${Date.now()}-${Math.random().toString(36).substring(2, 11)}@groupvibes.app`
}

/**
 * Generate .ics file content for a recurring vibe check-in reminder
 */
export function generateIcsContent(options: CalendarOptions): string {
    const { time, frequency, days, checkInUrl } = options

    // Parse time
    const [hours, minutes] = time.split(':').map(Number)

    // Create start date (today at specified time)
    const startDate = new Date()
    startDate.setHours(hours, minutes, 0, 0)

    // If time has already passed today, start tomorrow
    if (startDate < new Date()) {
        startDate.setDate(startDate.getDate() + 1)
    }

    // End date is 15 minutes after start (reminder duration)
    const endDate = new Date(startDate)
    endDate.setMinutes(endDate.getMinutes() + 15)

    const rrule = generateRrule(frequency, days)
    const uid = generateUid()
    const now = formatIcsDate(new Date())

    const description = `Time for your vibe check-in!\\n\\nClick here to check in: ${checkInUrl}`

    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//GroupVibes//Vibe Check-in//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${now}`,
        `DTSTART:${formatIcsDate(startDate)}`,
        `DTEND:${formatIcsDate(endDate)}`,
        `SUMMARY:Vibe Check-in Reminder`,
        `DESCRIPTION:${description}`,
        `URL:${checkInUrl}`,
        rrule,
        'BEGIN:VALARM',
        'TRIGGER:-PT5M',
        'ACTION:DISPLAY',
        'DESCRIPTION:Vibe check-in in 5 minutes!',
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR',
    ].join('\r\n')

    return icsContent
}

/**
 * Download .ics file in the browser
 */
export function downloadIcsFile(options: CalendarOptions): void {
    const content = generateIcsContent(options)
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = 'vibe-checkin-reminder.ics'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

/**
 * Generate Google Calendar URL for adding a recurring event
 */
export function generateGoogleCalendarUrl(options: CalendarOptions): string {
    const { time, frequency, days, checkInUrl } = options

    // Parse time
    const [hours, minutes] = time.split(':').map(Number)

    // Create start date (today at specified time)
    const startDate = new Date()
    startDate.setHours(hours, minutes, 0, 0)

    // If time has already passed today, start tomorrow
    if (startDate < new Date()) {
        startDate.setDate(startDate.getDate() + 1)
    }

    // End date is 15 minutes after start
    const endDate = new Date(startDate)
    endDate.setMinutes(endDate.getMinutes() + 15)

    // Format dates for Google Calendar (YYYYMMDDTHHMMSS format)
    const formatGoogleDate = (date: Date) => {
        const pad = (n: number) => n.toString().padStart(2, '0')
        return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`
    }

    // Build recurrence rule for Google Calendar
    let recur = ''
    switch (frequency) {
        case 'daily':
            recur = 'RRULE:FREQ=DAILY'
            break
        case 'every-other-day':
            recur = 'RRULE:FREQ=DAILY;INTERVAL=2'
            break
        case 'weekly':
            if (days && days.length > 0) {
                const byDay = days.map(dayToRrule).join(',')
                recur = `RRULE:FREQ=WEEKLY;BYDAY=${byDay}`
            } else {
                recur = 'RRULE:FREQ=WEEKLY;BYDAY=MO'
            }
            break
    }

    const title = 'Vibe Check-in Reminder'
    const description = `Time for your vibe check-in!\n\nClick here to check in: ${checkInUrl}`

    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: title,
        dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
        details: description,
        recur: recur,
    })

    return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Get human-readable description of the calendar schedule
 */
export function getScheduleDescription(options: Pick<CalendarOptions, 'time' | 'frequency' | 'days'>): string {
    const { time, frequency, days } = options

    // Convert 24h time to 12h format
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    const timeStr = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`

    switch (frequency) {
        case 'daily':
            return `Every day at ${timeStr}`
        case 'every-other-day':
            return `Every other day at ${timeStr}`
        case 'weekly':
            if (days && days.length > 0) {
                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                const selectedDays = days.sort().map(d => dayNames[d]).join(', ')
                return `Every ${selectedDays} at ${timeStr}`
            }
            return `Weekly at ${timeStr}`
        default:
            return `At ${timeStr}`
    }
}
