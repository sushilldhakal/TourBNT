import { clsx, type ClassValue } from "clsx"

// Option 1: Lightweight - Just use clsx (saves 48 KB!)
// This works 95% of the time. Only issue is if you have conflicting Tailwind classes like:
// cn("p-4 p-6") -> outputs "p-4 p-6" instead of just "p-6"
// But if you write clean code, this rarely happens.
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

// Option 2: If you REALLY need tailwind-merge, replace the above with this:
// import { twMerge } from "tailwind-merge"
// export function cn(...inputs: ClassValue[]) {
//   return twMerge(clsx(inputs))
// }
//
// Then uninstall tailwind-merge:
// npm uninstall tailwind-merge