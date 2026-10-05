'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MessageCircle, ThumbsUp, Share2, Trash2, Eye } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useMutation } from '@tanstack/react-query';
import { useCommentsByPost, useCacheManager } from '@/lib/queries';
import { queryKeys } from '@/lib/queries/queryKeys';
import { likeComment, addReply, deleteComment } from '@/lib/api/comments';
import { timeAgo } from '@/lib/utils/timeAgo';
import { useAuth } from '@/lib/hooks/useAuth';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { PostComment } from '@/types/post';

/** Turns an id from the API (string, or a leftover Mongo buffer object) into a string. */
const idToString = (id: unknown): string => {
    if (!id) return '';
    if (typeof id === 'string') return id;

    if (typeof id === 'object') {
        const record = id as { buffer?: unknown; toString?: () => string; _id?: unknown };
        const buffer = record.buffer && typeof record.buffer === 'object' ? record.buffer : record;
        const bytes = Object.values(buffer as Record<string, unknown>).filter((value): value is number => typeof value === 'number');
        if (bytes.length === 12) {
            return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
        }
        if (typeof record.toString === 'function') {
            const stringValue = record.toString();
            if (stringValue !== '[object Object]') return stringValue;
        }
        if (record._id) return idToString(record._id);
    }

    return String(id);
};

// Helper function to get comment ID (handles both id and _id, ensures string)
const getCommentId = (comment: PostComment): string => {
    const id = comment.id || comment._id;
    return idToString(id);
};

// Helper function to normalize comment data (convert _id to id, ensure strings)
const normalizeComment = (comment: Partial<PostComment>): PostComment => {
    const commentId = idToString(comment.id || comment._id);
    const userId = comment.user ? idToString(comment.user.id || comment.user._id) : '';
    const user_id = comment.user ? idToString(comment.user._id || comment.user.id) : '';

    return {
        ...comment,
        id: commentId,
        _id: commentId, // Use same value for both
        user: comment.user ? {
            ...comment.user,
            id: userId,
            _id: user_id,
            name: comment.user.name || '',
            email: comment.user.email || '',
            avatar: comment.user.avatar,
        } : null,
        post: typeof comment.post === 'string' ? comment.post : idToString(comment.post),
        text: comment.text || '',
        approve: comment.approve ?? false,
        likes: comment.likes ?? 0,
        views: comment.views ?? 0,
        createdAt: comment.createdAt || new Date().toISOString(),
        replies: comment.replies?.map((reply) => normalizeComment(reply)) || [],
    };
};

interface CommentComponentProps {
    comment: PostComment;
    depth?: number;
    onRemove: (id: string, comment?: PostComment) => void;
    onRefresh?: () => void;
    isAdmin?: boolean;
    postId: string;
}

