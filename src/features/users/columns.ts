import type { TableColumn } from "@/components/table/columns"

/**
 * The team table's optional columns. The person is not among them: they name
 * the row, so that column always shows, and nor are the row actions.
 */
export type UserColumnKey = "email" | "role" | "lastSignIn" | "joined"

export const USER_COLUMNS: TableColumn<UserColumnKey>[] = [
  { key: "email", label: "Email address", width: "min-w-[200px]" },
  { key: "role", label: "Role", width: "min-w-[120px]" },
  { key: "lastSignIn", label: "Last Logged In", width: "min-w-[150px]" },
  { key: "joined", label: "Joined", width: "min-w-[130px]" },
]

export const DEFAULT_USER_COLUMNS: UserColumnKey[] = ["email", "role", "lastSignIn"]

/** Where the chosen columns and their order are remembered, per browser. */
export const USER_COLUMNS_STORAGE_KEY = "settings.users.columns.v2"

export type UserSortValue = "user" | UserColumnKey

export const USER_SORTS: { value: UserSortValue; label: string }[] = [
  { value: "user", label: "Profile name" },
  ...USER_COLUMNS.map((column) => ({
    value: column.key as UserSortValue,
    label: column.label,
  })),
]

export const DEFAULT_USER_SORT: UserSortValue = "user"

/** The filter value standing for someone who has no role yet. */
export const NO_ROLE = "none"
