import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";

import { DemoDataButton } from "@/components/DemoDataButton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeading } from "@/components/ui/SectionHeading";
import { StatCard } from "@/components/ui/StatCard";
import { Table, TableShell, Td, Th } from "@/components/ui/Table";
import { ErrorState } from "@/components/ui/States";
import { useDataVersion } from "@/contexts/DataVersionContext";
import { useToast } from "@/contexts/ToastContext";
import { ApiError, toApiError } from "@/services/api";
import { churnpilot } from "@/services/churnpilot";
import type { CsvValidationData } from "@/types/api";
import { formatNumber, titleCase } from "@/utils/format";

const REQUIRED_COLUMNS = ["email", "signup_date", "monthly_spend"];
const OPTIONAL_COLUMNS = ["first_name", "last_name", "company", "plan", "billing_interval", "status", "country"];

const SAMPLE_CSV = `email,first_name,last_name,company,plan,billing_interval,status,signup_date,monthly_spend,country
ada@example.com,Ada,Lovelace,Analytical Engines,growth,monthly,active,2024-03-11,420.00,GB
grace@example.com,Grace,Hopper,Compiler Works,scale,annual,active,2023-11-02,1180.50,US`;

export function UploadPage() {
  const { notify } = useToast();
  const { invalidate } = useDataVersion();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<CsvValidationData | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [dragging, setDragging] = useState(false);

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setImported(false);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const validate = async (selected: File) => {
    setFile(selected);
    setResult(null);
    setError(null);
    setImported(false);
    setValidating(true);
    try {
      const validation = await churnpilot.uploadCsv(selected, false);
      setResult(validation);
      notify({
        tone: validation.issues.length > 0 ? "info" : "success",
        title: "File validated",
        description: `${formatNumber(validation.stats.valid_count ?? 0)} valid rows, ${formatNumber(
          validation.stats.invalid_count ?? 0,
        )} rejected. Nothing has been imported yet.`,
      });
    } catch (cause) {
      setError(toApiError(cause));
    } finally {
      setValidating(false);
    }
  };

  const importValid = async () => {
    if (!file) return;
    setImporting(true);
    try {
      const outcome = await churnpilot.uploadCsv(file, true);
      setResult(outcome);
      setImported(true);
      invalidate();
      notify({
        tone: "success",
        title: `${formatNumber(outcome.persisted)} customers imported`,
        description: "Invalid rows were skipped. Run predictions to score the new customers.",
      });
    } catch (cause) {
      const failure = toApiError(cause);
      setError(failure);
      notify({ tone: "error", title: "Import failed", description: failure.message });
    } finally {
      setImporting(false);
    }
  };

  const stats = result?.stats ?? {};
  const previewColumns = result?.preview.length ? Object.keys(result.preview[0]) : [];

  return (
    <div className="space-y-6">
      <PageHeading
        title="Upload Data"
        description="Import your own customers from a CSV. Files are validated first and nothing is written to the database until you choose to import."
        actions={<DemoDataButton variant="secondary" label="Load synthetic demo data" />}
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Choose a CSV file" description="Maximum practical size for the demo backend is a few thousand rows." />
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const dropped = event.dataTransfer.files?.[0];
              if (dropped) {
                void validate(dropped);
              }
            }}
            className={`mt-5 flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-6 py-12 text-center transition ${
              dragging ? "border-moss-500 bg-moss-500/5" : "border-sand-200 bg-sand-50"
            }`}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-ink-800 ring-1 ring-sand-200">
              <FileSpreadsheet aria-hidden="true" className="h-5 w-5" />
            </span>
            <p className="text-sm font-medium text-ink-900">Drag a .csv file here, or choose one from your computer</p>
            <p className="text-xs text-ink-700/70">{file ? `Selected: ${file.name}` : "No file selected"}</p>
            <input
              ref={inputRef}
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(event) => {
                const selected = event.target.files?.[0];
                if (selected) {
                  void validate(selected);
                }
              }}
            />
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button variant="secondary" size="sm" loading={validating} onClick={() => inputRef.current?.click()}>
                {!validating ? <Upload aria-hidden="true" className="h-3.5 w-3.5" /> : null}
                {validating ? "Validating…" : "Choose file"}
              </Button>
              {file ? (
                <Button variant="ghost" size="sm" onClick={reset}>
                  Clear
                </Button>
              ) : null}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Expected format" description="Column order does not matter; header names do." />
          <dl className="mt-5 space-y-4">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.14em] text-ink-700/60">Required columns</dt>
              <dd className="mt-2 flex flex-wrap gap-1.5">
                {REQUIRED_COLUMNS.map((column) => (
                  <Badge key={column} tone="danger">
                    {column}
                  </Badge>
                ))}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.14em] text-ink-700/60">Optional columns</dt>
              <dd className="mt-2 flex flex-wrap gap-1.5">
                {OPTIONAL_COLUMNS.map((column) => (
                  <Badge key={column} tone="neutral">
                    {column}
                  </Badge>
                ))}
              </dd>
            </div>
          </dl>
          <p className="mt-5 text-xs leading-5 text-ink-700/75">
            Emails must be unique and not already present in the workspace, <code>signup_date</code> must be an ISO date, and{" "}
            <code>monthly_spend</code> must be a non-negative number.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-2xl bg-ink-950 p-4 text-[10px] leading-5 text-sand-100">
            {SAMPLE_CSV}
          </pre>
        </Card>
      </div>

      {error ? <ErrorState message={error.message} code={error.code} onRetry={() => file && void validate(file)} /> : null}

      {result ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Rows detected" value={formatNumber(stats.row_count ?? 0)} />
            <StatCard label="Valid rows" value={formatNumber(stats.valid_count ?? 0)} icon={CheckCircle2} />
            <StatCard
              label="Invalid rows"
              value={formatNumber(stats.invalid_count ?? 0)}
              hint={`${formatNumber(stats.duplicate_count ?? 0)} duplicates · ${formatNumber(
                stats.missing_value_count ?? 0,
              )} missing values · ${formatNumber(stats.type_error_count ?? 0)} type errors`}
              icon={AlertTriangle}
            />
            <StatCard
              label="Imported"
              value={formatNumber(result.persisted)}
              hint={imported ? "Written to PostgreSQL" : "Nothing imported yet"}
              emphasis={imported}
            />
          </div>

          <Card>
            <CardHeader
              title={imported ? "Import complete" : "Ready to import"}
              description={
                imported
                  ? "Valid rows were written to the database. Run predictions from the dashboard to score the new customers."
                  : "Importing writes only the valid rows. Invalid rows are skipped and never partially applied."
              }
              actions={
                !imported ? (
                  <Button loading={importing} disabled={(stats.valid_count ?? 0) === 0} onClick={() => void importValid()}>
                    Import {formatNumber(stats.valid_count ?? 0)} valid rows
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={reset}>
                    Upload another file
                  </Button>
                )
              }
            />
            {(stats.valid_count ?? 0) === 0 && !imported ? (
              <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
                No rows passed validation, so there is nothing to import. Fix the issues listed below and upload the file
                again.
              </p>
            ) : null}
          </Card>

          {result.issues.length > 0 ? (
            <Card className="p-0">
              <div className="p-6">
                <CardHeader
                  title={`Validation errors (${formatNumber(result.issues.length)})`}
                  description="Each row is validated independently, so one bad row never blocks the rest of the file."
                />
              </div>
              <TableShell className="rounded-t-none shadow-none ring-0">
                <Table caption="CSV validation errors">
                  <thead>
                    <tr>
                      <Th className="w-20">Row</Th>
                      <Th className="w-40">Field</Th>
                      <Th className="w-48">Code</Th>
                      <Th>Message</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.issues.slice(0, 200).map((issue, index) => (
                      <tr key={`${issue.row_number}-${issue.code}-${index}`}>
                        <Td className="tabular-nums">{issue.row_number}</Td>
                        <Td className="text-ink-700">{issue.field ?? "—"}</Td>
                        <Td>
                          <Badge tone="warning">{titleCase(issue.code)}</Badge>
                        </Td>
                        <Td className="text-ink-700">{issue.message}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableShell>
              {result.issues.length > 200 ? (
                <p className="px-6 py-4 text-xs text-ink-700/70">
                  Showing the first 200 of {formatNumber(result.issues.length)} issues.
                </p>
              ) : null}
            </Card>
          ) : null}

          {result.preview.length > 0 ? (
            <Card className="p-0">
              <div className="p-6">
                <CardHeader
                  title="Preview"
                  description={`First ${result.preview.length} valid rows exactly as they will be stored.`}
                />
              </div>
              <TableShell className="rounded-t-none shadow-none ring-0">
                <Table caption="Preview of valid rows">
                  <thead>
                    <tr>
                      {previewColumns.map((column) => (
                        <Th key={column}>{titleCase(column)}</Th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.preview.map((row, index) => (
                      <tr key={index}>
                        {previewColumns.map((column) => (
                          <Td key={column} className="text-ink-700">
                            {row[column] === null || row[column] === undefined ? "—" : String(row[column])}
                          </Td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableShell>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
