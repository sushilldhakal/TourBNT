"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ColumnFiltersState, PaginationState, SortingState, Updater, VisibilityState, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Search,
    Filter,
    MoreHorizontal,
    SortAsc,
    SortDesc
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { DataTableProps } from "@/types/dashboard"

export function DataTable<TData = unknown>({
    data,
    columns,
    place = "Filter...",
    column = "title",
    initialColumnVisibility = {},
    serverSidePagination
}: DataTableProps<TData>) {
    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(initialColumnVisibility)
    const [rowSelection, setRowSelection] = useState({})
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: serverSidePagination?.pageIndex ?? 0,
        pageSize: serverSidePagination?.pageSize ?? 10,
    })

    // Memoize pagination callbacks to prevent recreation on every render
    const handlePaginationChange = useCallback((updater: Updater<PaginationState>) => {
        const newState = typeof updater === 'function' ? updater(pagination) : updater;
        setPagination(newState);

        if (serverSidePagination) {
            if (newState.pageIndex !== serverSidePagination.pageIndex) {
                serverSidePagination.onPageChange(newState.pageIndex);
            }
            if (newState.pageSize !== serverSidePagination.pageSize) {
                serverSidePagination.onPageSizeChange(newState.pageSize);
            }
        }
    }, [pagination, serverSidePagination]);

    // Use manual pagination for server-side, automatic for client-side
    const paginationConfig = useMemo(() => serverSidePagination
        ? {
            manualPagination: true,
            pageCount: Math.ceil(serverSidePagination.totalCount / serverSidePagination.pageSize),
        }
        : {
            getPaginationRowModel: getPaginationRowModel(),
        }, [serverSidePagination]);

    const table = useReactTable({
        data,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        ...paginationConfig,
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        onPaginationChange: handlePaginationChange,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            pagination: serverSidePagination
                ? { pageIndex: serverSidePagination.pageIndex, pageSize: serverSidePagination.pageSize }
                : pagination,
        },
    })

    const currentPageSize = table.getState().pagination.pageSize >= 100
        ? 'all'
        : table.getState().pagination.pageSize.toString();

    const hasCreatedAtColumn = useMemo(() => {
        return columns.some((colDef) => {
            // ColumnDef is a union; we only care about common runtime keys
            const anyCol = colDef as unknown as { id?: string; accessorKey?: string };
            return anyCol.id === "createdAt" || anyCol.accessorKey === "createdAt";
        });
    }, [columns]);

    // Set initial sorting only once on mount
    useEffect(() => {
        // Only apply default sorting if this table *actually defines* createdAt.
        if (!hasCreatedAtColumn) return;
        setSorting([{ id: "createdAt", desc: true }]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // run once; we don't want to re-apply sorting on every render


    return (
        <Card className="w-full min-w-0 max-w-full dark:bg-transparent light:bg-transparent">
            <CardHeader className="pb-4 dark:bg-transparent light:bg-transparent">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative max-w-sm">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" aria-hidden="true" />
                            <Input
                                placeholder={place}
                                value={(table.getColumn(column)?.getFilterValue() as string) ?? ""}
                                onChange={(event) =>
                                    table.getColumn(column)?.setFilterValue(event.target.value)
                                }
                                className="pl-10"
                            />
                        </div>
                        <Badge variant="secondary" className="flex items-center gap-1">
                            <Filter className="h-3 w-3" aria-hidden="true" />
                            {table.getFilteredRowModel().rows.length} rows
                        </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <Filter className="h-4 w-4 mr-2" aria-hidden="true" />
                                    Columns
                                    <ChevronDown className="ml-2 h-4 w-4" aria-hidden="true" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {table
                                    .getAllColumns()
                                    .filter((column) => column.getCanHide())
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
                                                {column.id === 'actions' ? (
                                                    <div className="flex items-center gap-2">
                                                        <MoreHorizontal className="h-3 w-3" aria-hidden="true" />
                                                        Actions
                                                    </div>
                                                ) : (
                                                    column.id
                                                )}
                                            </DropdownMenuCheckboxItem>
                                        )
                                    })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0 min-w-0">
                <div className="rounded-lg border border-border/50 overflow-x-auto w-full min-w-0 max-w-full" style={{ WebkitOverflowScrolling: 'touch' }}>
                    <Table className="min-w-full w-max">
                        <TableHeader className="bg-muted/30">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="hover:bg-muted/50">
                                    {headerGroup.headers.map((header) => {
                                        const canSort = header.column.getCanSort()
                                        return (
                                            <TableHead
                                                key={header.id}
                                                className={`font-semibold text-foreground ${canSort ? 'cursor-pointer select-none' : ''
                                                    }`}
                                                onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {header.isPlaceholder
                                                        ? null
                                                        : flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext()
                                                        )}
                                                    {canSort && (
                                                        <div className="flex flex-col">
                                                            {header.column.getIsSorted() === 'asc' ? (
                                                                <SortAsc className="h-3 w-3 text-primary" aria-hidden="true" />
                                                            ) : header.column.getIsSorted() === 'desc' ? (
                                                                <SortDesc className="h-3 w-3 text-primary" aria-hidden="true" />
                                                            ) : (
                                                                <div className="h-3 w-3 opacity-50">
                                                                    <SortAsc className="h-3 w-3" aria-hidden="true" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
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
                                        className="hover:bg-muted/30 transition-colors"
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id} className="py-3">
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-32 text-center text-muted-foreground"
                                    >
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="text-2xl">📋</div>
                                            <div>No results found</div>
                                            <div className="text-sm">Try adjusting your search criteria</div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>


            <CardContent className="pt-4 border-t">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Showing</span>
                        <Badge variant="outline">
                            {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-{Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, serverSidePagination ? serverSidePagination.totalCount : table.getFilteredRowModel().rows.length)}
                        </Badge>
                        <span>of</span>
                        <Badge variant="outline">
                            {serverSidePagination ? serverSidePagination.totalCount : table.getFilteredRowModel().rows.length}
                        </Badge>
                        <span>results</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Rows per page:</span>
                            <Select
                                value={currentPageSize === '100' || currentPageSize === 'all' ? 'all' : currentPageSize}
                                onValueChange={value => {
                                    if (value === 'all') {
                                        table.setPageSize(100);
                                    } else {
                                        const newPageSize = Number(value);
                                        table.setPageSize(newPageSize);
                                    }
                                }}
                            >
                                <SelectTrigger className="w-24 h-8">
                                    <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {[10, 20, 30, 40, 50].map(pageSize => (
                                        <SelectItem key={pageSize} value={pageSize.toString()}>
                                            {pageSize}
                                        </SelectItem>
                                    ))}
                                    <SelectItem value="all">All</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                                {table.getPageCount() > 0 ? (
                                    <>Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</>
                                ) : (
                                    <>Page 1 of 1</>
                                )}
                            </span>

                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => table.firstPage()}
                                    disabled={!table.getCanPreviousPage()}
                                    className="h-8 w-8 p-0"
                                    aria-label="Go to first page"
                                >
                                    <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => table.previousPage()}
                                    disabled={!table.getCanPreviousPage()}
                                    className="h-8 w-8 p-0"
                                    aria-label="Go to previous page"
                                >
                                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => table.nextPage()}
                                    disabled={!table.getCanNextPage()}
                                    className="h-8 w-8 p-0"
                                    aria-label="Go to next page"
                                >
                                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => table.lastPage()}
                                    disabled={!table.getCanNextPage()}
                                    className="h-8 w-8 p-0"
                                    aria-label="Go to last page"
                                >
                                    <ChevronsRight className="h-4 w-4" aria-hidden="true" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}