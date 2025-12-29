import { NextFunction, Request, Response } from 'express';
import Post from './postModel';  // Assuming Post model is in models folder
import createHttpError from 'http-errors';
import { HTTP_STATUS, sendSuccess, sendError, sendPaginatedResponse, sendNotFoundError, sendForbiddenError } from '../../utils/apiResponse';
import { hybridPagination } from '../../utils/paginationUtils';

// Add a new post
export const addPost = async (req: Request,
  res: Response,
  next: NextFunction): Promise<void> => {
  try {
    const _req = req as Request
      ;
    const { title, content, tags, image, status, enableComments } = req.body;

    // Parse the tags if it's a string, otherwise use as-is
    const parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags || [];

    // Ensure that content is a string (stringified JSON if object)
    const parsedContent = typeof content === 'object' ? JSON.stringify(content) : content;

    const newPost = new Post({
      title,
      content: parsedContent,
      author: _req.user?.id,
      tags: parsedTags,
      enableComments: enableComments !== undefined ? enableComments : true,
      image,
      status: status || 'Draft',
    });

    const savedPost = await newPost.save();

    sendSuccess(res, savedPost, 'Post created successfully', HTTP_STATUS.CREATED);
  } catch (err) {
    console.error(err);
    next(createHttpError(500, 'Failed to add post'));
  }
};
// Get all posts with optional pagination, sorting, and filtering
export const getAllPosts = async (req: Request,
  res: Response,
  next: NextFunction): Promise<void> => {
  try {
    // Build query based on filters from middleware (AND logic - all filters must match)
    const query: any = {};
    if (req.filters) {
      if (req.filters.status) query.status = req.filters.status;
      if (req.filters.author) query.author = req.filters.author;
    }

    // Build sort object from middleware
    const sort: any = {};
    if (req.sort) {
      sort[req.sort.field] = req.sort.order === 'desc' ? -1 : 1;
    } else {
      sort.createdAt = -1; // Default sort by createdAt descending
    }

    // Use hybrid pagination utility
    return hybridPagination(
      Post,
      query,
      req,
      res,
      {
        populate: [{ path: 'author', select: 'name' }],
        sort,
        memoryThreshold: 100,
        message: 'Posts retrieved successfully'
      }
    );
  } catch (err) {
    console.error('Error fetching posts:', err);
    next(createHttpError(500, 'Failed to get posts'));
  }
};


export const getAllUserPosts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const _req = req as Request; // Assuming `userId` and `role` are available in _req
    const { sortBy = 'createdAt', sortOrder = 'desc', search } = req.query;

    // Sorting order
    const sort: { [key: string]: 1 | -1 } = { [sortBy as string]: sortOrder === 'desc' ? -1 : 1 };

    // Build query based on role and search filter
    const query: any = {};

    // If user is not admin, only show their own posts
    const isAdmin = _req.user?.roles.includes('admin') || false;
    if (!isAdmin) {
      query.author = _req.user?.id;
    }

    // Apply search filtering
    if (search) {
      query.title = { $regex: search, $options: 'i' };  // Case-insensitive search by title
    }

    // Use hybrid pagination utility
    return hybridPagination(
      Post,
      query,
      req,
      res,
      {
        populate: [
          { path: 'author', select: 'name' },
          { path: 'comments' }
        ],
        sort,
        memoryThreshold: 100,
        message: 'User posts retrieved successfully'
      }
    );
  } catch (err) {
    console.error("Error fetching posts:", err);
    next(createHttpError(500, 'Failed to get posts'));
  }
};





// Get a specific post by ID
export const getPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { postId } = req.params;

    // Force fresh query by using findOne with _id instead of findById
    // This bypasses Mongoose's internal caching mechanism
    const post = await Post.findOne({ _id: postId })
      .populate("author", "name avatar")
      .populate({
        path: 'comments',
        populate: {
          path: 'user',
          select: 'name avatar' // Only include necessary user fields
        }
      })
      .populate({
        path: 'comments.replies',
        populate: {
          path: 'user',
          select: 'name avatar'
        }
      })
      .exec();

    if (!post) {
      return sendNotFoundError(res, 'Post not found');
    }

    // Convert to plain object to ensure we're working with fresh data
    // This prevents any document-level caching issues
    const postObject = post.toObject ? post.toObject() : post;

    const breadcrumbs = [
      {
        label: postObject.title,
        url: `/${postId}`,
      }
    ];

    sendSuccess(res, { post: postObject, breadcrumbs }, 'Post retrieved successfully');
  } catch (err) {
    console.error('Error in getPost:', err);
    next(createHttpError(500, 'Failed to get post'));
  }
};


export const getUserPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const _req = req as Request
      ; // Assuming `userId` and `role` are available in _req
    const { postId } = req.params;

    // Fetch the post by ID
    let post;
    const isAdmin = _req.user?.roles.includes('admin') || false;
    if (isAdmin) {
      // If the user is an admin, they can access any post
      post = await Post.findById(postId).populate("author", "name").populate("comments");
    } else {
      // If the user is not an admin, only fetch the post if they are the author
      post = await Post.findOne({ _id: postId, author: _req.user?.id }).populate("author", "name").populate("comments");
    }

    // If no post is found, return 404
    if (!post) {
      return sendNotFoundError(res, 'Post not found');
    }

    // Build breadcrumbs
    const breadcrumbs = [
      {
        label: post.title, // Use post title for breadcrumb label
        url: `/${postId}`, // Example URL
      }
    ];

    if (!breadcrumbs.length) {
      return next(createHttpError(HTTP_STATUS.NOT_FOUND, 'Failed to get breadcrumbs'));
    }

    // Send the post and breadcrumbs in the response
    sendSuccess(res, { post, breadcrumbs }, 'User post retrieved successfully');
  } catch (err) {
    // Log and return a 500 error
    console.error("Error getting post:", err);
    next(createHttpError(500, 'Failed to get post'));
  }
};




