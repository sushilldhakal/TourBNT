'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/hooks/useAuth';
import { addComment, getCommentsByPost, replyToComment } from '@/lib/api/comments';

interface BlogComment {
    id: string;
    text: string;
    createdAt: string;
    approve: boolean;
    user: { id: string; name: string; avatar: string | null } | null;
    replies?: BlogComment[];
}

const MAX = 2000;

/** The server's message without the "adding comment:" prefix handleApiError adds. */
const messageOf = (e: unknown, fallback: string) =>
    (e as { data?: { message?: string; error?: { message?: string } } })?.data?.error?.message ??
    (e as { data?: { message?: string } })?.data?.message ??
    fallback;

function Avatar({ user }: { user: BlogComment['user'] }) {
    const name = user?.name ?? 'Traveller';
    if (user?.avatar) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={user.avatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />;
    }
    return (
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
            {name.charAt(0).toUpperCase()}
        </span>
    );
}

function CommentForm({ placeholder, submitLabel, onSubmit, onDone, autoFocus }: {
    placeholder: string;
    submitLabel: string;
    onSubmit: (text: string) => Promise<unknown>;
    onDone?: () => void;
    autoFocus?: boolean;
}) {
    const [text, setText] = useState('');
    const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
    const send = useMutation({
        mutationFn: () => onSubmit(text.trim()),
        onSuccess: () => {
            setText('');
            setNotice({ ok: true, text: 'Thanks! Your comment will appear once it has been approved.' });
            onDone?.();
        },
        onError: (e) => setNotice({ ok: false, text: messageOf(e, 'Your comment could not be posted. Please try again.') }),
    });

    return (
        <form
            className="space-y-2"
            onSubmit={(e) => { e.preventDefault(); if (text.trim()) send.mutate(); }}
        >
            <Textarea
                value={text}
                onChange={(e) => { setText(e.target.value); setNotice(null); }}
                placeholder={placeholder}
                maxLength={MAX}
                rows={3}
                autoFocus={autoFocus}
                aria-label={placeholder}
                disabled={send.isPending}
            />
            <div className="flex items-center justify-between gap-3">
                <p className={`text-sm ${notice ? (notice.ok ? 'text-green-600 dark:text-green-500' : 'text-destructive') : 'text-muted-foreground'}`} role={notice ? 'status' : undefined}>
                    {notice?.text ?? `${text.length}/${MAX}`}
                </p>
                <Button type="submit" size="sm" disabled={!text.trim() || send.isPending}>
                    {send.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />}
                    {submitLabel}
                </Button>
            </div>
        </form>
    );
}

function CommentItem({ comment, canReply }: { comment: BlogComment; canReply: boolean }) {
    const [replying, setReplying] = useState(false);
    return (
        <li className="flex gap-3">
            <Avatar user={comment.user} />
            <div className="min-w-0 flex-1">
                <p className="text-sm">
                    <span className="font-medium">{comment.user?.name ?? 'Traveller'}</span>
                    <span className="text-muted-foreground"> · {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                    {!comment.approve && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">Awaiting approval</span>}
                </p>
                {/* Plain text: rendered by React, so nothing in it can run as HTML. */}
                <p className="mt-1 whitespace-pre-wrap break-words text-sm">{comment.text}</p>
                {canReply && (
                    <button type="button" className="mt-1 text-xs text-primary hover:underline" onClick={() => setReplying((r) => !r)}>
                        {replying ? 'Cancel' : 'Reply'}
                    </button>
                )}
                {replying && (
                    <div className="mt-2">
                        <CommentForm placeholder={`Reply to ${comment.user?.name ?? 'this comment'}`} submitLabel="Reply" autoFocus onSubmit={(t) => replyToComment(comment.id, t)} />
                    </div>
                )}
                {comment.replies && comment.replies.length > 0 && (
                    <ul className="mt-4 space-y-4 border-l border-border pl-4">
                        {comment.replies.map((r) => <CommentItem key={r.id} comment={r} canReply={false} />)}
                    </ul>
                )}
            </div>
        </li>
    );
}

/** Comments under a blog post: approved comments for everyone, and a form for signed-in visitors. */
export function BlogComments({ postId, enabled }: { postId: string; enabled: boolean }) {
    const qc = useQueryClient();
    const { isAuthenticated, isHydrated } = useAuth();
    const key = ['blog-comments', postId];

    const { data: comments = [], isLoading, isError } = useQuery({
        queryKey: key,
        queryFn: async () => {
            const res = (await getCommentsByPost(postId)) as { items?: BlogComment[]; data?: BlogComment[] } | BlogComment[];
            return Array.isArray(res) ? res : res.items ?? res.data ?? [];
        },
    });

    const total = comments.reduce((n, c) => n + 1 + (c.replies?.length ?? 0), 0);

    return (
        <section aria-labelledby="comments-heading" className="mt-12 pt-8 border-t border-border">
            <h2 id="comments-heading" className="text-xl font-semibold mb-6 flex items-center gap-2">
                <MessageSquare className="h-5 w-5" aria-hidden="true" />
                Comments{total > 0 ? ` (${total})` : ''}
            </h2>

            {enabled ? (
                <div className="mb-8">
                    {!isHydrated ? null : isAuthenticated ? (
                        <CommentForm placeholder="Share your thoughts or ask a question" submitLabel="Post comment" onSubmit={(t) => addComment(postId, t)} onDone={() => qc.invalidateQueries({ queryKey: key })} />
                    ) : (
                        <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
                            <Link href={`/auth/login?redirect=${encodeURIComponent(`/blog/${postId}`)}`} className="text-primary hover:underline">Sign in</Link> to leave a comment.
                        </p>
                    )}
                </div>
            ) : (
                <p className="mb-8 text-sm text-muted-foreground">Comments are closed for this post.</p>
            )}

            {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading comments…</p>
            ) : isError ? (
                <p className="text-sm text-muted-foreground">Comments could not be loaded.</p>
            ) : comments.length === 0 ? (
                enabled && <p className="text-sm text-muted-foreground">No comments yet. Be the first to share your thoughts.</p>
            ) : (
                <ul className="space-y-6">
                    {comments.map((c) => <CommentItem key={c.id} comment={c} canReply={enabled && isAuthenticated} />)}
                </ul>
            )}
        </section>
    );
}
