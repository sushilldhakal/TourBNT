import { NextFunction, Request, Response } from 'express';
import Post from './postModel';  // Assuming Post model is in models folder
import createHttpError from 'http-errors';
import { HTTP_STATUS } from '../../utils/httpStatusCodes';

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

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Post created successfully',
      post: savedPost,
    });
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
    // Use pagination params from middleware
    const { page, limit, skip } = req.pagination || { page: 1, limit: 10, skip: 0 };

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

    // Fetch posts with pagination, filtering, and sorting
    const posts = await Post.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('author', 'name');

    // Get total count for pagination metadata
    const totalItems = await Post.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);

    res.status(HTTP_STATUS.OK).json({
      page,
      limit,
      totalPages,
      totalItems,
      posts: posts.map(post => ({
        ...post.toObject(),
        author: post.author
      })),
    });
  } catch (err) {
    console.error('Error fetching posts:', err);
    next(createHttpError(500, 'Failed to get posts'));
  }
};


export const getAllUserPosts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const _req = req as Request
; // Assuming `userId` and `role` are available in _req
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search } = req.query;

    // Pagination
    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);

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

    // Fetching posts with pagination, sorting, and filtering
    const posts = await Post.find(query)
      .sort(sort)
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .populate("author", "name")
      .populate("comments");

    // Getting total count for pagination
    const totalPosts = await Post.countDocuments(query);

    res.status(HTTP_STATUS.OK).json({
      page: pageNumber,
      limit: pageSize,
      totalPages: Math.ceil(totalPosts / pageSize),
      totalPosts,
      posts,
    });
  } catch (err) {
    console.error("Error fetching posts:", err);
    next(createHttpError(500, 'Failed to get posts'));
  }
};





// Get a specific post by ID
export const getPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId)
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
      });

    if (!post) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Post not found' });
      return;
    }

    const breadcrumbs = [
      {
        label: post.title,
        url: `/${postId}`,
      }
    ];

    res.status(HTTP_STATUS.OK).json({ post, breadcrumbs });
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
      res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Post not found' });
      return;
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
    res.status(HTTP_STATUS.OK).json({ post, breadcrumbs });
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
      res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {
          code: 'POST_NOT_FOUND',
          message: 'Post not found',
          timestamp: new Date().toISOString(),
          path: req.path
        }
      });
      return;
    }

    // Check if the current user is the owner of the post or an admin
    const isAdmin = _req.user?.roles.includes('admin') || false;
    if (post.author.toString() !== _req.user?.id && !isAdmin) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You are not authorized to delete this post',
          timestamp: new Date().toISOString(),
          path: req.path
        }
      });
      return;
    }

    // Delete the post
    await post.deleteOne();

    // Successfully deleted - return 204 No Content
    res.status(HTTP_STATUS.NO_CONTENT).send();
  } catch (err) {
    // Log the error for debugging
    console.error("Error deleting post:", err);
    // Return a 500 error with a custom message
    next(createHttpError(500, 'Failed to delete post'));
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
      res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Post not found' });
      return;
    }

    // Check if the current user is the owner of the post or an admin
    const isAdmin = _req.user?.roles.includes('admin') || false;
    if (post.author.toString() !== _req.user?.id && !isAdmin) {
      res.status(HTTP_STATUS.FORBIDDEN).json({ message: 'You are not authorized to edit this post' });
      return;
    }

    // Update the post if authorized
    const updatedPost = await Post.findByIdAndUpdate(postId, updates, {
      new: true,  // Return the updated document
      runValidators: true,  // Ensure validators are run
    });

    res.status(HTTP_STATUS.OK).json({
      message: 'Post updated successfully',
      post: updatedPost,
    });
  } catch (err) {
    // Log and return a 500 error
    console.error("Error editing post:", err);
    next(createHttpError(500, 'Failed to edit post'));
  }
};