const CommentComponent = ({ comment: initialComment, depth = 0, onRemove, onRefresh, isAdmin = false, postId }: CommentComponentProps) => {
    // Normalize comment data to ensure id and _id are both available
    const normalizedComment = normalizeComment(initialComment);
    const [comment, setComment] = useState(normalizedComment);
    const [seenComment, setSeenComment] = useState(initialComment);
    const [isReplying, setIsReplying] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [isLiked, setIsLiked] = useState(normalizedComment.isLiked || false);
    const { invalidateComments } = useCacheManager();
    const { userId } = useAuth();
    const replyInputRef = useRef<HTMLInputElement>(null);

    if (initialComment !== seenComment) {
        const next = normalizeComment(initialComment);
        setSeenComment(initialComment);
        setComment(next);
        setIsLiked(next.isLiked || false);
    }

    // Auto-focus reply input when it appears
    useEffect(() => {
        if (isReplying && replyInputRef.current) {
            replyInputRef.current.focus();
        }
    }, [isReplying]);

    // Get commentId from normalized comment - ensure it's always available
    // Try multiple sources: comment state, normalizedComment, or initialComment
    const commentId = useMemo(() => {
        // Try to get ID from various sources
        const idFromComment = getCommentId(comment);
        const idFromNormalized = getCommentId(normalizedComment);
        const idFromInitial = getCommentId(initialComment);

        // Also try direct extraction from initialComment (might have _id but not id)
        const directId = idToString(initialComment._id || initialComment.id);

        const finalId = idFromComment || idFromNormalized || idFromInitial || directId;

        return idToString(finalId);
    }, [comment, normalizedComment, initialComment]);

    // Normalize replies that are already in the comment data (no need to fetch separately)
    // Replies are already populated by the backend in getCommentsByPost
    const displayComment = useMemo(() => {
        if (comment.replies && Array.isArray(comment.replies) && comment.replies.length > 0) {
            // Check if replies are already objects (populated) or just IDs
            const normalizedReplies: PostComment[] = comment.replies
                .filter((reply: PostComment | string) => {
                    // Filter out ID strings, keep only objects
                    if (!reply) return false;
                    if (typeof reply === 'string') return false; // Skip ID strings
                    return typeof reply === 'object';
                })
                .map((reply: unknown) => {
                    // Normalize each reply, ensuring ID is extracted
                    const normalized = normalizeComment(reply as Partial<PostComment> & { _id?: string; id?: string });
                    // Double-check that ID was extracted
                    if (!normalized.id && !normalized._id) {
                        console.warn('Reply missing ID after normalization:', reply);
                    }
                    return normalized;
                });

            if (normalizedReplies.length > 0) {
                return {
                    ...comment,
                    replies: normalizedReplies
                };
            }
        }
        return comment;
    }, [comment]);


    // Like mutation
    const likeMutation = useMutation({
        mutationFn: () => {
            // Ensure user is logged in
            if (!userId) {
                throw new Error('User ID is required to like a comment');
            }
            return likeComment(commentId, userId);
        },
        onSuccess: (data: unknown) => {
            const result = data as { likes?: number; isLiked?: boolean };
            setComment(prevComment => ({
                ...prevComment,
                likes: result?.likes ?? prevComment.likes
            }));
            setIsLiked(result?.isLiked ?? false);
            toast({
                title: result?.isLiked ? 'Liked' : 'Unliked',
                description: result?.isLiked ? 'You liked this comment' : 'You unliked this comment',
                duration: 2000,
            });
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to toggle like',
                variant: 'destructive',
            });
        },
    });

    // Reply mutation
    const replyMutation = useMutation({
        mutationFn: ({ content, commentId }: { content: string; commentId: string }) => {
            // Ensure userId is not empty
            if (!userId) {
                throw new Error('User ID is required to reply to a comment');
            }

            return addReply({
                text: content,
                user: userId,
                post: postId
            }, commentId);
        },
        onSuccess: async (data) => {
            // ✅ Check if reply was converted to sibling (due to depth limit)
            const metadata = (data as { _metadata?: { wasConvertedToSibling?: boolean } })._metadata;
            const wasConvertedToSibling = metadata?.wasConvertedToSibling;

            // Reset reply form first
            setIsReplying(false);
            setReplyContent('');

            if (wasConvertedToSibling) {
                // Reply was reparented - don't update local state, trigger parent refresh
                console.log('📝 Reply converted to sibling:', metadata);
                console.log('📝 Triggering parent refresh...');

                toast({
                    title: 'Reply added as continuation',
                    description: 'Your reply was added to continue the conversation',
                    duration: 3000,
                });

                // Call parent refresh callback if provided
                if (onRefresh) {
                    setTimeout(() => {
                        console.log('📝 Calling onRefresh...');
                        onRefresh();
                    }, 200);
                } else {
                    // Fallback to query invalidation
                    console.log('📝 No onRefresh callback, using invalidation...');
                    invalidateComments({ postId });
                }
            } else {
                // Normal reply - add to local state immediately for instant feedback
                const normalizedReply = normalizeComment(data as Partial<PostComment> & { _id?: string; id?: string });
                setComment(prevComment => ({
                    ...prevComment,
                    replies: [...(prevComment.replies || []), normalizedReply]
                }));

                toast({
                    title: 'Reply added',
                    description: 'Your reply has been added successfully',
                    duration: 2000,
                });

                // Regular invalidation for normal replies
                invalidateComments({ postId, commentId });
            }
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to add reply',
                variant: 'destructive',
            });
        }
    });

    const handleLike = (event: React.MouseEvent) => {
        event.preventDefault();

        // Check if user is logged in
        if (!userId) {
            toast({
                title: 'Authentication required',
                description: 'You must be logged in to like comments',
                variant: 'destructive',
            });
            return;
        }

        likeMutation.mutate();
    };

    const handleReply = (event: React.MouseEvent) => {
        event.preventDefault();
        setIsReplying(!isReplying);
    };

    const handleShare = (event: React.MouseEvent) => {
        event.preventDefault();
        // Implement share functionality
        const shareText = `Check out this comment by ${comment.user?.name}: "${comment.text}"`;
        if (navigator.share) {
            navigator.share({
                title: 'Shared Comment',
                text: shareText,
                url: window.location.href,
            }).then(() => {
                toast({
                    title: 'Shared successfully',
                    description: 'The comment has been shared.',
                });
            }).catch((error) => {
                console.error('Error sharing:', error);
                toast({
                    title: 'Share failed',
                    description: 'There was an error sharing the comment.',
                    variant: 'destructive',
                });
            });
        } else {
            // Fallback for browsers that don't support navigator.share
            navigator.clipboard.writeText(shareText).then(() => {
                toast({
                    title: 'Copied to clipboard',
                    description: 'The comment has been copied to your clipboard.',
                });
            }).catch((error) => {
                console.error('Error copying to clipboard:', error);
                toast({
                    title: 'Copy failed',
                    description: 'There was an error copying the comment to clipboard.',
                    variant: 'destructive',
                });
            });
        }
    };

    const handleRemove = (event: React.MouseEvent) => {
        event.preventDefault();
        // Ensure commentId is a valid string before removing
        const validId = idToString(commentId);
        if (!validId) {
            toast({
                title: 'Error',
                description: 'Invalid comment ID',
                variant: 'destructive',
            });
            return;
        }
        onRemove(validId, displayComment); // ✅ Pass the comment object with replies info
    };

    const handleSubmitReply = (event: React.FormEvent) => {
        event.preventDefault();
        if (!replyContent.trim()) {
            toast({
                title: 'Empty reply',
                description: 'Please enter some text for your reply',
                variant: 'destructive',
            });
            return;
        }

        // Check if user is logged in
        if (!userId) {
            toast({
                title: 'Authentication required',
                description: 'You must be logged in to reply to comments',
                variant: 'destructive',
            });
            return;
        }

        replyMutation.mutate({
            content: replyContent,
            commentId: commentId
        });
    };

    return (
        <Card className={`mb-4 ${depth > 0 ? 'ml-6' : ''}`}>
            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                <Avatar>
                    <AvatarImage src={displayComment.user?.avatar} alt={displayComment.user?.name || 'User avatar'} />
                    <AvatarFallback>
                        {displayComment.user?.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                </Avatar>
                <div>
                    <h3 className="font-semibold">{displayComment.user?.name || 'Anonymous'}</h3>
                    <p className="text-sm text-muted-foreground">{timeAgo(new Date(displayComment.createdAt.toString()))}</p>
                </div>
            </CardHeader>
            <CardContent>
                <p>{displayComment.text}</p>
            </CardContent>
            <CardFooter className="flex justify-between">
                <div className="flex gap-4">
                    <Button
                        variant={isLiked ? 'default' : 'ghost'}
                        size="sm"
                        onClick={handleLike}
                        disabled={likeMutation.isPending}
                    >
                        <ThumbsUp className={`mr-2 h-4 w-4 ${isLiked ? 'fill-current' : ''}`} aria-hidden="true" />
                        {displayComment.likes ?? 0}
                    </Button>
                    {/* Only show Reply button if canReply is not explicitly false */}
                    {displayComment.canReply !== false && (
                        <Button variant="ghost" size="sm" onClick={handleReply}>
                            <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                            Reply
                        </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={handleShare}>
                        <Share2 className="mr-2 h-4 w-4" aria-hidden="true" />
                        Share
                    </Button>
                    <div className="flex items-center text-muted-foreground">
                        <Eye className="mr-1 h-4 w-4" aria-hidden="true" />
                        <span className="text-sm">{displayComment.views ?? 0}</span>
                    </div>
                </div>
                {isAdmin && (
                    <Button variant="ghost" size="sm" onClick={handleRemove}>
                        <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                        Remove
                    </Button>
                )}
            </CardFooter>
            {isReplying && (
                <CardFooter>
                    <form onSubmit={handleSubmitReply} className="flex w-full items-center space-x-2">
                        <Input
                            ref={replyInputRef}
                            placeholder="Write a reply..."
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            disabled={replyMutation.isPending}
                            autoFocus
                        />
                        <Button type="submit" disabled={replyMutation.isPending}>
                            {replyMutation.isPending ? 'Sending...' : 'Send'}
                        </Button>
                    </form>
                </CardFooter>
            )}
            {displayComment.replies && displayComment.replies.length > 0 && (
                <div className="px-4 pb-4">
                    {displayComment.replies?.map((reply, index) => {
                        // Ensure reply is properly normalized with ID
                        const normalizedReply = normalizeComment(reply);
                        const replyId = getCommentId(normalizedReply);

                        // Debug logging for replies
                        if (process.env.NODE_ENV === 'development' && !replyId) {
                            console.warn('Reply ID not found:', {
                                reply,
                                normalizedReply: { id: normalizedReply.id, _id: normalizedReply._id },
                                index,
                                depth
                            });
                        }

                        return (
                            <CommentComponent
                                key={replyId || `${commentId}-depth-${depth + 1}-idx-${index}`}
                                comment={normalizedReply}
                                depth={depth + 1}
                                onRemove={onRemove}
                                onRefresh={onRefresh}
                                isAdmin={isAdmin}
                                postId={postId}
                            />
                        );
                    })}
                </div>
            )}
        </Card>
    );
};

interface CommentsSectionProps {
    postId: string;
}

export function CommentsSection({ postId }: CommentsSectionProps) {
    const { invalidateComments, queryClient } = useCacheManager();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [commentToDelete, setCommentToDelete] = useState<{ id: string; hasReplies: boolean } | null>(null);

    const { data: commentsData, isLoading, refetch } = useCommentsByPost(postId, !!postId);

    const deleteCommentMutation = useMutation({
        mutationFn: (commentId: string) => deleteComment(commentId),
        onSuccess: async () => {
            console.log('🗑️ Comment deleted successfully, invalidating cache...');

            invalidateComments({ postId });
            await queryClient.refetchQueries({
                queryKey: queryKeys.comments.list(postId),
                exact: true
            });

            console.log('✅ Cache invalidated and refetched');

            toast({
                title: 'Comment removed',
                description: 'The comment and all its replies have been removed',
            });

            setDeleteDialogOpen(false);
            setCommentToDelete(null);
        },
        onError: (error) => {
            console.error('❌ Delete error:', error);
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to delete comment',
                variant: 'destructive',
            });
        },
    });


    const handleRemoveComment = (commentId: string, comment?: PostComment) => {
        // Validate commentId before proceeding
        const validId = idToString(commentId);
        if (!validId) {
            toast({
                title: 'Error',
                description: 'Invalid comment ID',
                variant: 'destructive',
            });
            return;
        }

        // Check if comment has replies
        const hasReplies = comment?.replies && Array.isArray(comment.replies) && comment.replies.length > 0;

        setCommentToDelete({ id: validId, hasReplies: !!hasReplies });
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (commentToDelete) {
            deleteCommentMutation.mutate(commentToDelete.id);
        }
    };

    if (isLoading) {
        return <div className="text-center py-8">Loading comments...</div>;
    }

    // Handle the response structure
    // extractResponseData returns { data: [...], pagination: {...} } from sendPaginatedResponse
    const comments: PostComment[] = Array.isArray(commentsData)
        ? commentsData
        : (commentsData as { data?: PostComment[]; comments?: PostComment[] })?.data
        || (commentsData as { comments?: PostComment[] })?.comments
        || [];


    if (!comments || comments.length === 0) {
        return <div className="text-center py-8">No comments yet. Be the first to comment!</div>;
    }

    return (
        <>
            <div className="space-y-6 mt-6">
                <h2 className="text-2xl font-bold">Comments ({comments.length})</h2>
                {comments.map((comment: PostComment) => {
                    const normalizedComment = normalizeComment(comment);
                    const commentId = getCommentId(normalizedComment);
                    return (
                        <CommentComponent
                            key={commentId}
                            comment={normalizedComment}
                            onRemove={handleRemoveComment}
                            onRefresh={() => {
                                console.log('🔄 Parent refetch triggered');
                                refetch();
                            }}
                            isAdmin={true}
                            postId={postId}
                        />
                    );
                })}
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Comment?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {commentToDelete?.hasReplies ? (
                                <>
                                    <span className="font-semibold text-destructive">Warning:</span> This comment has replies.
                                    Deleting this comment will also permanently delete all of its replies.
                                    <br /><br />
                                    This action cannot be undone.
                                </>
                            ) : (
                                <>
                                    Are you sure you want to delete this comment? This action cannot be undone.
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {commentToDelete?.hasReplies ? 'Delete Comment & Replies' : 'Delete Comment'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

export default CommentsSection;
