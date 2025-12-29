import { Request, Response, NextFunction } from 'express';
import Comment from './commentModel';  // Adjust the path as necessary
import Post from './postModel';        // Adjust the path as necessary
import createHttpError from 'http-errors';
import CommentLike from './commentLikeModel';
import { sendSuccess, sendError, sendPaginatedResponse } from '../../utils/apiResponse';
import { hybridPagination } from '../../utils/paginationUtils';

// Create a new comment
export const addComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const _req = req as Request;
    const { post, text, likes } = req.body;
    
    // Get user from authenticated request (preferred) or from body (for backward compatibility)
    const userId = _req.user?.id || req.body.user;
    
    if (!userId) {
      return next(createHttpError(400, 'User ID is required. Please log in to comment.'));
    }

    if (!post || !text) {
      return next(createHttpError(400, 'Post ID and text are required'));
    }

    const newComment = new Comment({
      post,
      user: userId, // Use authenticated user ID
      text,
      likes: likes || 0,
      approve: false,
    });

    await newComment.save();

    // Optionally, update the post to include the new comment
    await Post.findByIdAndUpdate(post, { $push: { comments: newComment._id } });

    sendSuccess(res, newComment, 'Comment created successfully', 201);
  } catch (err) {
    console.error("Error adding comment:", err);
    next(createHttpError(500, 'Failed to add comment'));
  }
};

// Add a reply to a comment
export const addReply = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const _req = req as Request;
    const { commentId } = req.params;
    const { text } = req.body;
    
    // Get user from authenticated request (preferred) or from body (for backward compatibility)
    const userId = _req.user?.id || req.body.user;
    
    if (!userId) {
      return next(createHttpError(400, 'User ID is required. Please log in to reply.'));
    }
    
    if (!text) {
      return next(createHttpError(400, 'Text is required'));
    }
    
    // Get the parent comment to access its post ID
    const parentComment = await Comment.findById(commentId);

    if (!parentComment) {
      return next(createHttpError(404, 'Parent comment not found'));
    }

    // Create a new comment as a reply
    const newReply = new Comment({
      post: parentComment.post, // Use the same post ID as the parent
      user: userId, // Use authenticated user ID
      text,
      likes: 0,
      views: 0,
      approve: false,
    });

    await newReply.save();

    // Update the parent comment to include this reply
    await Comment.findByIdAndUpdate(
      commentId,
      { $push: { replies: newReply._id } }
    );

    sendSuccess(res, newReply, 'Reply created successfully', 201);
  } catch (err) {
    console.error("Error adding reply:", err);
    next(createHttpError(500, 'Failed to add reply'));
  }
};

// Like a comment
export const likeComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { commentId } = req.params;
    const { userId } = req.body; // Get the user ID from the request body

    if (!userId) {
      return next(createHttpError(400, 'User ID is required'));
    }

    // Check if the user has already liked this comment
    const existingLike = await CommentLike.findOne({ comment: commentId, user: userId });

    let updatedComment;

    if (existingLike) {
      // User has already liked this comment, so unlike it
      await CommentLike.deleteOne({ _id: existingLike._id });

      // Decrement the likes count
      updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        { $inc: { likes: -1 } },
        { new: true }
      );
    } else {
      // User hasn't liked this comment yet, so add a like
      const newLike = new CommentLike({
        comment: commentId,
        user: userId
      });

      await newLike.save();

      // Increment the likes count
      updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        { $inc: { likes: 1 } },
        { new: true }
      );
    }

    if (!updatedComment) {
      return next(createHttpError(404, 'Comment not found'));
    }

    // Return the updated comment along with the liked status
    sendSuccess(res, {
      ...updatedComment.toObject(),
      isLiked: !existingLike
    }, 'Comment like toggled successfully');
  } catch (err) {
    console.error("Error toggling comment like:", err);
    next(createHttpError(500, 'Failed to toggle comment like'));
  }
};

// Track comment view
export const viewComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { commentId } = req.params;

    // Increment the views count
    const updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!updatedComment) {
      return next(createHttpError(404, 'Comment not found'));
    }

    sendSuccess(res, updatedComment, 'Comment view tracked successfully');
  } catch (err) {
    console.error("Error tracking comment view:", err);
    next(createHttpError(500, 'Failed to track comment view'));
  }
};

export const editComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { commentId } = req.params; // Get the comment ID from the URL parameters
    let { approve } = req.body;

    // Handle FormData: convert string "true"/"false" to boolean
    // FormData sends values as strings, so "true" becomes string "true"
    let approveValue: boolean;
    if (typeof approve === 'string') {
      approveValue = approve.toLowerCase() === 'true' || approve === '1';
    } else if (typeof approve === 'boolean') {
      approveValue = approve;
    } else if (typeof approve === 'number') {
      approveValue = approve === 1;
    } else {
      approveValue = false; // Default to false if not provided or invalid
    }

    // Find the comment first
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return next(createHttpError(404, 'Comment not found'));
    }

    // Update the approve field
    comment.approve = approveValue;
    
    // Save the comment
    await comment.save();

    // Fetch fresh comment data with populated fields to avoid stale data
    const updatedComment = await Comment.findOne({ _id: commentId })
      .populate('user', 'name email avatar')
      .populate('post', 'title author')
      .populate({
        path: 'replies',
        populate: {
          path: 'user',
          select: 'name email avatar'
        }
      })
      .lean()
      .exec();

    if (!updatedComment) {
      return next(createHttpError(404, 'Comment not found after update'));
    }

    // Set cache control headers to prevent client-side caching
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    sendSuccess(res, updatedComment, 'Comment updated successfully');
  } catch (err) {
    console.error("Error editing comment:", err);
    next(createHttpError(500, 'Failed to edit comment'));
  }
};

