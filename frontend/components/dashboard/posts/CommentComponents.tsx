'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MessageCircle, ThumbsUp, Share2, Trash2, Eye } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCommentsByPost, likeComment, viewComment, addReply, deleteComment } from '@/lib/api/comments';
import { timeAgo } from '@/lib/utils/timeAgo';
import { useAuth } from '@/lib/hooks/useAuth';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface Comment {
    id?: string;
    _id?: string; // Support both id and _id for compatibility
    post: string;
    user: {
        id?: string;
        _id?: string; // Support both id and _id
        name: string;
        email: string;
        avatar?: string;
    } | null;
    text: string;
    approve: boolean;
    likes?: number;
    views?: number;
    timestamp?: string;
    replies?: Comment[];
    created_at: string;
    isLiked?: boolean;
}

// Helper function to convert any ID value to string (handles ObjectId objects)
const idToString = (id: any): string => {
    if (!id) return '';
    if (typeof id === 'string') return id;
    if (typeof id === 'object' && id.toString) return id.toString();
    return String(id);
};

// Helper function to get comment ID (handles both id and _id, ensures string)
const getCommentId = (comment: Comment): string => {
    const id = comment.id || comment._id;
    return idToString(id);
};

// Helper function to normalize comment data (convert _id to id, ensure strings)
const normalizeComment = (comment: Partial<Comment> & { _id?: any; id?: any }): Comment => {
    const commentId = idToString(comment.id || comment._id);
    const userId = comment.user ? idToString(comment.user.id || (comment.user as any)._id) : '';
    const user_id = comment.user ? idToString((comment.user as any)._id || comment.user.id) : '';

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
        created_at: comment.created_at || new Date().toISOString(),
        replies: comment.replies?.map((reply) => normalizeComment(reply as any)) || [],
    };
};

interface CommentComponentProps {
    comment: Comment;
    depth?: number;
    onRemove: (id: string) => void;
    isAdmin?: boolean;
    postId: string;
}

