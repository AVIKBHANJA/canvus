// Re-export the canonical Drop types from `lib/types` so existing
// component imports (`@/components/types`) keep working.
export type { Drop, DropType, DropRow } from "@/lib/types";
export { fromRow } from "@/lib/types";
