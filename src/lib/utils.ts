import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string) {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/** Converts a display name to a URL-friendly slug */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")   // strip special chars
    .replace(/\s+/g, "-")        // spaces → hyphens
    .replace(/-+/g, "-");        // collapse consecutive hyphens
}

/** Generates a predicate function for date range filtering */
export function getDateFilterPredicate(filter: string) {
  if (filter === "All time" || !filter) return () => true;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);

  return (dateStr: string) => {
    const targetDate = new Date(dateStr);
    if (isNaN(targetDate.getTime())) return false;
    
    if (filter === "Today") return targetDate >= today;
    if (filter === "Yesterday") return targetDate >= yesterday && targetDate < today;
    if (filter === "Last 7 Days") return targetDate >= sevenDaysAgo;
    if (filter === "This Month") return targetDate >= thisMonthStart;
    if (filter === "Last Month") return targetDate >= lastMonthStart && targetDate <= lastMonthEnd;
    return true;
  };
}
