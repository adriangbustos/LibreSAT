import React from 'react';
import { MathText } from './MathRenderer';

interface DataTableProps {
  data: {
    headers: string[];
    rows: string[][];
  };
}

export function DataTable({ data }: DataTableProps) {
  if (!data || !data.headers || !data.rows) return null;

  return (
    <div className="my-4 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-500 text-white">
          <tr>
            {data.headers.map((header, index) => (
              <th key={index} className="px-4 py-3 font-semibold">
                <MathText text={header} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)] text-[var(--text-primary)]">
          {data.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="even:bg-[var(--bg-muted)] hover:bg-slate-100 transition-colors">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3">
                  <MathText text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
