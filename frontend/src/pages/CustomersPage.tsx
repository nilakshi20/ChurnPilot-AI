import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, Star } from "lucide-react";

import { DemoDataButton } from "@/components/DemoDataButton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Toggle } from "@/components/ui/Field";
import { PriorityBadge, RiskBadge } from "@/components/ui/RiskIndicator";
import { PageHeading } from "@/components/ui/SectionHeading";
import { SortableTh, Table, TableShell, Td, Th, Tr } from "@/components/ui/Table";
import { EmptyState, ErrorState, LoadingTable } from "@/components/ui/States";
import { useCurrency } from "@/contexts/SettingsContext";
import { useCustomers, usePlatformSettings } from "@/hooks/useChurnpilot";
import { useDebouncedValue } from "@/hooks/useResource";
import { formatCurrency, formatNumber, formatPercent, formatRelativeDays } from "@/utils/format";
import { customerName } from "@/utils/format";

const PAGE_SIZE = 25;
const RISK_OPTIONS = ["low", "medium", "high", "critical"];
const STATUS_OPTIONS = ["active", "paused", "churned", "trial"];

export function CustomersPage() {
  const navigate = useNavigate();
  const currency = useCurrency();
  const [params, setParams] = useSearchParams();
  const platform = usePlatformSettings();

  const [search, setSearch] = useState(params.get("search") ?? "");
  const [risk, setRisk] = useState(params.get("risk_level") ?? "");
  const [segment, setSegment] = useState(params.get("segment") ?? "");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [highValueOnly, setHighValueOnly] = useState(params.get("high_value_only") === "true");
  const [sortBy, setSortBy] = useState(params.get("sort_by") ?? "priority_score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">((params.get("sort_dir") as "asc" | "desc") ?? "desc");
  const [page, setPage] = useState(Number(params.get("page") ?? 1));
  const debouncedSearch = useDebouncedValue(search);

  // Keep the URL in sync so filtered views can be shared and the browser back button works.
  useEffect(() => {
    const next = new URLSearchParams();
    if (debouncedSearch) next.set("search", debouncedSearch);
    if (risk) next.set("risk_level", risk);
    if (segment) next.set("segment", segment);
    if (status) next.set("status", status);
    if (highValueOnly) next.set("high_value_only", "true");
    if (sortBy !== "priority_score") next.set("sort_by", sortBy);
    if (sortDir !== "desc") next.set("sort_dir", sortDir);
    if (page > 1) next.set("page", String(page));
    setParams(next, { replace: true });
  }, [debouncedSearch, risk, segment, status, highValueOnly, sortBy, sortDir, page, setParams]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, risk, segment, status, highValueOnly]);

  const query = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      risk_level: risk || undefined,
      segment: segment || undefined,
      status: status || undefined,
      high_value_only: highValueOnly || undefined,
      sort_by: sortBy,
      sort_dir: sortDir,
      page,
      page_size: PAGE_SIZE,
    }),
    [debouncedSearch, risk, segment, status, highValueOnly, sortBy, sortDir, page],
  );

  const { data, loading, error, refetching, reload } = useCustomers(query);
  const total = data?.pagination.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(debouncedSearch || risk || segment || status || highValueOnly);

  const onSort = (key: string) => {
    if (key === sortBy) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir(key === "name" || key === "company" || key === "segment" ? "asc" : "desc");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setRisk("");
    setSegment("");
    setStatus("");
    setHighValueOnly(false);
  };

  return (
    <div className="space-y-6">
      <PageHeading
        title="Customers"
        description="Every row is scored by the backend model. Select a customer to see their prediction, contributing factors and retention options."
        actions={<DemoDataButton variant="secondary" />}
      />

      <section className="rounded-3xl bg-white p-5 shadow-panel ring-1 ring-sand-200">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
          Filters
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-4">
          <Field label="Search" className="lg:col-span-2">
            {({ id }) => (
              <div className="relative">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-700/50" />
                <Input
                  id={id}
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Name, email or company"
                  className="pl-9"
                />
              </div>
            )}
          </Field>
          <Field label="Risk level">
            {({ id }) => (
              <Select id={id} value={risk} onChange={(event) => setRisk(event.target.value)}>
                <option value="">All risk levels</option>
                {RISK_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Segment">
            {({ id }) => (
              <Select id={id} value={segment} onChange={(event) => setSegment(event.target.value)}>
                <option value="">All segments</option>
                {(platform.data?.segments ?? []).map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Status">
            {({ id }) => (
              <Select id={id} value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <div className="flex items-end lg:col-span-2">
            <Toggle
              label="High-value customers only"
              description="Monthly spend in the top 20% of the current customer base."
              checked={highValueOnly}
              onChange={setHighValueOnly}
            />
          </div>
          <div className="flex items-end justify-start lg:justify-end">
            <Button variant="ghost" size="sm" onClick={clearFilters} disabled={!hasFilters}>
              Clear filters
            </Button>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-700">
          {loading && !data ? "Loading customers…" : `${formatNumber(total)} customers match the current filters`}
          {refetching ? " · refreshing" : ""}
        </p>
        {hasFilters ? <Badge tone="info">Filtered view</Badge> : null}
      </div>

      {error ? (
        <ErrorState message={error.message} code={error.code} onRetry={reload} />
      ) : loading && !data ? (
        <LoadingTable rows={8} columns={7} />
      ) : total === 0 ? (
        <EmptyState
          title={hasFilters ? "No customers match these filters" : "No customers yet"}
          message={
            hasFilters
              ? "Try widening the search term or clearing a filter to see more of the customer base."
              : "Load the synthetic demo dataset or upload a customer CSV to populate this table."
          }
          action={hasFilters ? <Button variant="secondary" onClick={clearFilters}>Clear filters</Button> : <DemoDataButton />}
        />
      ) : (
        <>
          <TableShell>
            <Table caption="Customers with churn predictions and retention priority">
              <thead>
                <tr>
                  <SortableTh label="Customer" columnKey="name" activeKey={sortBy} direction={sortDir} onSort={onSort} />
                  <SortableTh label="Company" columnKey="company" activeKey={sortBy} direction={sortDir} onSort={onSort} />
                  <SortableTh label="Segment" columnKey="segment" activeKey={sortBy} direction={sortDir} onSort={onSort} />
                  <SortableTh
                    label="Monthly spend"
                    columnKey="monthly_spend"
                    activeKey={sortBy}
                    direction={sortDir}
                    onSort={onSort}
                    align="right"
                  />
                  <SortableTh
                    label="Orders"
                    columnKey="total_orders"
                    activeKey={sortBy}
                    direction={sortDir}
                    onSort={onSort}
                    align="right"
                  />
                  <SortableTh
                    label="Last activity"
                    columnKey="days_since_last_order"
                    activeKey={sortBy}
                    direction={sortDir}
                    onSort={onSort}
                  />
                  <SortableTh
                    label="Churn probability"
                    columnKey="churn_probability"
                    activeKey={sortBy}
                    direction={sortDir}
                    onSort={onSort}
                    align="right"
                  />
                  <Th>Risk</Th>
                  <SortableTh
                    label="Priority score"
                    columnKey="priority_score"
                    activeKey={sortBy}
                    direction={sortDir}
                    onSort={onSort}
                    align="right"
                  />
                </tr>
              </thead>
              <tbody>
                {data?.items.map((customer) => {
                  const name = customerName(customer);
                  return (
                    <Tr
                      key={customer.id}
                      ariaLabel={`Open ${name}`}
                      onClick={() => navigate(`/customers/${customer.id}`)}
                    >
                      <Td>
                        <span className="flex items-center gap-2">
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-ink-900">{name}</span>
                            <span className="block truncate text-xs text-ink-700/70">{customer.email}</span>
                          </span>
                          {customer.is_high_value ? (
                            <span title="High-value customer" className="text-amber-600">
                              <Star aria-label="High-value customer" className="h-3.5 w-3.5" />
                            </span>
                          ) : null}
                        </span>
                      </Td>
                      <Td className="text-ink-700">{customer.company ?? "—"}</Td>
                      <Td>
                        <Badge tone="neutral">{customer.segment_label}</Badge>
                      </Td>
                      <Td className="text-right tabular-nums">{formatCurrency(customer.monthly_spend, currency)}</Td>
                      <Td className="text-right tabular-nums">{formatNumber(customer.total_orders)}</Td>
                      <Td className="text-ink-700">{formatRelativeDays(customer.days_since_last_order)}</Td>
                      <Td className="text-right tabular-nums">
                        {customer.churn_probability === null ? "—" : formatPercent(customer.churn_probability)}
                      </Td>
                      <Td>
                        <RiskBadge level={customer.risk_level} showSteps={false} />
                      </Td>
                      <Td className="text-right">
                        <span className="flex flex-col items-end gap-1">
                          <span className="tabular-nums font-medium">
                            {customer.priority_score === null ? "—" : customer.priority_score.toFixed(3)}
                          </span>
                          <PriorityBadge level={customer.priority_level} />
                        </span>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </TableShell>

          <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Pagination">
            <p className="text-xs text-ink-700/75">
              Page {page} of {totalPages} · showing {formatNumber(data?.items.length ?? 0)} of {formatNumber(total)}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" />
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Next
                <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
              </Button>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
