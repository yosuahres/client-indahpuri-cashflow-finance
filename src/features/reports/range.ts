import { PERIODICITIES, endOfYear, startOfYear, type Periodicity } from "./periods"

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function read(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key]
  return typeof value === "string" ? value : undefined
}

/** Turns the report's URL filters into a plain date range both statements use. */
export function readReportRange(params: Record<string, string | string[] | undefined>) {
  const thisYear = new Date().getUTCFullYear()

  const raw = read(params, "periodicity") as Periodicity | undefined
  const periodicity: Periodicity = raw && PERIODICITIES.includes(raw) ? raw : "Quarterly"

  const mode = read(params, "mode") === "range" ? "range" : "fiscal"

  // Which direction the ledger shows. "all" is the absence of a filter.
  const rawKind = read(params, "kind")
  const kind: "all" | "income" | "expense" =
    rawKind === "income" || rawKind === "expense" ? rawKind : "all"

  const fromYear = Number(read(params, "fromYear")) || thisYear
  const toYear = Math.max(Number(read(params, "toYear")) || thisYear, fromYear)

  const rawFrom = read(params, "from")
  const rawTo = read(params, "to")
  const customFrom = rawFrom && ISO_DATE.test(rawFrom) ? rawFrom : startOfYear(thisYear)
  const parsedTo = rawTo && ISO_DATE.test(rawTo) ? rawTo : endOfYear(thisYear)
  // A backwards range would produce zero columns; keep at least the start month.
  const customTo = parsedTo < customFrom ? customFrom : parsedTo

  return {
    periodicity,
    kind,
    mode: mode as "fiscal" | "range",
    fromYear,
    toYear,
    customFrom,
    customTo,
    from: mode === "range" ? customFrom : startOfYear(fromYear),
    to: mode === "range" ? customTo : endOfYear(toYear),
    company: read(params, "company")?.trim() || "indahpuri",
    today: new Date().toISOString().slice(0, 10),
  }
}
