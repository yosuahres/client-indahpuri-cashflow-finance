import type { TableColumn } from "@/components/table/columns"

/**
 * The team table's optional columns. The person is not among them: they name
 * the row, so that column always shows, and nor are the row actions.
 */
export type UserColumnKey = "email" | "role" | "joined"

export const USER_COLUMNS: TableColumn<UserColumnKey>[] = [
  { key: "email", label: "Email", width: "min-w-[220px]" },
  { key: "role", label: "Role", width: "min-w-[170px]" },
  { key: "joined", label: "Joined", width: "min-w-[110px]" },
]

/** The email rides under the name by default, so it is not a column as well. */
export const DEFAULT_USER_COLUMNS: UserColumnKey[] = ["role", "joined"]

/** Where the chosen columns and their order are remembered, per browser. */
export const USER_COLUMNS_STORAGE_KEY = "settings.users.columns"

export type UserSortValue = "user" | UserColumnKey

export const USER_SORTS: { value: UserSortValue; label: string }[] = [
  { value: "user", label: "Name" },
  ...USER_COLUMNS.map((column) => ({
    value: column.key as UserSortValue,
    label: column.label,
  })),
]

export const DEFAULT_USER_SORT: UserSortValue = "user"

/** The filter value standing for someone who has no role yet. */
export const NO_ROLE = "none"
