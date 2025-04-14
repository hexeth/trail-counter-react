import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  getSortedRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table"
import type {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { useState } from "react"
import { 
  DropdownMenu, 
  DropdownMenuCheckboxItem, 
  DropdownMenuContent, 
  DropdownMenuTrigger 
} from "../../components/ui/dropdown-menu"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  pagination?: {
    pageIndex: number
    pageSize: number
    pageCount: number
    hasNextPage: boolean
    hasPrevPage: boolean
    totalItems?: number
  }
  onPaginationChange?: (pageIndex: number, pageSize: number) => void
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pagination,
  onPaginationChange,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      ...(pagination ? {
        pagination: {
          pageIndex: pagination.pageIndex - 1,
          pageSize: pagination.pageSize,
        }
      } : {})
    },
    manualPagination: !!pagination,
    pageCount: pagination?.pageCount || -1,
  })

  // Calculate the current range of records being displayed
  const calculateDisplayRange = () => {
    if (!pagination) {
      const pageSize = table.getState().pagination.pageSize;
      const pageIndex = table.getState().pagination.pageIndex;
      const totalRows = table.getFilteredRowModel().rows.length;
      
      const start = pageSize * pageIndex + 1;
      const end = Math.min(start + pageSize - 1, totalRows);
      
      return { start, end, total: totalRows };
    } else {
      const start = (pagination.pageIndex - 1) * pagination.pageSize + 1;
      const totalItems = pagination.totalItems || data.length;
      const end = Math.min(start + pagination.pageSize - 1, totalItems);
      
      return { start, end, total: totalItems };
    }
  };
  
  const { start, end, total } = calculateDisplayRange();
  
  // Generate page number buttons
  const renderPageNumbers = () => {
    const currentPage = pagination ? pagination.pageIndex : table.getState().pagination.pageIndex + 1;
    const totalPages = pagination ? pagination.pageCount : table.getPageCount();
    
    // Don't show page numbers if there's only one page
    if (totalPages <= 1) return null;
    
    // Show fewer pages on mobile screens
    const maxVisiblePages = window.innerWidth < 640 ? 3 : 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages && startPage > 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    const pageNumbers = [];
    
    // Add first page button with ellipsis if needed
    if (startPage > 1) {
      pageNumbers.push(
        <Button
          key="first"
          variant="outline"
          size="sm"
          className="hidden sm:flex w-8 h-8 p-0"
          onClick={() => handlePageChange(1)}
        >
          1
        </Button>
      );
      
      if (startPage > 2) {
        pageNumbers.push(
          <div key="ellipsis-start" className="hidden sm:flex items-center px-1">
            ...
          </div>
        );
      }
    }
    
    // Add page number buttons
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <Button
          key={i}
          variant={i === currentPage ? "default" : "outline"}
          size="sm"
          className="w-8 h-8 p-0"
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Button>
      );
    }
    
    // Add last page button with ellipsis if needed
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pageNumbers.push(
          <div key="ellipsis-end" className="hidden sm:flex items-center px-1">
            ...
          </div>
        );
      }
      
      pageNumbers.push(
        <Button
          key="last"
          variant="outline"
          size="sm"
          className="hidden sm:flex w-8 h-8 p-0"
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </Button>
      );
    }
    
    return (
      <div className="flex items-center space-x-1 mx-2 overflow-x-auto">
        {pageNumbers}
      </div>
    );
  };
  
  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (pagination && onPaginationChange) {
      onPaginationChange(newPage, pagination.pageSize);
    } else {
      table.setPageIndex(newPage - 1);
    }
  };

  return (
    <div>
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter rider names..."
          value={(table.getColumn("riderName")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("riderName")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter(
                (column) => column.getCanHide()
              )
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Only show pagination controls if pagination is provided */}
      {(pagination || (!pagination && table.getPageCount() > 1)) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-2 py-4">
          <div className="text-sm text-muted-foreground text-center sm:text-left">
            Showing rows {start} to {end} of {total}
          </div>
          
          <div className="flex items-center justify-center sm:justify-end space-x-2 overflow-x-auto">
            {pagination ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPaginationChange && onPaginationChange(pagination.pageIndex - 1, pagination.pageSize)}
                  disabled={!pagination.hasPrevPage}
                >
                  Previous
                </Button>
                
                {renderPageNumbers()}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPaginationChange && onPaginationChange(pagination.pageIndex + 1, pagination.pageSize)}
                  disabled={!pagination.hasNextPage}
                >
                  Next
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  Previous
                </Button>
                
                {renderPageNumbers()}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Next
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}