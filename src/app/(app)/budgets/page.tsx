import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"

import { Topbar } from "@/components/layout/topbar"
import { listAccounts } from "@/features/accounts/actions"
import { SummaryTiles } from "@/components/report/summary-tiles"
import { Card, CardHeader } from "@/components/ui/card"
import { LoadingRegion, Skeleton } from "@/components/ui/skeleton"
import { BudgetFilters } from "@/features/budgets/components/budget-filters"
import { BudgetSheet } from "@/features/budgets/components/budget-table"
import { listBudgets } from "@/features/budgets/list"
import {
  periodLabel,
  periodQuery,
  readBudgetPeriod,
  type BudgetPeriodSelection,
} from "@/features/budgets/period"
import { longMonthName } from "@/features/reporting/months"

export const metadata: Metadata = {
  title: "Anggaran",
}

/** Holds the page's shape while the plans are on their way. */
function ListFallback() {
  return (
    <LoadingRegion label="Loading budgets">
      <div className="space-y-6 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((tile) => (
            <Skeleton key={tile} className="h-[86px]" />
          ))}
        </div>
        <div className="space-y-2">
          <Skeleton className="h-9" />
          {Array.from({ length: 6 }, (_, row) => (
            <Skeleton key={row} className="h-11" />
          ))}
        </div>
      </div>
    </LoadingRegion>
  )
}

/**
 * The plans themselves, kept apart from the page so the bar and the period
 * pickers can be sent before the database has answered.
 */
async function BudgetList({
  selection,
  account,
}: {
  selection: BudgetPeriodSelection
  account: string
}) {
  const { ok, error, entries: all } = await listBudgets(selection.year)

  // A plan naming no account was entered before accounts were, and the only
  // honest reading of it is "every account" — so it survives the filter.
  const entries = account
    ? all.filter((entry) => entry.account === null || entry.account === account)
    : all

  const monthly = selection.period === "monthly"
  const yearPlans = entries.filter((entry) => entry.month === null)
  const monthPlans = entries.filter((entry) => entry.month === selection.month)

  // What the Laporan Keuangan counts for this period, arrived at the same way
  // it does: a monthly plan in full in its own month, a yearly plan a twelfth
  // at a time. On a yearly view every plan counts once, whole.
  const planned = (kind: "income" | "expense") => {
    const sum = (rows: typeof entries, share: number) =>
      rows
        .filter((entry) => entry.kind === kind)
        .reduce((total, entry) => total + entry.amount * share, 0)

    return monthly
      ? sum(monthPlans, 1) + sum(yearPlans, 1 / 12)
      : sum(entries, 1)
  }

  const income = planned("income")
  const expense = planned("expense")
  const label = periodLabel(selection)

  return (
    <>
      {!ok ? (
        <p
          role="alert"
          className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6"
        >
          {error}
        </p>
      ) : null}

      <div className="space-y-6 p-4 sm:p-6">
        <SummaryTiles
          tiles={[
            { label: `Planned Income — ${label}`, value: income },
            { label: `Planned Expense — ${label}`, value: expense },
            { label: "Planned Net", value: income - expense, tone: "red" as const },
          ]}
        />

        {monthly ? (
          <>
            <Card className="overflow-hidden">
              <CardHeader
                title={`Budgets for ${label}`}
                caption="Entered against this month, and counted in it whole."
              />
              <div className="mt-4">
                <BudgetSheet entries={monthPlans} label={label} showAccount={!account} />
              </div>
            </Card>

            {/* Only when there are any: an empty panel explaining a rule that
                nothing on the page is following would be noise. */}
            {yearPlans.length > 0 ? (
              <Card className="overflow-hidden">
                <CardHeader
                  title={`Yearly plans for ${selection.year}`}
                  caption={`Levelled across the twelve months, so a twelfth of each lands in ${longMonthName(selection.month)}.`}
                />
                <div className="mt-4">
                  <BudgetSheet
                    entries={yearPlans}
                    label={String(selection.year)}
                    showPerMonth
                    showAccount={!account}
                  />
                </div>
              </Card>
            ) : null}
          </>
        ) : (
          <Card className="overflow-hidden">
            <CardHeader
              title={`Budgets for ${label}`}
              caption="Every plan filed against this year, whole-year plans first."
            />
            <div className="mt-4">
              <BudgetSheet entries={entries} label={label} showPeriod showAccount={!account} />
            </div>
          </Card>
        )}
      </div>
    </>
  )
}

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [params, accounts] = await Promise.all([searchParams, listAccounts()])
  const selection = readBudgetPeriod(params)
  const account = typeof params.account === "string" ? params.account.trim() : ""
  const carried = account ? `&account=${encodeURIComponent(account)}` : ""

  return (
    <>
      <Topbar
        title="Anggaran"
        section={null}
        actions={
          // The grid opens on the period and account being looked at, so
          // entering plans from here does not mean picking them twice.
          <Link
            href={`/budgets/new${periodQuery(selection)}${carried}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-black/10 px-2.5 text-sm text-neutral-700 hover:border-black/20 hover:text-neutral-900 sm:h-8"
          >
            <Plus className="size-4 shrink-0" strokeWidth={1.75} />
            <span className="hidden sm:inline">New Budget</span>
          </Link>
        }
      />

      <main className="min-h-0 flex-1 overflow-y-auto bg-neutral-50">
        {/* The period row sits above everything it scopes, on white, so it
            reads as the page's toolbar rather than another card. */}
        <div className="border-b border-black/8 bg-white">
          <BudgetFilters
            selection={selection}
            thisYear={new Date().getUTCFullYear()}
            accounts={accounts.accounts}
            account={account}
          />
        </div>

        {/* Keyed on the period so changing it shows the skeleton again rather
            than leaving the old plans up while the new ones load. */}
        <Suspense
          key={`${selection.period}:${selection.year}:${selection.month}:${account}`}
          fallback={<ListFallback />}
        >
          <BudgetList selection={selection} account={account} />
        </Suspense>
      </main>
    </>
  )
}
