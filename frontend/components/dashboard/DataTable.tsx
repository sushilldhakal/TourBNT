"use client"

import * as React from "react"
import {
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"
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
import { useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"


interface DataTableProps<TData = unknown> {
    data: TData[]
    columns: any[] // Keep as any since it's from @tanstack/react-table ColumnDef
    place?: string
    colum?: string
    initialColumnVisibility?: Record<string, boolean>
    // Server-side pagination props (optional)
    serverSidePagination?: {
        totalCount: number // Total number of items on server
        pageIndex: number // Current page (0-indexed)
        pageSize: number // Items per page
        onPageChange: (pageIndex: number) => void // Callback when page changes
        onPageSizeChange: (pageSize: number) => void // Callback when page size changes
    }
}

export function DataTable<TData = unknown>({
    data,
    columns,
    place = "Filter...",
    colum = "title",
    initialColumnVisibility = {},
    serverSidePagination
}: DataTableProps<TData>) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(initialColumnVisibility)
    const [rowSelection, setRowSelection] = React.useState({})

    // Use manual pagination for server-side, automatic for client-side
    const paginationConfig = serverSidePagination
        ? {
            manualPagination: true,
            pageCount: Math.ceil(serverSidePagination.totalCount / serverSidePagination.pageSize),
            state: {
                pagination: {
                    pageIndex: serverSidePagination.pageIndex,
                    pageSize: serverSidePagination.pageSize,
                },
            },
            onPaginationChange: (updater: any) => {
                const newState = typeof updater === 'function'
                    ? updater({ pageIndex: serverSidePagination.pageIndex, pageSize: serverSidePagination.pageSize })
                    : updater;
                if (newState.pageIndex !== undefined && newState.pageIndex !== serverSidePagination.pageIndex) {
                    serverSidePagination.onPageChange(newState.pageIndex);
                }
                if (newState.pageSize !== undefined && newState.pageSize !== serverSidePagination.pageSize) {
                    serverSidePagination.onPageSizeChange(newState.pageSize);
                }
            },
        }
        : {
            getPaginationRowModel: getPaginationRowModel(),
        };

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
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            ...(serverSidePagination ? {
                pagination: {
                    pageIndex: serverSidePagination.pageIndex,
                    pageSize: serverSidePagination.pageSize,
                },
            } : {}),
        },
    })

    const currentPageSize = table.getState().pagination.pageSize >= 100
        ? 'all'
        : table.getState().pagination.pageSize.toString();

    useEffect(() => {
        table.setSorting((sortingState) => {
            return [
                ...sortingState,
                {
                    id: "createdAt",
                    desc: true,
                },
            ];
        });
    }, [table]);


    return (
        <Card className="w-full dark:bg-transparent light:bg-transparent">
            <CardHeader className="pb-4 dark:bg-transparent light:bg-transparent">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative max-w-sm">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <Input
                                placeholder={place}
                                value={(table.getColumn(colum)?.getFilterValue() as string) ?? ""}
                                onChange={(event) =>
                                    table.getColumn(colum)?.setFilterValue(event.target.value)
                                }
                                className="[&&]:pl-[28px]"
                            />
                        </div>
                        <Badge variant="secondary" className="flex items-center gap-1">
                            <Filter className="h-3 w-3" />
                            {table.getFilteredRowModel().rows.length} rows
                        </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <Filter className="h-4 w-4 mr-2" />
                                    Columns
                                    <ChevronDown className="ml-2 h-4 w-4" />
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
                                                        <MoreHorizontal className="h-3 w-3" />
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
            <CardContent className="p-0">
                <div className="rounded-lg border border-border/50 overflow-hidden">
                    <Table>
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
                                                                <SortAsc className="h-3 w-3 text-primary" />
                                                            ) : header.column.getIsSorted() === 'desc' ? (
                                                                <SortDesc className="h-3 w-3 text-primary" />
                                                            ) : (
                                                                <div className="h-3 w-3 opacity-50">
                                                                    <SortAsc className="h-3 w-3" />
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
                                        // For server-side: send "all" as string, for client-side: use large number
                                        if (serverSidePagination) {
                                            // Pass a special marker that we'll convert to "all" in the API call
                                            serverSidePagination.onPageSizeChange(100);
                                        } else {
                                            table.setPageSize(100);
                                        }
                                    } else {
                                        const newPageSize = Number(value);
                                        if (serverSidePagination) {
                                            serverSidePagination.onPageSizeChange(newPageSize);
                                        } else {
                                            table.setPageSize(newPageSize);
                                        }
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
                                    onClick={() => {
                                        if (serverSidePagination) {
                                            serverSidePagination.onPageChange(0);
                                        } else {
                                            table.firstPage();
                                        }
                                    }}
                                    disabled={serverSidePagination ? serverSidePagination.pageIndex === 0 : !table.getCanPreviousPage()}
                                    className="h-8 w-8 p-0"
                                >
                                    <ChevronsLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        if (serverSidePagination) {
                                            serverSidePagination.onPageChange(serverSidePagination.pageIndex - 1);
                                        } else {
                                            table.previousPage();
                                        }
                                    }}
                                    disabled={serverSidePagination ? serverSidePagination.pageIndex === 0 : !table.getCanPreviousPage()}
                                    className="h-8 w-8 p-0"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        if (serverSidePagination) {
                                            const maxPage = Math.ceil(serverSidePagination.totalCount / serverSidePagination.pageSize) - 1;
                                            serverSidePagination.onPageChange(Math.min(serverSidePagination.pageIndex + 1, maxPage));
                                        } else {
                                            table.nextPage();
                                        }
                                    }}
                                    disabled={serverSidePagination ? serverSidePagination.pageIndex >= Math.ceil(serverSidePagination.totalCount / serverSidePagination.pageSize) - 1 : !table.getCanNextPage()}
                                    className="h-8 w-8 p-0"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        if (serverSidePagination) {
                                            const maxPage = Math.ceil(serverSidePagination.totalCount / serverSidePagination.pageSize) - 1;
                                            serverSidePagination.onPageChange(maxPage);
                                        } else {
                                            table.lastPage();
                                        }
                                    }}
                                    disabled={serverSidePagination ? serverSidePagination.pageIndex >= Math.ceil(serverSidePagination.totalCount / serverSidePagination.pageSize) - 1 : !table.getCanNextPage()}
                                    className="h-8 w-8 p-0"
                                >
                                    <ChevronsRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
