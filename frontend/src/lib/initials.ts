// The initials an avatar shows when there is no photograph (TD-30): the first
// letter of each of the first two words — a letter, not a character, so
// "Redazione (bozze da fonti pubbliche)" is "RB" and not "R(".
export const initials = (name: string | null | undefined): string =>
  (name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.match(/\p{L}/u)?.[0]?.toUpperCase() ?? '')
    .filter(Boolean)
    .slice(0, 2)
    .join('')
