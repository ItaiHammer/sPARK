// Tailwind
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Tailwind Utility Function
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

