import { zodResolver as hookformZodResolver } from '@hookform/resolvers/zod';
import type { FieldValues, Resolver } from 'react-hook-form';
import type { ZodType, ZodTypeDef } from 'zod';

/**
 * The published resolver is typed against whichever `zod` package Node hoists.
 * Production has no lockfile, so that can be Zod 4 while these forms are Zod 3.
 * The runtime only calls `schema.parse`, which both versions provide.
 */
export function zodResolver<T extends ZodType<FieldValues, ZodTypeDef, FieldValues>>(
    schema: T,
): Resolver<T['_output'], unknown, T['_output']> {
    return hookformZodResolver(schema as never) as Resolver<T['_output'], unknown, T['_output']>;
}
