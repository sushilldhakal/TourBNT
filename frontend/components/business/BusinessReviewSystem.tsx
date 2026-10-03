'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Star, ThumbsUp, MessageCircle, Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { getBusinessReviews, addBusinessReview, addBusinessReviewReply, toggleBusinessReviewLike } from '@/lib/api/businessPartners';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/hooks/useAuth';

interface BusinessReviewSystemProps {
    businessPartnerId: string;
}

export function BusinessReviewSystem({ businessPartnerId }: BusinessReviewSystemProps) {
    const { isAuthenticated } = useAuth();
    const { data, refetch } = useQuery({
        queryKey: ['businessReviews', businessPartnerId],
        queryFn: () => getBusinessReviews(businessPartnerId, 'approved'),
        staleTime: 2 * 60 * 1000,
    });

    const reviews = (data as any)?.data?.reviews || [];

    return (
        <section className="bg-card border rounded-lg p-4 sm:p-6 space-y-4 sm:space-y-6" aria-labelledby="business-reviews-heading">
            <h2 id="business-reviews-heading" className="text-xl sm:text-2xl font-bold">Reviews</h2>

            {isAuthenticated ? (
                <ReviewForm businessPartnerId={businessPartnerId} onSuccess={refetch} />
            ) : (
                <p className="text-sm text-muted-foreground">Sign in to leave a review.</p>
            )}

            <div className="space-y-4 sm:space-y-6" role="list" aria-label="Business reviews">
                {reviews.length === 0 ? (
                    <p className="text-sm sm:text-base text-muted-foreground text-center py-6 sm:py-8" role="status">
                        No reviews yet. Be the first to share your experience!
                    </p>
                ) : (
                    reviews.map((review: any) => (
                        <ReviewCard key={review.id} review={review} businessPartnerId={businessPartnerId} onUpdate={refetch} />
                    ))
                )}
            </div>
        </section>
    );
}

function ReviewForm({ businessPartnerId, onSuccess }: { businessPartnerId: string; onSuccess: () => void }) {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [hoveredRating, setHoveredRating] = useState(0);

    const mutation = useMutation({
        mutationFn: () => addBusinessReview(businessPartnerId, rating, comment),
        onSuccess: () => {
            toast({ title: 'Review submitted', description: 'Your review has been submitted for approval.' });
            setComment('');
            setRating(5);
            onSuccess();
        },
        onError: (error: any) => {
            toast({ title: 'Error', description: error?.response?.data?.message || 'Failed to submit review.', variant: 'destructive' });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!comment.trim()) {
            toast({ title: 'Error', description: 'Please write a comment for your review.', variant: 'destructive' });
            return;
        }
        mutation.mutate();
    };

    return (
        <Card>
            <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
                <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                    <div>
                        <label className="text-xs sm:text-sm font-medium mb-2 block">Your Rating</label>
                        <div className="flex gap-1 sm:gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoveredRating(star)}
                                    onMouseLeave={() => setHoveredRating(0)}
                                    className="focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
                                    aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                                >
                                    <Star className={cn('h-6 w-6 sm:h-8 sm:w-8 transition-colors', star <= (hoveredRating || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300')} />
                                </button>
                            ))}
                        </div>
                    </div>
                    <Textarea placeholder="Share your experience..." value={comment} onChange={(e) => setComment(e.target.value)} rows={4} required />
                    <Button type="submit" disabled={mutation.isPending} className="min-h-[44px]">
                        {mutation.isPending ? 'Submitting...' : 'Submit Review'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

function ReviewCard({ review, businessPartnerId, onUpdate }: { review: any; businessPartnerId: string; onUpdate: () => void }) {
    const [showReplyForm, setShowReplyForm] = useState(false);

    const likeMutation = useMutation({
        mutationFn: () => toggleBusinessReviewLike(review.id),
        onSuccess: onUpdate,
    });

    const userName = review.user?.name || 'Anonymous';
    const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <article className="border-b pb-4 sm:pb-6 last:border-b-0">
            <div className="flex gap-3 sm:gap-4">
                <Avatar className="h-8 w-8 sm:h-10 sm:w-10 shrink-0">
                    {review.user?.avatar && <AvatarImage src={review.user.avatar} alt={userName} />}
                    <AvatarFallback className="text-xs sm:text-sm">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2 sm:space-y-3 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm sm:text-base">{userName}</h4>
                        {review.status === 'pending' && <Badge variant="secondary" className="text-xs">Pending Approval</Badge>}
                    </div>
                    <div className="flex" role="img" aria-label={`${review.rating} out of 5 stars`}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className={cn('h-3 w-3 sm:h-4 sm:w-4', star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300')} />
                        ))}
                    </div>
                    <p className="text-xs sm:text-sm break-words">{review.comment}</p>
                    <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                        <Button variant="ghost" size="sm" onClick={() => likeMutation.mutate()} disabled={likeMutation.isPending} className="gap-1 h-8 sm:h-9 px-2 sm:px-3">
                            <ThumbsUp className={cn('h-3 w-3 sm:h-4 sm:w-4', review.isLiked && 'fill-current')} />
                            <span className="text-xs sm:text-sm">{review.likes || 0}</span>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setShowReplyForm(!showReplyForm)} className="gap-1 h-8 sm:h-9 px-2 sm:px-3">
                            <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="text-xs sm:text-sm">Reply</span>
                        </Button>
                    </div>

                    {showReplyForm && (
                        <ReplyForm reviewId={review.id} onSuccess={() => { setShowReplyForm(false); onUpdate(); }} onCancel={() => setShowReplyForm(false)} />
                    )}

                    {review.replies && review.replies.length > 0 && (
                        <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4 pl-3 sm:pl-4 border-l-2">
                            {review.replies.map((reply: any) => (
                                <div key={reply.id} className="flex gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback className="text-xs">{(reply.user?.name || '?').slice(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <h5 className="font-medium text-sm">{reply.user?.name || 'Anonymous'}</h5>
                                        <p className="text-sm">{reply.comment}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </article>
    );
}

function ReplyForm({ reviewId, onSuccess, onCancel }: { reviewId: string; onSuccess: () => void; onCancel: () => void }) {
    const [comment, setComment] = useState('');
    const mutation = useMutation({
        mutationFn: () => addBusinessReviewReply(reviewId, comment),
        onSuccess: () => {
            toast({ title: 'Reply added' });
            setComment('');
            onSuccess();
        },
        onError: (error: any) => toast({ title: 'Error', description: error?.response?.data?.message || 'Failed to add reply.', variant: 'destructive' }),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!comment.trim()) return;
        mutation.mutate();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3 mt-2 sm:mt-3">
            <Textarea placeholder="Write your reply..." value={comment} onChange={(e) => setComment(e.target.value)} rows={3} required className="text-xs sm:text-sm" />
            <div className="flex gap-2 flex-wrap">
                <Button type="submit" size="sm" disabled={mutation.isPending}>
                    <Send className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    {mutation.isPending ? 'Sending...' : 'Send Reply'}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
            </div>
        </form>
    );
}
