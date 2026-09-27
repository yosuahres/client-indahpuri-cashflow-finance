/**
 * The boxed table the Settings lists share: a rounded frame, ruled columns,
 * and the pager sitting in the frame's foot.
 */
export const TABLE_FRAME = "overflow-hidden rounded-xl border border-black/12 bg-white"
export const TABLE = "w-full border-collapse text-sm"
export const HEAD_ROW = "divide-x divide-black/12 border-b border-black/12 bg-neutral-50"
export const HEAD_CELL = "px-3 py-2 text-left text-[13px] font-medium whitespace-nowrap text-neutral-600"
export const BODY_ROW = "divide-x divide-black/12 border-b border-black/12 last:border-b-0"
export const CELL = "px-3 py-2 text-neutral-600"
/** The "⋯" column: pinned to the right edge so a wide table never scrolls it away. */
export const ACTION_CELL = "sticky right-0 w-12 bg-white px-1 py-1 text-center"
export const ACTION_HEAD = "sticky right-0 w-12 bg-neutral-50"

/** The buttons in a table's toolbar — Filter, Columns — and the search box beside them. */
export const TOOLBAR_BUTTON =
  "inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-black/10 bg-white px-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-800 sm:h-8"
export const TOOLBAR_SEARCH =
  "h-9 w-full rounded-xl border border-black/10 bg-white pr-3 pl-9 text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-2 focus:outline-offset-0 focus:outline-neutral-800 sm:h-8 sm:text-sm"
