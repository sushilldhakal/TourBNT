'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star, ThumbsUp, Eye, MessageCircle, Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import {
    getTourReviews,
    addReview,
    addReviewReply,
    likeReview,
    likeReply,
    incrementReviewView,
    incrementReplyView,
} from '@/lib/api/reviews';
import { Review, Reply } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ReviewSystemProps {
    tourId: string;
    initialReviews?: Review[];
}

export function ReviewSystem({ tourId, initialReviews }: ReviewSystemProps) {
    // Fetch reviews with React Query and optimized caching
    const { data: reviewsData, refetch } = useQuery({
        queryKey: ['tourReviews', tourId],
        queryFn: () => getTourReviews(tourId, 'approved'),
        initialData: initialReviews ? { data: { reviews: initialReviews } } : undefined,
        staleTime: 2 * 60 * 1000, // 2 minutes - reviews are dynamic
        gcTime: 5 * 60 * 1000, // 5 minutes cache time
    });

    const reviews = reviewsData?.data?.reviews || [];

    return (
        <section className="bg-card border rounded-lg p-4 sm:p-6 space-y-4 sm:space-y-6" aria-labelledby="reviews-heading">
            <h2 id="reviews-heading" className="text-xl sm:text-2xl font-bold">Reviews</h2>

            {/* Review form */}
            <ReviewForm tourId={tourId} onSuccess={refetch} />

            {/* Reviews list */}
            <div className="space-y-4 sm:space-y-6" role="list" aria-label="Tour reviews">
                {reviews.length === 0 ? (
                    <p className="text-sm sm:text-base text-muted-foreground text-center py-6 sm:py-8" role="status">
                        No reviews yet. Be the first to review this tour!
                    </p>
                ) : (
                    reviews.map((review: Review) => (
                        <ReviewCard
                            key={review._id}
                            review={review}
                            tourId={tourId}
                            onUpdate={refetch}
                        />
                    ))
                )}
            </div>
        </section>
    );
}

interface ReviewFormProps {
    tourId: string;
    onSuccess: () => void;
}

