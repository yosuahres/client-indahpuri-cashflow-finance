/** Shared by the server that sets a flashed toast and the client that shows it. */
export const FLASH_COOKIE = "flash"

export type Flash = { kind: "success" | "error"; message: string }
