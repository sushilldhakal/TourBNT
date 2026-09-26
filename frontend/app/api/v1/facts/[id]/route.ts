import { NextRequest } from 'next/server';
import { db, facts } from '@tourbnt/db';
import { eq } from 'drizzle-orm';
import { getSessionUser, hasRole } from '@/lib/server/auth';
import { sendSuccess, sendError, sendAuthError, sendForbiddenError, sendNotFoundError } from '@/lib/server/apiResponse';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return sendAuthError();

    const { id } = await params;
    const [fact] = await db.select().from(facts).where(eq(facts.id, id)).limit(1);
    if (!fact) return sendNotFoundError('Fact not found');

    if (fact.userId !== user.id && !hasRole(user, 'admin')) {
      return sendForbiddenError('Not authorized to view this fact');
    }

    return sendSuccess({ fact }, 'Fact retrieved successfully');
  } catch (error) {
    console.error('Error in GET /api/v1/facts/[id]:', error);
    return sendError('Server error, please try again later');
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return sendAuthError('Not authenticated');

    const { id } = await params;
    const [existing] = await db.select().from(facts).where(eq(facts.id, id)).limit(1);
    if (!existing) return sendNotFoundError('Fact not found');

    if (existing.userId !== user.id && !hasRole(user, 'admin')) {
      return sendForbiddenError('Not authorized to update this Fact');
    }

    const body = await request.json().catch(() => ({}));
    const { name, field_type, value, icon } = body;

    const [updated] = await db
      .update(facts)
      .set({
        name: name ?? existing.name,
        fieldType: field_type ?? existing.fieldType,
        value: value ?? existing.value,
        icon: icon ?? existing.icon,
        updatedAt: new Date(),
      })
      .where(eq(facts.id, id))
      .returning();

    // Note: cascading this change into `tours.facts` (JSONB snapshots) will
    // apply once the tours module is migrated to Postgres — see project notes.
    return sendSuccess({ facts: updated, toursUpdated: 0 }, 'Fact updated successfully');
  } catch (error) {
    console.error('Error in PATCH /api/v1/facts/[id]:', error);
    return sendError('Server error, please try again later');
  }
}
