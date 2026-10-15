export const AIR_MOUSE_NOTICE = 'این برنامه با ایرماوس قابل استفاده است'

export function appDescription(description: string, needsAirMouse: boolean) {
  // Keep repeated saves from adding the notice more than once.
  const text = description.trim().replace(/^(?:این برنامه با ایرماوس قابل استفاده است[.。]?\s*)+/, '')
  return needsAirMouse ? `${AIR_MOUSE_NOTICE}\n${text}` : text
}

export function shortAppDescription(description: string) {
  return description.trim().replace(/\s+/g, ' ').slice(0, 1000)
}