// Delete a post by ID
export const deletePost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const _req = req as Request
      ; // Assume user information (including role) is available in _req
    const { postId } = req.params;

    // Find the post by ID
    const post = await Post.findById(postId);

    // If the post doesn't exist, return a 404 error
    if (!post) {
      return sendNotFoundError(res, 'Post not found');
    }

    // Check if the current user is the owner of the post or an admin
    const isAdmin = _req.user?.roles.includes('admin') || false;
    if (post.author.toString() !== _req.user?.id && !isAdmin) {
      return sendForbiddenError(res, 'You are not authorized to delete this post');
    }

    // Delete the post
    await post.deleteOne();

    // Successfully deleted - return 204 No Content
    res.status(HTTP_STATUS.NO_CONTENT).send();
  } catch (err) {
    // Log the error for debugging
    console.error("Error deleting post:", err);
    // Return a 500 error with a custom message
    return sendNotFoundError(res, 'Failed to delete post');
  }
};

// Edit a post using PATCH
export const editPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const _req = req as Request
      ;
    const { postId } = req.params;

    // Extract updates from req.body (now parsed by multer)
    const updates: any = {};
    console.log('Received updates:', req.body);
    // Handle title
    if (req.body.title !== undefined) {
      updates.title = req.body.title;
    }

    // Handle status
    if (req.body.status !== undefined) {
      updates.status = req.body.status;
    }

    // Handle content
    if (req.body.content !== undefined) {
      // Content might be a JSON string, parse it if needed
      const parsedContent = typeof req.body.content === 'string' ? req.body.content : JSON.stringify(req.body.content);
      updates.content = parsedContent;
    }

    // Handle image
    if (req.body.image !== undefined) {
      updates.image = req.body.image;
    }

    // Handle tags (FormData sends tags[] as array)
    if (req.body.tags !== undefined) {
      // If tags is a string, try to parse it, otherwise use as-is
      let parsedTags = req.body.tags;
      if (typeof parsedTags === 'string') {
        try {
          parsedTags = JSON.parse(parsedTags);
        } catch {
          // If not JSON, treat as single tag
          parsedTags = [parsedTags];
        }
      }
      // If it's an array with one element that's a string, it might be from FormData tags[]
      if (Array.isArray(parsedTags) && parsedTags.length === 1 && typeof parsedTags[0] === 'string') {
        updates.tags = parsedTags;
      } else if (Array.isArray(parsedTags)) {
        updates.tags = parsedTags;
      }
    }

    // Handle enableComments
    if (req.body.enableComments !== undefined) {
      updates.enableComments = req.body.enableComments === 'true' || req.body.enableComments === true;
    }

    console.log('Updating post with:', updates); // Debug log

    // Fetch the post by ID to verify the owner
    const post = await Post.findById(postId);

    // If the post doesn't exist, return a 404 error
    if (!post) {
      return sendNotFoundError(res, 'Post not found');
    }

    // Check if the current user is the owner of the post or an admin
    const isAdmin = _req.user?.roles.includes('admin') || false;
    if (post.author.toString() !== _req.user?.id && !isAdmin) {
      return sendForbiddenError(res, 'You are not authorized to edit this post');
    }

    // Update the post fields manually to ensure all updates are applied
    Object.keys(updates).forEach((key) => {
      (post as any)[key] = updates[key];
    });

    // Save the post to ensure all validators and hooks run
    await post.save();

    // Clear Mongoose model cache for this specific document to force fresh fetch
    // This ensures we get the absolute latest data from the database
    if (Post.collection) {
      // Force a fresh query by using findOne with explicit conditions
      await Post.findOne({ _id: postId }).lean().exec();
    }

    // Fetch the updated post fresh from database using findOne to bypass cache
    // This prevents any Mongoose document-level caching issues
    const updatedPostDoc = await Post.findOne({ _id: postId })
      .populate("author", "name avatar")
      .populate({
        path: 'comments',
        populate: {
          path: 'user',
          select: 'name avatar'
        }
      })
      .populate({
        path: 'comments.replies',
        populate: {
          path: 'user',
          select: 'name avatar'
        }
      })
      .exec();

    if (!updatedPostDoc) {
      return sendNotFoundError(res, 'Post not found after update');
    }

    // Convert to plain object to avoid any document caching issues
    const updatedPost = updatedPostDoc.toObject ? updatedPostDoc.toObject() : updatedPostDoc;

    console.log('Post updated successfully:', {
      id: updatedPost._id || updatedPost.id,
      title: updatedPost.title,
      status: updatedPost.status,
      updatedAt: updatedPost.updatedAt
    });

    sendSuccess(res, updatedPost, 'Post updated successfully');
  } catch (err) {
    // Log and return a 500 error
    console.error("Error editing post:", err);
    next(createHttpError(500, 'Failed to edit post'));
  }
};
