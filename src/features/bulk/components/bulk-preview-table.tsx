import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatINR } from '@/lib/utils';
import { rowErrors } from '../bulk.csv';
import type { BulkRow, RowError } from '../bulk.types';

/**
 * Preview of the parsed CSV with each row's problems next to it: client-side validation
 * (incl. unmatched image names) plus the API's `BULK_INVALID` row errors (`serverErrors`, by row index).
 */
export function BulkPreviewTable({
  rows,
  files,
  serverErrors,
}: {
  rows: BulkRow[];
  files: Map<string, File>;
  serverErrors: Map<number, RowError[]>;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Starting bid</TableHead>
            <TableHead>Images</TableHead>
            <TableHead>Problems</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const errors = [...rowErrors(row, files), ...(serverErrors.get(row.index) ?? [])];
            return (
              <TableRow key={row.index} data-testid={`bulk-row-${row.index}`}>
                <TableCell>{row.index + 1}</TableCell>
                <TableCell className="max-w-56 truncate">{row.title || '-'}</TableCell>
                <TableCell>{row.category || '-'}</TableCell>
                <TableCell>{row.startingBidPaise ? formatINR(row.startingBidPaise) : '-'}</TableCell>
                <TableCell>{row.imageNames.length}</TableCell>
                <TableCell>
                  {errors.length === 0 ? (
                    <span className="text-xs text-muted-foreground">OK</span>
                  ) : (
                    <ul className="space-y-0.5 text-xs text-destructive">
                      {errors.map((e, i) => (
                        <li key={`${e.field}-${i}`}>
                          {e.field ? <span className="font-medium">{e.field}: </span> : null}
                          {e.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
