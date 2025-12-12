import { Request } from 'express';

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export const paginate = async <T>(
  model: any,
  query: any,
  params: PaginationParams = {}
): Promise<{
  page: number;
  limit: number;
  totalPages: number;
  totalItems: number;
  items: T[];
}> => {
  const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search } = params;
  const pageNumber = parseInt(page.toString(), 10);
  const pageSize = parseInt(limit.toString(), 10);

  const sort: { [key: string]: 1 | -1 } = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const items = await model
    .find(query)
    .sort(sort)
    .skip((pageNumber - 1) * pageSize)
    .limit(pageSize);

  const totalItems = await model.countDocuments(query);
  const totalPages = Math.ceil(totalItems / pageSize);

  return {
    page: pageNumber,
    limit: pageSize,
    totalPages,
    totalItems,
    items
  };
};