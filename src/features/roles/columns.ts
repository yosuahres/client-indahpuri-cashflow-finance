import type { TableColumn } from "@/components/table/columns"

/**
 * The roles table's optional columns. The role itself names the row, so that
 * column always shows, and the row actions stay pinned to the end.
 */
export type RoleColumnKey = "key" | "description" | "builtIn" | "members" | "permissions"

export const ROLE_COLUMNS: TableColumn<RoleColumnKey>[] = [
  { key: "key", label: "Key", width: "min-w-[140px]" },
  { key: "description", label: "Description", width: "min-w-[220px]" },
  { key: "builtIn", label: "Built In", width: "min-w-[90px]" },
  { key: "members", label: "Users", width: "min-w-[90px]" },
  { key: "permissions", label: "Permissions", width: "min-w-[130px]" },
]

/** The description rides under the name by default, as does the Built in tag. */
export const DEFAULT_ROLE_COLUMNS: RoleColumnKey[] = ["members", "permissions"]

/** Where the chosen columns and their order are remembered, per browser. */
export const ROLE_COLUMNS_STORAGE_KEY = "settings.roles.columns"

export type RoleSortValue = "role" | RoleColumnKey

export const ROLE_SORTS: { value: RoleSortValue; label: string }[] = [
  { value: "role", label: "Role" },
  ...ROLE_COLUMNS.map((column) => ({
    value: column.key as RoleSortValue,
    label: column.label,
  })),
]

export const DEFAULT_ROLE_SORT: RoleSortValue = "role"

/** Which roles to show: the fixed ones, or the ones this team added. */
export const ROLE_KINDS = [
  { value: "built_in", label: "Built in" },
  { value: "custom", label: "Added here" },
]
