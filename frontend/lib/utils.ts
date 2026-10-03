import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Combine class names AND resolve Tailwind conflicts, so a className passed to a shared component overrides
// its defaults (cn("bg-transparent", "bg-background") -> "bg-background").
//
// This used to be clsx alone, to save a few KB. Without merging, both conflicting classes stay and whichever
// Tailwind happens to emit later wins, which silently broke overrides across the site (e.g. inputs and selects
// kept their see-through dark-mode backgrounds, hiding placeholder text).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