// Get comments for a specific post
export const getCommentsByPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { postId } = req.params;

    // Build query for comments on this post
    const query = { post: postId };

    // Use hybrid pagination utility
    return hybridPagination(
      Comment,
      query,
      req,
      res,
      {
        populate: [
          { path: 'user', select: 'name email avatar' },
          {
            path: 'replies',
            populate: {
              path: 'user',
              select: 'name email avatar'
            }
          }
        ],
        sort: { createdAt: -1 },
        memoryThreshold: 100,
        message: 'Comments retrieved successfully'
      }
    );
  } catch (err) {
    console.error("Error fetching comments:", err);
    next(createHttpError(500, 'Failed to get comments'));
  }
};

// Get a specific comment with its replies
export const getCommentWithReplies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { commentId } = req.params;

    // Use lean() to get plain object and ensure all fields are included
    const comment = await Comment.findById(commentId)
      .populate('user', 'name email avatar')
      .populate({
        path: 'replies',
        populate: {
          path: 'user',
          select: 'name email avatar'
        }
      })
      .lean() // Use lean to get plain object with all fields
      .exec();

    if (!comment) {
      return next(createHttpError(404, 'Comment not found'));
    }

    sendSuccess(res, comment, 'Comment with replies retrieved successfully');
  } catch (err) {
    console.error("Error fetching comment with replies:", err);
    next(createHttpError(500, 'Failed to get comment with replies'));
  }
};

export const getAllComments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const _req = req as Request
    ;
  try {
    // Get pagination parameters from query
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    let query;
    let totalComments: number;

    if (_req.user?.roles.includes('admin')) {
      // Admin can see all comments
      query = Comment.find();
      totalComments = await Comment.countDocuments();
    } else {
      // For sellers, first get all their posts
      const sellerPosts = await Post.find({ author: _req.user?.id });
      const postIds = sellerPosts.map(post => post._id);
      // Then get comments for those posts
      query = Comment.find({ post: { $in: postIds } });
      totalComments = await Comment.countDocuments({ post: { $in: postIds } });
    }

    // Apply pagination and populate fields
    const comments = await query
      .populate('user', 'name email')
      .populate('post', 'title author')
      .populate({
        path: 'replies',
        populate: {
          path: 'user',
          select: 'name email'
        }
      })
      .sort({ createdAt: -1 }) // Sort by newest first
      .skip(skip)
      .limit(limit)
      .lean();
console.log('comments', comments);
    // Set cache control headers to prevent client-side caching
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    sendPaginatedResponse(res, comments, {
      page: page,
      limit: limit,
      totalItems: totalComments,
      totalPages: Math.ceil(totalComments / limit)
    }, 'All comments retrieved successfully');
  } catch (err) {
    console.error("Error fetching comments:", err);
    next(createHttpError(500, 'Failed to get comments'));
  }
};
export const getUnapprovedCommentsCount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const _req = req as Request;
  try {
    let unapprovedCount;

    if (_req.user?.roles.includes('admin')) {
      // Admin counts all unapproved comments
      unapprovedCount = await Comment.countDocuments({ approve: false });
    } else {
      // Sellers count unapproved comments on their posts
      const sellerPosts = await Post.find({ author: _req.user?.id });
      const postIds = sellerPosts.map(post => post._id);

      unapprovedCount = await Comment.countDocuments({ approve: false, post: { $in: postIds } });
    }

    // Send the count as response
    sendSuccess(res, { unapprovedCount }, 'Unapproved comments count retrieved successfully');
  } catch (err) {
    console.error("Error fetching unapproved comments count:", err);
    next(createHttpError(500, 'Failed to get unapproved comments count'));
  }
};

// Delete a comment
// Delete a comment
export const deleteComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { commentId } = req.params; // Assuming the comment ID is passed as a URL parameter

    // Split the string to get an array of comment IDs
    const idsArray = commentId.split(',').map(id => id.trim());

    // Iterate over the array and delete each comment
    const deleteOperations = idsArray.map(async (commentId) => {
      const comment = await Comment.findByIdAndDelete(commentId);
      if (comment) {
        // Optionally, update the post to remove the comment reference
        await Post.findByIdAndUpdate(comment.post, { $pull: { comments: commentId } });

        // Also delete all replies to this comment
        if (comment.replies && comment.replies.length > 0) {
          await Comment.deleteMany({ _id: { $in: comment.replies } });
        }
      }
    });

    // Wait for all deletion operations to complete
    await Promise.all(deleteOperations);

    sendSuccess(res, null, 'Comment deleted successfully');
  } catch (err) {
    console.error("Error deleting comment:", err);
    next(createHttpError(500, 'Failed to delete comment'));
  }
};