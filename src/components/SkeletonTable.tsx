import { Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import React from 'react';

export function SkeletonTable({ columns, rows }: { columns: number; rows: number }) {
  return (
    <TableContainer aria-hidden="true">
      <Table>
        <TableHead>
          <TableRow>
            {Array.from({ length: columns }).map((_, index) => (
              <TableCell key={`skeleton-head-${index}`}>
                <Skeleton variant="text" width={index === 0 ? 90 : 120} />
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={`skeleton-row-${rowIndex}`}>
              {Array.from({ length: columns }).map((_, columnIndex) => (
                <TableCell key={`skeleton-cell-${rowIndex}-${columnIndex}`}>
                  <Skeleton variant="text" width={`${Math.max(35, 85 - columnIndex * 7)}%`} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
