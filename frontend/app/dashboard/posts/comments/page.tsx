'use client';

import * as React from "react";
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
    ColumnDef,
} from "@tanstack/react-table";
import { CheckSquare, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Trash2 } from "lucide-react";
import Link from "next/link";
import moment from "moment";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteComment, editComment, getAllComments } from "@/lib/api/comments";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

interface User {
    _id: string;
    name: string;
}

interface Post {
    _id: string;
    title: string;
}

interface Comment {
    id: string;
    user: User;
    text: string;
    post: Post;
    createdAt: string;
    status: "pending" | "approved" | "rejected";
    _id: string;
    approve: boolean;
    created_at: string;
}

// Define columns
const createColumns = (
    handleAcceptComment: (_id: string) => void,
    handleDeleteComment: (_id: string) => void
): ColumnDef<Comment>[] => [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={table.getIsAllPageRowsSelected()}
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "user",
            header: "User",
            cell: ({ row }) => {
                const user = row.getValue("user") as User | null;
                if (!user || !user._id) {
                    return (
                        <div className="truncate max-w-[100px] text-muted-foreground">
                            Anonymous
                        </div>
                    );
                }
                return (
                    <div className="truncate max-w-[100px]">
                        <Link href={`/dashboard/users/${user._id}`} className="text-primary hover:underline">
                            {user.name || 'Unknown'}
                        </Link>
                    </div>
                );
            },
        },
        {
            accessorKey: "text",
            header: "Comment",
            cell: ({ row }) => {
                const comment = row.original;
                return (
                    <div className="truncate max-w-[500px]">
                        {row.getValue("text")}
                        <br />
                        {row.getValue("approve") === false && (
                            <div className="flex gap-2 mt-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-primary hover:text-primary"
                                    onClick={() => handleAcceptComment(comment._id || comment.id)}
                                >
                                    Accept
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-destructive hover:text-destructive"
                                    onClick={() => handleDeleteComment(comment._id || comment.id)}
                                >
                                    Delete
                                </Button>
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: "post",
            header: "Response to",
            cell: ({ row }) => {
                const post = row.getValue("post") as Post;
                if (!post || !post._id) {
                    return <div className="truncate max-w-[200px] text-muted-foreground">Unknown Post</div>;
                }
                return (
                    <div className="truncate max-w-[200px]">
                        <Link href={`/dashboard/posts/edit/${post._id}`} className="text-primary hover:underline">
                            {post.title || 'Untitled'}
                        </Link>
                    </div>
                );
            },
        },
        {
            accessorKey: "created_at",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Created At
                        <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const created_at = row.getValue("created_at");
                return created_at ? (
                    <div className="capitalize truncate max-w-[150px]">
                        {moment(created_at.toString()).format("LL")}
                    </div>
                ) : (
                    ""
                );
            },
        },
        {
            accessorKey: "approve",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Status
                        <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => (
                <div className="capitalize truncate max-w-[100px]">
                    {row.getValue("approve") === false ? "Pending" : "Approved"}
                </div>
            ),
        },
    ];

export default function CommentsPage() {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data: initialCommentData, isLoading, isError } = useQuery({
        queryKey: ['comments'],
        queryFn: getAllComments,
        staleTime: 10000, // in Milliseconds
    });

    // Mutation for accepting comments
    const acceptMutation = useMutation({
        mutationFn: ({ data, commentId }: { data: FormData; commentId: string }) =>
            editComment(data, commentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comments'] });
            toast({
                title: 'Comment Approved',
                description: 'The comment has been approved.',
                duration: 3000,
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message || 'Failed to approve comment',
                variant: 'destructive',
            });
        },
    });

    // Mutation for deleting comments
    const deleteMutation = useMutation({
        mutationFn: (commentIds: string) => deleteComment(commentIds),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comments'] });
            toast({
                title: 'Comment Deleted',
                description: 'The comment(s) have been deleted.',
                duration: 3000,
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message || 'Failed to delete comment',
                variant: 'destructive',
            });
        },
    });

    // Extract comments from the response structure
    // extractResponseData returns { items: [...], pagination: {...} }
    const comments = (initialCommentData as { items?: Comment[] })?.items || [];

    const handleAcceptComment = React.useCallback((_id: string) => {
        const formdata = new FormData();
        formdata.append('approve', 'true');
        acceptMutation.mutate({ data: formdata, commentId: _id });
    }, [acceptMutation]);

    const handleDeleteComment = React.useCallback((_id: string) => {
        deleteMutation.mutate(_id);
    }, [deleteMutation]);

    const columns = React.useMemo(
        () => createColumns(handleAcceptComment, handleDeleteComment),
        [handleAcceptComment, handleDeleteComment]
    );

    const table = useReactTable({
        data: comments,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
    });

    const handleBulkAccept = () => {
        const selectedRows = table.getFilteredSelectedRowModel().rows;
        const selectedIds = selectedRows.map((row) => row.original._id || row.original.id);

        // Accept each comment individually
        selectedIds.forEach((commentId) => {
            const formdata = new FormData();
            formdata.append('approve', 'true');
            acceptMutation.mutate({ data: formdata, commentId });
        });

        // Clear selection after bulk accept
        setRowSelection({});
    };

    const handleBulkDelete = () => {
        const selectedRows = table.getFilteredSelectedRowModel().rows;
        const selectedIds = selectedRows.map((row) => row.original._id || row.original.id);
        deleteMutation.mutate(selectedIds.join(', '));
        // Clear selection after bulk delete
        setRowSelection({});
    };

    const currentPageSize = table.getState().pagination.pageSize.toString();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Loading comments...</p>
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center text-destructive">
                    <p>Error loading comments. Please try again later.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Comments Management</h1>
            </div>
            <div className="flex items-center py-4">
                <Input
                    placeholder="Filter comments..."
                    value={(table.getColumn("text")?.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                        table.getColumn("text")?.setFilterValue(event.target.value)
                    }
                    className="max-w-sm"
                />
                <Button
                    variant="outline"
                    onClick={handleBulkAccept}
                    className="ml-auto"
                    disabled={Object.keys(rowSelection).length === 0 || acceptMutation.isPending}
                >
                    <CheckSquare className="mr-2 h-4 w-4" />
                    Accept Selected
                </Button>
                <Button
                    variant="outline"
                    onClick={handleBulkDelete}
                    className="ml-2"
                    disabled={Object.keys(rowSelection).length === 0 || deleteMutation.isPending}
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Selected
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="ml-2">
                            Columns <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
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
                                        {column.id}
                                    </DropdownMenuCheckboxItem>
                                );
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
                                    );
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
                                    className="h-24 text-center"
                                >
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
                <div className="flex items-center gap-2">
                    <Button
                        className="border rounded p-1"
                        variant="outline"
                        onClick={() => table.firstPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <ChevronsLeft />
                    </Button>
                    <Button
                        className="border rounded p-1"
                        variant="outline"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <ChevronLeft />
                    </Button>
                    <Button
                        className="border rounded p-1"
                        variant="outline"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        <ChevronRight />
                    </Button>
                    <Button
                        className="border rounded p-1"
                        variant="outline"
                        onClick={() => table.lastPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        <ChevronsRight />
                    </Button>
                    <span className="flex items-center gap-1">
                        <div>Page</div>
                        <strong>
                            {table.getState().pagination.pageIndex + 1} of{' '}
                            {table.getPageCount().toLocaleString()}
                        </strong>
                    </span>
                    <span className="flex items-center gap-1">
                        | Go to page:
                        <Input
                            type="number"
                            min="1"
                            max={table.getPageCount()}
                            defaultValue={table.getState().pagination.pageIndex + 1}
                            onChange={(e) => {
                                const page = e.target.value
                                    ? Number(e.target.value) - 1
                                    : 0;
                                table.setPageIndex(page);
                            }}
                            className="border p-1 rounded w-16"
                        />
                    </span>
                    <Select
                        value={currentPageSize}
                        onValueChange={(value) => {
                            // Convert the selected value back to a number
                            table.setPageSize(Number(value));
                        }}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select number" />
                        </SelectTrigger>
                        <SelectContent>
                            {[10, 20, 30, 40, 50].map((pageSize) => (
                                <SelectItem key={pageSize} value={pageSize.toString()}>
                                    Show {pageSize}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex-1 text-sm text-muted-foreground">
                    {table.getFilteredSelectedRowModel().rows.length} of{' '}
                    {table.getFilteredRowModel().rows.length} row(s) selected.
                </div>
                <div className="space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    );
}