const CommentComponent = ({ comment: initialComment, depth = 0, onRemove, isAdmin = false, postId }: CommentComponentProps) => {
    // Normalize comment data to ensure id and _id are both available
    const normalizedComment = normalizeComment(initialComment);
    const [comment, setComment] = useState(normalizedComment);
    const [isReplying, setIsReplying] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [isLiked, setIsLiked] = useState(normalizedComment.isLiked || false);
    const queryClient = useQueryClient();
    const { userId } = useAuth();

    // Get commentId from normalized comment - ensure it's always available
    // Try multiple sources: comment state, normalizedComment, or initialComment
    const commentId = useMemo(() => {
        // Try to get ID from various sources
        const idFromComment = getCommentId(comment);
        const idFromNormalized = getCommentId(normalizedComment);
        const idFromInitial = getCommentId(initialComment);

        // Also try direct extraction from initialComment (might have _id but not id)
        const directId = idToString((initialComment as any)?._id || (initialComment as any)?.id);

        const finalId = idFromComment || idFromNormalized || idFromInitial || directId;

        // Debug logging for nested comments
        if (process.env.NODE_ENV === 'development') {
            if (!finalId) {
                console.warn('Comment ID not found:', {
                    depth,
                    comment: { id: comment.id, _id: comment._id },
                    normalizedComment: { id: normalizedComment.id, _id: normalizedComment._id },
                    initialComment: { id: (initialComment as any).id, _id: (initialComment as any)._id },
                    directId
                });
            } else if (depth > 0) {
                console.log('Nested comment ID found:', { depth, commentId: finalId, source: 'nested' });
            }
        }

        return idToString(finalId);
    }, [comment, normalizedComment, initialComment, depth]);

    // Normalize replies that are already in the comment data (no need to fetch separately)
    // Replies are already populated by the backend in getCommentsByPost
    const displayComment = useMemo(() => {
        if (comment.replies && Array.isArray(comment.replies) && comment.replies.length > 0) {
            // Check if replies are already objects (populated) or just IDs
            const normalizedReplies: Comment[] = comment.replies
                .filter((reply: any) => {
                    // Filter out ID strings, keep only objects
                    if (!reply) return false;
                    if (typeof reply === 'string') return false; // Skip ID strings
                    return typeof reply === 'object';
                })
                .map((reply: unknown) => {
                    // Normalize each reply, ensuring ID is extracted
                    const normalized = normalizeComment(reply as Partial<Comment> & { _id?: string; id?: string });
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

    // Track view when comment is rendered
    useEffect(() => {
        // Only track view if this is a top-level comment (to avoid counting views for replies)
        if (depth === 0 && commentId) {
            viewComment(commentId).catch(error => {
                console.error('Error tracking comment view:', error);
            });
        }
    }, [commentId, depth]);

    // Like mutation
    const likeMutation = useMutation({
        mutationFn: () => {
            // Ensure user is logged in
            if (!userId) {
                throw new Error('User ID is required to like a comment');
            }
            return likeComment(commentId, userId);
        },
        onSuccess: (data: any) => {
            setComment(prevComment => ({
                ...prevComment,
                likes: data?.likes ?? prevComment.likes
            }));
            setIsLiked(data?.isLiked ?? false);
            toast({
                title: data?.isLiked ? 'Liked' : 'Unliked',
                description: data?.isLiked ? 'You liked this comment' : 'You unliked this comment',
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
        onSuccess: (data) => {
            // Normalize and add the new reply to the comment
            const normalizedReply = normalizeComment(data as Partial<Comment> & { _id?: string; id?: string });
            setComment(prevComment => ({
                ...prevComment,
                replies: [...(prevComment.replies || []), normalizedReply]
            }));

            // Reset reply form
            setIsReplying(false);
            setReplyContent('');

            // Show success message
            toast({
                title: 'Reply added',
                description: 'Your reply has been added successfully',
                duration: 2000,
            });

            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['comment-replies', commentId] });
            queryClient.invalidateQueries({ queryKey: ['comments', postId] });
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
        console.log('commentId', commentId);
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
        onRemove(validId);
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
                    <p className="text-sm text-muted-foreground">{timeAgo(new Date(displayComment.created_at))}</p>
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
                        <ThumbsUp className={`mr-2 h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                        {displayComment.likes ?? 0}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleReply}>
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Reply
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleShare}>
                        <Share2 className="mr-2 h-4 w-4" />
                        Share
                    </Button>
                    <div className="flex items-center text-muted-foreground">
                        <Eye className="mr-1 h-4 w-4" />
                        <span className="text-sm">{displayComment.views ?? 0}</span>
                    </div>
                </div>
                {isAdmin && (
                    <Button variant="ghost" size="sm" onClick={handleRemove}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                    </Button>
                )}
            </CardFooter>
            {isReplying && (
                <CardFooter>
                    <form onSubmit={handleSubmitReply} className="flex w-full items-center space-x-2">
                        <Input
                            placeholder="Write a reply..."
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            disabled={replyMutation.isPending}
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
    const queryClient = useQueryClient(); // Move this BEFORE the mutation

    const { data: commentsData, isLoading } = useQuery({
        queryKey: ['comments', postId],
        queryFn: () => getCommentsByPost(postId),
        enabled: !!postId,
    });

    const deleteCommentMutation = useMutation({
        mutationFn: (commentId: string) => deleteComment(commentId),
        onSuccess: () => {
            toast({
                title: 'Comment removed',
                description: 'The comment has been removed',
            });
            queryClient.invalidateQueries({ queryKey: ['comments', postId] });
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to delete comment',
                variant: 'destructive',
            });
        },
    });

    const handleRemoveComment = (commentId: string) => {

        console.log('commentId', commentId);
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

        if (confirm('Are you sure you want to delete this comment?')) {
            deleteCommentMutation.mutate(validId);
        }
    };

    if (isLoading) {
        return <div className="text-center py-8">Loading comments...</div>;
    }

    // Handle the response structure
    // extractResponseData returns { items: [...], pagination: {...} } from sendPaginatedResponse
    const comments: Comment[] = Array.isArray(commentsData)
        ? commentsData
        : (commentsData as { items?: Comment[]; comments?: Comment[] })?.items
        || (commentsData as { items?: Comment[]; comments?: Comment[] })?.comments
        || [];

    // Debug log to help troubleshoot
    if (process.env.NODE_ENV === 'development') {
        console.log('Comments data:', { commentsData, comments, commentsLength: comments.length });
    }

    if (!comments || comments.length === 0) {
        return <div className="text-center py-8">No comments yet. Be the first to comment!</div>;
    }

    return (
        <div className="space-y-6 mt-6">
            <h2 className="text-2xl font-bold">Comments ({comments.length})</h2>
            {comments.map((comment: Comment) => {
                const normalizedComment = normalizeComment(comment);
                const commentId = getCommentId(normalizedComment);
                return (
                    <CommentComponent
                        key={commentId}
                        comment={normalizedComment}
                        onRemove={handleRemoveComment}
                        isAdmin={true}
                        postId={postId}
                    />
                );
            })}
        </div>
    );
}

export default CommentsSection;
