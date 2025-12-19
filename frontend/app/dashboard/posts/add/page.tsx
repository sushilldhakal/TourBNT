'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Save, ArrowLeft, Trash2, Paperclip, FileText } from 'lucide-react';
import Link from 'next/link';
import { addPost } from '@/lib/api/posts';
import NovelEditor from '@/components/dashboard/editor/NovelEditor';
import { InputTags } from '@/components/ui/input-tags';
import { GalleryPage } from '@/components/dashboard/gallery/GalleryPage';
import type { JSONContent } from 'novel';
import { Skeleton } from '@/components/ui/skeleton';

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

type PostFormData = z.infer<typeof postSchema>;

export default function AddPostPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [imageDialogOpen, setImageDialogOpen] = useState(false);
    const [editorContent, setEditorContent] = useState<JSONContent | null>(null);

    const form = useForm<PostFormData>({
        resolver: zodResolver(postSchema),
        defaultValues: {
            title: '',
            content: '',
            status: 'Draft',
            image: '',
            tags: [],
            enableComments: true,
        },
        mode: 'onSubmit',
        shouldUnregister: false,
        reValidateMode: 'onChange',
    });

    // Create post mutation
    const createPostMutation = useMutation({
        mutationFn: (data: FormData) => addPost(data),
        onSuccess: (data: any) => {
            toast({
                title: 'Success',
                description: 'Post created successfully',
            });
            // Invalidate queries to refetch data
            queryClient.invalidateQueries({ queryKey: ['posts'] });
            // Navigate to edit page for the newly created post
            const postId = data?.post?._id || data?.post?.id || data?._id || data?.id;
            if (postId) {
                router.push(`/dashboard/posts/edit/${postId}`);
            } else {
                router.push('/dashboard/posts');
            }
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message || 'Failed to create post',
                variant: 'destructive',
            });
        },
    });

    const onSubmit = (values: PostFormData) => {
        const formData = new FormData();
        formData.append('title', values.title);
        formData.append('status', values.status);
        formData.append('content', JSON.stringify(editorContent || values.content));
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
        createPostMutation.mutate(formData);
    };

    const handleContentChange = (content: string) => {
        form.setValue('content', content);
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

    return (
        <div className="flex min-h-screen w-full flex-col">
            {createPostMutation.isPending && (
                <div className="flex flex-col space-y-3">
                    <Skeleton className="h-full w-full top-0 left-0 absolute z-10 rounded-xl" />
                    <div className="space-y-2 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                        <p className="text-center">Creating post...</p>
                    </div>
                </div>
            )}

            {/* Page Header Actions */}
            <div className="mb-6">
                <Card className="border shadow-xs">
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <FileText className="h-4 w-4" />
                                <span>Post Editor</span>
                            </div>
                            <h1 className="text-lg font-semibold">Create New Post</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => router.back()}
                                disabled={createPostMutation.isPending}
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={createPostMutation.isPending}
                                onClick={form.handleSubmit(onSubmit)}
                            >
                                {createPostMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Create Post
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
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
                                    <div>
                                        <CardTitle>Create Post</CardTitle>
                                        <CardDescription>
                                            Fill out the form below to create a new post.
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
                                                        placeholder="Enter post title"
                                                        {...field}
                                                        disabled={createPostMutation.isPending}
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
                                                        key={editorContent ? `${JSON.stringify(editorContent).length}` : 'empty'}
                                                        initialValue={editorContent}
                                                        onContentChange={(content: JSONContent) => {
                                                            setEditorContent(content);
                                                            field.onChange(JSON.stringify(content));
                                                        }}
                                                        placeholder="Start writing your post content..."
                                                        className="min-h-[400px]"
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
                                    const currentValue = form.watch('status') || field.value || 'Draft';

                                    return (
                                        <FormItem>
                                            <FormLabel>Status</FormLabel>
                                            <Select
                                                key={`status-${currentValue}`}
                                                onValueChange={(value) => {
                                                    field.onChange(value);
                                                }}
                                                value={currentValue}
                                                disabled={createPostMutation.isPending}
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
                                        <FormLabel>Cover Image</FormLabel>
                                        {field.value ? (
                                            <div className="mt-2 relative">
                                                <Link href={field.value} target="_blank" rel="noopener noreferrer">
                                                    <img
                                                        src={field.value}
                                                        alt="Selected Cover Image"
                                                        className="rounded-md w-full"
                                                    />
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveImage(field.onChange)}
                                                    className="absolute top-1 right-1 mt-2 text-red-600 hover:underline"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        className="size-8"
                                                    >
                                                        <Paperclip className="h-4 w-4" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-[90%] max-h-[90%] overflow-auto">
                                                    <DialogHeader>
                                                        <DialogTitle>Select Image</DialogTitle>
                                                        <DialogDescription>
                                                            Choose an image from your gallery.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="mt-4">
                                                        <GalleryPage
                                                            mode="picker"
                                                            onMediaSelect={(image) => handleImageSelect(image, field.onChange)}
                                                            allowMultiple={false}
                                                            mediaType="images"
                                                            initialTab="images"
                                                        />
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        )}
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
                                                disabled={createPostMutation.isPending}
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
                                                disabled={createPostMutation.isPending}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </Card>

                        <div className="mt-6 flex w-full items-center justify-between md:hidden">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => router.back()}
                                disabled={createPostMutation.isPending}
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={createPostMutation.isPending}
                            >
                                {createPostMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <span className="ml-2">Create Post</span>
                            </Button>
                        </div>
                    </div>
                </form>
            </Form>
        </div>
    );
}
