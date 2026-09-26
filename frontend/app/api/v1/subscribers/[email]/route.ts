import { NextRequest } from 'next/server';
import { db, subscribers } from '@tourbnt/db';
import { eq } from 'drizzle-orm';
import { sendError, sendValidationError, sendNotFoundError, HTTP_STATUS } from '@/lib/server/apiResponse';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * DELETE /api/v1/subscribers/:email — public unsubscribe endpoint.
 */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  try {
    const { email: rawEmail } = await params;
    const email = decodeURIComponent(rawEmail).trim().toLowerCase();

    if (!EMAIL_REGEX.test(email)) {
      return sendValidationError('Invalid email format', [{ field: 'email', message: 'Please provide a valid email address' }]);
    }

    const [deleted] = await db.delete(subscribers).where(eq(subscribers.email, email)).returning();
    if (!deleted) {
      return sendNotFoundError('Email not found in subscription list');
    }

    return new Response(null, { status: HTTP_STATUS.NO_CONTENT });
  } catch (error) {
    console.error('Error in DELETE /api/v1/subscribers/[email]:', error);
    return sendError('Server error, please try again later');
  }
}
