import { NextRequest } from 'next/server';
import { db, facts } from '@tourbnt/db';
import { eq, desc } from 'drizzle-orm';
import { getSessionUser, hasRole } from '@/lib/server/auth';
import { sendSuccess, sendError, sendAuthError, sendForbiddenError } from '@/lib/server/apiResponse';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return sendAuthError();

    const { userId } = await params;
    if (!hasRole(user, 'admin') && user.id !== userId) {
      return sendForbiddenError('Not authorized to view these facts');
    }

    const items = await db.select().from(facts).where(eq(facts.userId, userId)).orderBy(desc(facts.createdAt));
    return sendSuccess(items, 'Facts retrieved successfully');
  } catch (error) {
    console.error('Error in GET /api/v1/facts/user/[userId]:', error);
    return sendError('Server error, please try again later');
  }
}
