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
    <div className="my-4 overflow-x-auto rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/5 text-xs uppercase text-white/60">
          <tr>
            {data.headers.map((header, index) => (
              <th key={index} className="px-4 py-3 font-medium">
                <MathText text={header} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {data.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-white/5 transition-colors">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3 text-white/90">
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
