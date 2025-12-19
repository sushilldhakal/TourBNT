'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MessageCircle, ThumbsUp, Share2, Trash2, Eye } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCommentsByPost, getCommentWithReplies, likeComment, viewComment, addReply, deleteComment } from '@/lib/api/comments';
import { timeAgo } from '@/lib/utils/timeAgo';
import { useAuth } from '@/lib/hooks/useAuth';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface Comment {
    _id: string;
    post: string;
    user: {
        _id: string;
        name: string;
        email: string;
        avatar?: string;
    };
    text: string;
    approve: boolean;
    likes: number;
    views: number;
    timestamp: string;
    replies: Comment[];
    created_at: string;
    isLiked?: boolean;
}

interface CommentComponentProps {
    comment: Comment;
    depth?: number;
    onRemove: (id: string) => void;
    isAdmin?: boolean;
    postId: string;
}

const CommentComponent = ({ comment: initialComment, depth = 0, onRemove, isAdmin = false, postId }: CommentComponentProps) => {
    const [comment, setComment] = useState(initialComment);
    const [isReplying, setIsReplying] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [isLiked, setIsLiked] = useState(initialComment.isLiked || false);
    const queryClient = useQueryClient();
    const { userId } = useAuth();

    // Track view when comment is rendered
    useEffect(() => {
        // Only track view if this is a top-level comment (to avoid counting views for replies)
        if (depth === 0) {
            viewComment(comment._id).catch(error => {
                console.error('Error tracking comment view:', error);
            });
        }
    }, [comment._id, depth]);

    // Fetch replies if this comment has any
    const { data: repliesData } = useQuery({
        queryKey: ['comment-replies', comment._id],
        queryFn: () => getCommentWithReplies(comment._id),
        enabled: comment.replies && comment.replies.length > 0,
    });

    // Update comment with fetched replies
    useEffect(() => {
        if (repliesData) {
            setComment(prevComment => ({
                ...prevComment,
                replies: repliesData.replies || []
            }));
        }
    }, [repliesData]);

    // Like mutation
    const likeMutation = useMutation({
        mutationFn: () => {
            // Ensure user is logged in
            if (!userId) {
                throw new Error('User ID is required to like a comment');
            }
            return likeComment(comment._id, userId);
        },
        onSuccess: (data) => {
            setComment(prevComment => ({
                ...prevComment,
                likes: data.likes
            }));
            setIsLiked(data.isLiked);
            toast({
                title: data.isLiked ? 'Liked' : 'Unliked',
                description: data.isLiked ? 'You liked this comment' : 'You unliked this comment',
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
            // Add the new reply to the comment
            setComment(prevComment => ({
                ...prevComment,
                replies: [...(prevComment.replies || []), data]
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
            queryClient.invalidateQueries({ queryKey: ['comment-replies', comment._id] });
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
        onRemove(comment._id);
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
            commentId: comment._id
        });
    };

    return (
        <Card className={`mb-4 ${depth > 0 ? 'ml-6' : ''}`}>
            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                <Avatar>
                    <AvatarImage src={comment.user?.avatar} alt={comment.user?.name || 'User avatar'} />
                    <AvatarFallback>
                        {comment.user?.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                </Avatar>
                <div>
                    <h3 className="font-semibold">{comment.user?.name || 'Anonymous'}</h3>
                    <p className="text-sm text-muted-foreground">{timeAgo(new Date(comment.created_at))}</p>
                </div>
            </CardHeader>
            <CardContent>
                <p>{comment.text}</p>
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
                        {comment.likes || 0}
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
                        <span className="text-sm">{comment.views || 0}</span>
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
            {comment.replies && comment.replies.length > 0 && (
                <div className="px-4 pb-4">
                    {comment.replies.map((reply, index) => (
                        <CommentComponent
                            key={reply?._id ?? `${comment?._id ?? 'comment'}-depth-${depth + 1}-idx-${index}`}
                            comment={reply}
                            depth={depth + 1}
                            onRemove={onRemove}
                            isAdmin={isAdmin}
                            postId={postId}
                        />
                    ))}
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
        if (confirm('Are you sure you want to delete this comment?')) {
            deleteCommentMutation.mutate(commentId);
        }
    };

    if (isLoading) {
        return <div className="text-center py-8">Loading comments...</div>;
    }

    // Handle the response structure - it might be an array or an object with comments array
    const comments = Array.isArray(commentsData)
        ? commentsData
        : commentsData?.comments || commentsData?.data || [];

    if (!comments || comments.length === 0) {
        return <div className="text-center py-8">No comments yet. Be the first to comment!</div>;
    }

    return (
        <div className="space-y-6 mt-6">
            <h2 className="text-2xl font-bold">Comments ({comments.length})</h2>
            {comments.map((comment: Comment) => (
                <CommentComponent
                    key={comment._id}
                    comment={comment}
                    onRemove={handleRemoveComment}
                    isAdmin={true}
                    postId={postId}
                />
            ))}
        </div>
    );
}

export default CommentsSection;
