'use client';

import { useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@/lib/forms/zodResolver';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useCacheManager, usePostById } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Save, ArrowLeft, Trash2, FileText, ExternalLink, ImageIcon } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { updatePost, deletePost } from '@/lib/api/posts';
import { InputTags } from '@/components/ui/input-tags';

const NovelEditor = dynamic(() => import('@/components/dashboard/editor/NovelEditor'), { ssr: false });
import { Gallery } from '@/components/dashboard/gallery/Gallery';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { CommentsSection } from '@/components/dashboard/posts/CommentComponents';
import type { JSONContent } from 'novel';
import { useBreadcrumbs } from '@/providers/BreadcrumbsProvider';
import { DashboardCardHeader } from '@/components/dashboard/layout/CardHeader';
import type { PostFormData } from '@/types/app';

// Form validation schema
const postSchema = z.object({
    title: z.string().min(2, 'Title must be at least 2 characters').max(200, 'Title must be less than 200 characters'),
    content: z.string().min(2, 'Content must be at least 2 characters'),
    status: z.preprocess(
        (val) => {
            // Transform empty string to 'Draft'
            if (val === '' || val === null || val === undefined) {
                return 'Draft';
            }
            return val;
        },
        z.enum(['Draft', 'Published', 'Archived'])
    ),
    image: z.string().optional(),
    tags: z.array(z.string()).optional(),
    enableComments: z.boolean().optional(),
});

export default function EditPostPage() {
    const router = useRouter();
    const { invalidatePosts } = useCacheManager();
    const [imageDialogOpen, setImageDialogOpen] = useState(false);
    const [editorContent, setEditorContent] = useState<JSONContent | null>(null);
    const params = useParams<{ id: string }>();
    const { setBreadcrumbs } = useBreadcrumbs();

    const postId = params?.id;
    const hasValidId = !!postId && postId !== 'undefined';

    const form = useForm<PostFormData>({
        resolver: zodResolver(postSchema),
        defaultValues: {
            title: '',
            content: '',
            status: 'Draft', // Ensure this is always set
            image: '',
            tags: [],
            enableComments: true,
        },
        mode: 'onSubmit', // Change from 'onChange' to 'onSubmit' to prevent validation on load
        shouldUnregister: false,
        reValidateMode: 'onChange', // Only re-validate after first submit
    });
    const { data: post, isLoading, error } = usePostById(postId, hasValidId);
    // Update post mutation
    const updatePostMutation = useMutation({
        mutationFn: (data: FormData) => updatePost(data, postId!),
        onSuccess: () => {
            toast({
                title: 'Success',
                description: 'Post updated successfully',
            });
            invalidatePosts({ detailId: postId! });
            // Don't navigate away - let user see the updated data
            // router.push('/dashboard/posts');
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message || 'Failed to update post',
                variant: 'destructive',
            });
        },
    });

    // Delete post mutation
    const deletePostMutation = useMutation({
        mutationFn: () => deletePost(postId!),
        onSuccess: () => {
            toast({
                title: 'Post deleted successfully',
                description: 'The post has been deleted successfully.',
            });
            invalidatePosts();
            router.push('/dashboard/posts');
        },
        onError: (error: Error) => {
            toast({
                title: 'Failed to delete post',
                description: error.message || 'An error occurred while deleting the post. Please try again later.',
                variant: 'destructive',
            });
        },
    });

    const initialEditorValue = useMemo<JSONContent | null>(() => {
        const raw = post?.content as unknown;
        let parsed: JSONContent | null = null;

        if (!raw) return null;

        try {
            if (typeof raw === 'string') {
                let tmp: unknown = JSON.parse(raw);
                // Handle double-encoded JSON strings
                if (typeof tmp === 'string') {
                    try {
                        tmp = JSON.parse(tmp);
                    } catch {
                        // ignore
                    }
                }
                if (tmp && typeof tmp === 'object') {
                    parsed = tmp as JSONContent;
                }
            } else if (typeof raw === 'object') {
                parsed = raw as JSONContent;
            }
        } catch {
            // ignore parse failures, editor will start empty
        }

        return parsed;
    }, [post?.content]);

    // Set form values when post data is loaded
    useEffect(() => {
        if (post) {
            // The API already extracts the post, so use it directly
            const postData = post;

            // Normalize status to match enum values - ensure it's never empty
            let normalizedStatus: 'Draft' | 'Published' | 'Archived' = 'Draft';
            if (postData.status && typeof postData.status === 'string') {
                const statusStr = postData.status.trim();
                if (statusStr === 'Published') {
                    normalizedStatus = 'Published';
                } else if (statusStr === 'Archived' || statusStr === 'Expired') {
                    normalizedStatus = 'Archived';
                } else if (statusStr === 'Draft') {
                    normalizedStatus = 'Draft';
                } else {
                    // If status doesn't match any, default to Draft
                    normalizedStatus = 'Draft';
                }
            }

            const defaultValues = {
                title: postData.title || '',
                content: postData.content || '',
                status: normalizedStatus, // This will always be a valid enum value
                image: postData.image || '',
                tags: postData.tags || [],
                enableComments: postData.enableComments !== undefined ? postData.enableComments : true,
            };

            // Reset form with the values - use reset with keepValues option
            form.reset(defaultValues);

            // Also explicitly set the status field to ensure it updates
            form.setValue('status', normalizedStatus, { shouldValidate: false });

            // Set breadcrumbs with post title
            if (postData.title) {
                setBreadcrumbs([
                    { label: 'Posts', href: '/dashboard/posts' },
                    { label: 'Edit', href: `/dashboard/posts/edit/${postId}` },
                    { label: postData.title },
                ]);
            }
        }
    }, [post, form, setBreadcrumbs, postId]);

    const onSubmit = (values: PostFormData) => {
        const formData = new FormData();
        formData.append('title', values.title);
        formData.append('status', values.status);
        formData.append('content', JSON.stringify(editorContent ?? initialEditorValue ?? values.content));
        // Only append image if it exists and has a value
        if (values.image && values.image.trim().length > 0) {
            formData.append('image', values.image);
        }
        if (values.enableComments !== undefined) {
            formData.append('enableComments', values.enableComments.toString());
        }
        if (values.tags) {
            values.tags.forEach((tag) => {
                formData.append('tags[]', tag);
            });
        }
        updatePostMutation.mutate(formData);
    };

    const handleImageSelect = (image: string | string[] | null, onChange: (value: string) => void) => {
        const url = Array.isArray(image) ? (image[0] ?? '') : (image ?? '');
        if (url) {
            onChange(url);
            setImageDialogOpen(false);
        }
    };

    const handleRemoveImage = (onChange: (value: string) => void) => {
        onChange('');
    };

    const handleDeletePost = async () => {
        if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
            deletePostMutation.mutate();
        }
    };

    if (!hasValidId) {
        return (
            <div className="container mx-auto py-8">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-destructive mb-4">Invalid post</h1>
                    <p className="text-muted-foreground mb-4">The post ID in the URL is missing or invalid.</p>
                    <Link href="/dashboard/posts">
                        <Button>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Posts
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="space-y-4 w-full max-w-6xl">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-96 w-full" />
                </div>
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className="container mx-auto py-8">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Post not found</h1>
                    <p className="text-gray-600 mb-4">The post you&#39;re trying to edit doesn&#39;t exist or you don&#39;t have permission to edit it.</p>
                    <Link href="/dashboard/posts">
                        <Button>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Posts
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full flex-col">
            {updatePostMutation.isPending && (
                <div className="flex flex-col space-y-3">
                    <Skeleton className="h-full w-full top-0 left-0 absolute z-10 rounded-xl" />
                    <div className="space-y-2 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                        <p className="text-center">Updating post...</p>
                    </div>
                </div>
            )}

            <div className="container mx-auto px-4 max-w-6xl mb-6">
                <DashboardCardHeader
                    variant="split"
                    icon={FileText}
                    badge="Post"
                    title="Edit Post"
                    description="Update your post content and settings"
                    backButton={{
                        onClick: () => router.push('/dashboard/posts'),
                        icon: ArrowLeft,
                    }}
                    actions={
                        <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" disabled={deletePostMutation.isPending} asChild>
                                <Link href={`/blog/${postId}`} target="_blank">
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    View Post
                                </Link>
                            </Button>
                            <Button
                                size="sm"
                                disabled={updatePostMutation.isPending}
                                onClick={form.handleSubmit(onSubmit)}
                            >
                                {updatePostMutation.isPending ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</>
                                ) : (
                                    <><Save className="mr-2 h-4 w-4" />Update Post</>
                                )}
                            </Button>
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={handleDeletePost}
                                disabled={deletePostMutation.isPending}
                            >
                                {deletePostMutation.isPending ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 className="mr-2 h-4 w-4" />
                                )}
                                Delete
                            </Button>
                        </div>
                    }
                />
            </div>

            <Form {...form}>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.handleSubmit(onSubmit)();
                    }}
                    className="mx-auto grid w-full max-w-6xl items-start gap-6 grid-cols-3"
                >
                    <div className="col-span-2 space-y-6 max-lg:col-span-3">
                        <Card className="mt-6">
                            <CardHeader>
                                <div className="flex items-center space-x-4">
                                    {post.author && (
                                        <Avatar>
                                            <AvatarImage
                                                src={post.author?.avatar || post.author?.profilePicture}
                                                alt={post.author?.name}
                                            />
                                            <AvatarFallback>
                                                {post.author?.name?.charAt(0).toUpperCase() || 'U'}
                                            </AvatarFallback>
                                        </Avatar>
                                    )}
                                    <div>
                                        <CardTitle>Edit Post</CardTitle>
                                        <CardDescription>
                                            Fill out the form below to edit a post.
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-6">
                                    <FormField
                                        control={form.control}
                                        name="title"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Title</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="text"
                                                        className="w-full"
                                                        {...field}
                                                        disabled={updatePostMutation.isPending}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="content"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Content</FormLabel>
                                                <FormControl>
                                                    <NovelEditor
                                                        key={String((post as { id?: string; _id?: string })?.id ?? (post as { _id?: string })?._id ?? 'empty')}
                                                        initialValue={editorContent ?? initialEditorValue}
                                                        onContentChange={(content: JSONContent) => {
                                                            setEditorContent(content);
                                                            field.onChange(JSON.stringify(content));
                                                        }}
                                                        placeholder="Start writing your post content..."
                                                        minHeight="400px"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="col-span-1 space-y-6 max-lg:col-span-3">
                        <Card className="mt-6 p-5">
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => {
                                    // Get the current form value - ensure it's never undefined
                                    const currentValue = field.value || 'Draft';

                                    return (
                                        <FormItem>
                                            <FormLabel>Status</FormLabel>
                                            <Select
                                                key={`status-${currentValue}`} // Force re-render when value changes
                                                onValueChange={(value) => {
                                                    field.onChange(value);
                                                }}
                                                value={currentValue}
                                                disabled={updatePostMutation.isPending}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select status type">
                                                            {currentValue}
                                                        </SelectValue>
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Published">Published</SelectItem>
                                                    <SelectItem value="Draft">Draft</SelectItem>
                                                    <SelectItem value="Archived">Archived</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    );
                                }}
                            />
                        </Card>

                        <Card className="mt-6 p-5">
                            <FormField
                                control={form.control}
                                name="image"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Image</FormLabel>
                                        {field.value ? (
                                            <div className="relative rounded-lg overflow-hidden aspect-[4/3] group mt-2">
                                                <Link
                                                    href={field.value}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="absolute inset-0 z-0"
                                                    aria-label="Open image in new tab"
                                                />
                                                <Image
                                                    src={field.value}
                                                    alt={form.getValues('title') || 'Post image'}
                                                    fill
                                                    className="object-cover transition-transform group-hover:scale-105"
                                                    sizes="(max-width: 768px) 100vw, 360px"
                                                />
                                                <div className="absolute inset-0 z-10 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="secondary"
                                                        className="h-9"
                                                        onClick={() => setImageDialogOpen(true)}
                                                        disabled={updatePostMutation.isPending}
                                                    >
                                                        <ImageIcon className="h-4 w-4 mr-2" />
                                                        Change
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="destructive"
                                                        className="h-9"
                                                        onClick={() => handleRemoveImage(field.onChange)}
                                                        disabled={updatePostMutation.isPending}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                className="mt-2 w-full aspect-[4/3] rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-3 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                                                onClick={() => setImageDialogOpen(true)}
                                                disabled={updatePostMutation.isPending}
                                            >
                                                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-sm font-medium text-foreground">Upload image</p>
                                                    <p className="text-xs text-muted-foreground">Click to browse gallery</p>
                                                </div>
                                            </button>
                                        )}

                                        <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
                                            <DialogContent
                                                className="!max-w-[80vw] !max-h-[90vh] overflow-auto"
                                                onInteractOutside={(e) => e.preventDefault()}
                                            >
                                                <DialogHeader>
                                                    <DialogTitle>
                                                        {field.value ? 'Change image' : 'Select image'}
                                                    </DialogTitle>
                                                    <DialogDescription>
                                                        Choose an image from your gallery
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <Gallery
                                                    mode="picker"
                                                    onMediaSelect={(image) => handleImageSelect(image, field.onChange)}
                                                    allowMultiple={false}
                                                    initialTab="images"
                                                />
                                            </DialogContent>
                                        </Dialog>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </Card>

                        <Card className="mt-6 p-5">
                            <FormField
                                control={form.control}
                                name="tags"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tags</FormLabel>
                                        <FormControl>
                                            <InputTags
                                                value={field.value || []}
                                                onChange={(newTags) => field.onChange(newTags)}
                                                placeholder="Enter tags..."
                                                disabled={updatePostMutation.isPending}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Press enter to add a tag
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </Card>

                        <Card className="mt-6 p-5">
                            <FormField
                                control={form.control}
                                name="enableComments"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-xs">
                                        <div className="space-y-0.5">
                                            <FormLabel>Enable Comments</FormLabel>
                                            <FormDescription>
                                                Allow users to comment on this post
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                disabled={updatePostMutation.isPending}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </Card>

                        <div className="mt-6 flex w-full items-center justify-between md:hidden">
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={handleDeletePost}
                                disabled={deletePostMutation.isPending}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={updatePostMutation.isPending}
                            >
                                {updatePostMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <span className="ml-2">Update Post</span>
                            </Button>
                        </div>
                    </div>
                </form>
            </Form>

            {/* Comments Section - Only show if comments are enabled */}
            {post.enableComments && (
                <div className="mx-auto w-full max-w-6xl mt-6">
                    <CommentsSection postId={postId} />
                </div>
            )}
        </div>
    );
}