function ReviewForm({ tourId, onSuccess }: ReviewFormProps) {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [hoveredRating, setHoveredRating] = useState(0);

    const addReviewMutation = useMutation({
        mutationFn: () => addReview(tourId, rating, comment),
        onSuccess: () => {
            toast({
                title: 'Review submitted',
                description: 'Your review has been submitted for approval.',
                variant: 'default',
            });
            setComment('');
            setRating(5);
            onSuccess();
        },
        onError: (error: any) => {
            toast({
                title: 'Error',
                description: error?.response?.data?.message || 'Failed to submit review. Please try again.',
                variant: 'destructive',
            });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!comment.trim()) {
            toast({
                title: 'Error',
                description: 'Please write a comment for your review.',
                variant: 'destructive',
            });
            return;
        }
        addReviewMutation.mutate();
    };

    return (
        <Card>
            <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
                <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4" aria-label="Submit a review">
                    <div>
                        <label id="rating-label" className="text-xs sm:text-sm font-medium mb-2 block">Your Rating</label>
                        <div className="flex gap-1 sm:gap-2" role="radiogroup" aria-labelledby="rating-label" aria-required="true">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    role="radio"
                                    aria-checked={rating === star}
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoveredRating(star)}
                                    onMouseLeave={() => setHoveredRating(0)}
                                    className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
                                    aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                                >
                                    <Star
                                        className={cn(
                                            'h-6 w-6 sm:h-8 sm:w-8 transition-colors',
                                            star <= (hoveredRating || rating)
                                                ? 'fill-yellow-400 text-yellow-400'
                                                : 'text-gray-300'
                                        )}
                                        aria-hidden="true"
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="comment" className="text-xs sm:text-sm font-medium mb-2 block">
                            Your Review
                        </label>
                        <Textarea
                            id="comment"
                            placeholder="Share your experience with this tour..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={4}
                            required
                            className="text-sm sm:text-base"
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={addReviewMutation.isPending}
                        className="min-h-[44px] text-sm sm:text-base"
                    >
                        {addReviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

interface ReviewCardProps {
    review: Review;
    tourId: string;
    onUpdate: () => void;
}

function ReviewCard({ review, tourId, onUpdate }: ReviewCardProps) {
    const [showReplyForm, setShowReplyForm] = useState(false);

    const likeReviewMutation = useMutation({
        mutationFn: () => likeReview(tourId, review._id),
        onSuccess: () => {
            onUpdate();
        },
    });

    const incrementViewMutation = useMutation({
        mutationFn: () => incrementReviewView(tourId, review._id),
        onSuccess: () => {
            onUpdate();
        },
    });

    const handleLike = () => {
        likeReviewMutation.mutate();
    };

    const handleIncrementView = () => {
        incrementViewMutation.mutate();
    };

    const userName = review.user?.name || review.name || 'Anonymous';
    const userAvatar = review.user?.profilePicture;
    const initials = userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <article className="border-b pb-4 sm:pb-6 last:border-b-0" role="listitem">
            <div className="flex gap-3 sm:gap-4">
                <Avatar className="h-8 w-8 sm:h-10 sm:w-10 shrink-0">
                    {userAvatar && <AvatarImage src={userAvatar} alt={`${userName}'s avatar`} />}
                    <AvatarFallback className="text-xs sm:text-sm">{initials}</AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-2 sm:space-y-3 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-semibold text-sm sm:text-base">{userName}</h4>
                                {review.status === 'pending' && (
                                    <Badge variant="secondary" className="text-xs" role="status">Pending Approval</Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <div className="flex" role="img" aria-label={`${review.rating} out of 5 stars`}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            className={cn(
                                                'h-3 w-3 sm:h-4 sm:w-4',
                                                star <= review.rating
                                                    ? 'fill-yellow-400 text-yellow-400'
                                                    : 'text-gray-300'
                                            )}
                                            aria-hidden="true"
                                        />
                                    ))}
                                </div>
                                <time className="text-xs sm:text-sm text-muted-foreground" dateTime={review.createdAt}>
                                    {new Date(review.createdAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </time>
                            </div>
                        </div>
                    </div>

                    <p className="text-xs sm:text-sm break-words">{review.comment}</p>

                    <div className="flex items-center gap-2 sm:gap-4 flex-wrap" role="group" aria-label="Review actions">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleLike}
                            disabled={likeReviewMutation.isPending}
                            className="gap-1 h-8 sm:h-9 px-2 sm:px-3 min-h-[44px]"
                            aria-label={`Like review, ${review.likes || 0} likes`}
                        >
                            <ThumbsUp className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
                            <span className="text-xs sm:text-sm" aria-hidden="true">{review.likes || 0}</span>
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleIncrementView}
                            disabled={incrementViewMutation.isPending}
                            className="gap-1 h-8 sm:h-9 px-2 sm:px-3 min-h-[44px]"
                            aria-label={`View count: ${review.views || 0}`}
                        >
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
                            <span className="text-xs sm:text-sm" aria-hidden="true">{review.views || 0}</span>
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowReplyForm(!showReplyForm)}
                            className="gap-1 h-8 sm:h-9 px-2 sm:px-3 min-h-[44px]"
                            aria-label={showReplyForm ? 'Cancel reply' : 'Reply to review'}
                            aria-expanded={showReplyForm}
                        >
                            <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
                            <span className="text-xs sm:text-sm">Reply</span>
                        </Button>
                    </div>

                    {/* Reply form */}
                    {showReplyForm && (
                        <ReplyForm
                            tourId={tourId}
                            reviewId={review._id}
                            onSuccess={() => {
                                setShowReplyForm(false);
                                onUpdate();
                            }}
                            onCancel={() => setShowReplyForm(false)}
                        />
                    )}

                    {/* Replies list */}
                    {review.replies && review.replies.length > 0 && (
                        <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4 pl-3 sm:pl-4 border-l-2" role="list" aria-label="Replies to this review">
                            {review.replies.map((reply) => (
                                <ReplyCard
                                    key={reply._id}
                                    reply={reply}
                                    tourId={tourId}
                                    reviewId={review._id}
                                    onUpdate={onUpdate}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </article>
    );
}

interface ReplyFormProps {
    tourId: string;
    reviewId: string;
    onSuccess: () => void;
    onCancel: () => void;
}

function ReplyForm({ tourId, reviewId, onSuccess, onCancel }: ReplyFormProps) {
    const [comment, setComment] = useState('');

    const addReplyMutation = useMutation({
        mutationFn: () => addReviewReply(tourId, reviewId, comment),
        onSuccess: () => {
            toast({
                title: 'Reply added',
                description: 'Your reply has been added successfully.',
                variant: 'default',
            });
            setComment('');
            onSuccess();
        },
        onError: (error: any) => {
            toast({
                title: 'Error',
                description: error?.response?.data?.message || 'Failed to add reply. Please try again.',
                variant: 'destructive',
            });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!comment.trim()) {
            toast({
                title: 'Error',
                description: 'Please write a comment for your reply.',
                variant: 'destructive',
            });
            return;
        }
        addReplyMutation.mutate();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3 mt-2 sm:mt-3">
            <Textarea
                placeholder="Write your reply..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                required
                className="text-xs sm:text-sm"
            />
            <div className="flex gap-2 flex-wrap">
                <Button
                    type="submit"
                    size="sm"
                    disabled={addReplyMutation.isPending}
                    className="min-h-[44px] text-xs sm:text-sm"
                >
                    <Send className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    {addReplyMutation.isPending ? 'Sending...' : 'Send Reply'}
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onCancel}
                    className="min-h-[44px] text-xs sm:text-sm"
                >
                    Cancel
                </Button>
            </div>
        </form>
    );
}

interface ReplyCardProps {
    reply: Reply;
    tourId: string;
    reviewId: string;
    onUpdate: () => void;
}

function ReplyCard({ reply, tourId, reviewId, onUpdate }: ReplyCardProps) {
    const likeReplyMutation = useMutation({
        mutationFn: () => likeReply(tourId, reviewId, reply._id),
        onSuccess: () => {
            onUpdate();
        },
    });

    const incrementViewMutation = useMutation({
        mutationFn: () => incrementReplyView(tourId, reviewId, reply._id),
        onSuccess: () => {
            onUpdate();
        },
    });

    const handleLike = () => {
        likeReplyMutation.mutate();
    };

    const handleIncrementView = () => {
        incrementViewMutation.mutate();
    };

    const userName = reply.user?.name || 'Anonymous';
    const userAvatar = reply.user?.profilePicture;
    const initials = userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <article className="flex gap-3" role="listitem">
            <Avatar className="h-8 w-8">
                {userAvatar && <AvatarImage src={userAvatar} alt={`${userName}'s avatar`} />}
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-2">
                <div>
                    <div className="flex items-center gap-2">
                        <h5 className="font-medium text-sm">{userName}</h5>
                        <time className="text-xs text-muted-foreground" dateTime={reply.createdAt}>
                            {new Date(reply.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                            })}
                        </time>
                    </div>
                </div>

                <p className="text-sm">{reply.comment}</p>

                <div className="flex items-center gap-3" role="group" aria-label="Reply actions">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLike}
                        disabled={likeReplyMutation.isPending}
                        className="gap-1 h-7 px-2 min-h-[44px]"
                        aria-label={`Like reply, ${reply.likes || 0} likes`}
                    >
                        <ThumbsUp className="h-3 w-3" aria-hidden="true" />
                        <span className="text-xs" aria-hidden="true">{reply.likes || 0}</span>
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleIncrementView}
                        disabled={incrementViewMutation.isPending}
                        className="gap-1 h-7 px-2 min-h-[44px]"
                        aria-label={`View count: ${reply.views || 0}`}
                    >
                        <Eye className="h-3 w-3" aria-hidden="true" />
                        <span className="text-xs" aria-hidden="true">{reply.views || 0}</span>
                    </Button>
                </div>
            </div>
        </article>
    );
}
