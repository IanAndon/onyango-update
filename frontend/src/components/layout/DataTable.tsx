"use client";

import React, { ReactNode } from "react";

interface DataTableProps {
  children: ReactNode;
  className?: string;
}

export function DataTable({ children, className = "" }: DataTableProps) {
  return (
    <div className={`table-onyango ${className}`}>
      <div className="max-w-full overflow-x-auto">
        <table className="min-w-full">{children}</table>
      </div>
    </div>
  );
}

export function DataTableHead({ children }: { children: ReactNode }) {
  return <thead>{children}</thead>;
}

export function DataTableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function DataTableFoot({ children }: { children: ReactNode }) {
  return <tfoot>{children}</tfoot>;
}
