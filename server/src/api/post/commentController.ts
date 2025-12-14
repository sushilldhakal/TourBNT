import { Request, Response, NextFunction } from 'express';
import Comment from './commentModel';  // Adjust the path as necessary
import Post from './postModel';        // Adjust the path as necessary
import createHttpError from 'http-errors';
import { AuthRequest } from '../../middlewares/authenticate';
import CommentLike from './commentLikeModel';

// Create a new comment
export const addComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { post, user, text, likes } = req.body;

    const newComment = new Comment({
      post,
      user,
      text,
      likes,
      approve: false,
    });

    await newComment.save();

    // Optionally, update the post to include the new comment
    await Post.findByIdAndUpdate(post, { $push: { comments: newComment._id } });

    res.status(201).json(newComment);
  } catch (err) {
    console.error("Error adding comment:", err);
    next(createHttpError(500, 'Failed to add comment'));
  }
};

// Add a reply to a comment
export const addReply = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { commentId } = req.params;
    const { user, text } = req.body;
    // Get the parent comment to access its post ID
    const parentComment = await Comment.findById(commentId);

    if (!parentComment) {
      return next(createHttpError(404, 'Parent comment not found'));
    }

    // Create a new comment as a reply
    const newReply = new Comment({
      post: parentComment.post, // Use the same post ID as the parent
      user,
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

    res.status(201).json(newReply);
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
    res.status(200).json({
      ...updatedComment.toObject(),
      isLiked: !existingLike
    });
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

    res.status(200).json(updatedComment);
  } catch (err) {
    console.error("Error tracking comment view:", err);
    next(createHttpError(500, 'Failed to track comment view'));
  }
};

export const editComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { commentId } = req.params; // Get the comment ID from the URL parameters
    const { approve } = req.body;

    // Update the comment
    const updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      { approve }, // Only update the approve field
      { new: true, runValidators: true } // Return the updated document and run validators
    );

    if (!updatedComment) {
      return next(createHttpError(404, 'Comment not found'));
    }

    res.status(200).json(updatedComment);
  } catch (err) {
    console.error("Error editing comment:", err);
    next(createHttpError(500, 'Failed to edit comment'));
  }
};

// Get comments for a specific post
export const getCommentsByPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { postId } = req.params;

    // Use pagination params from middleware if available
    const { page, limit, skip } = req.pagination || { page: 1, limit: 10, skip: 0 };

    // Build query for comments on this post
    const query = { post: postId };

    // Get comments with pagination
    const comments = await Comment.find(query)
      .populate('user', 'name email')
      .populate({
        path: 'replies',
        populate: {
          path: 'user',
          select: 'name email'
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination metadata
    const totalItems = await Comment.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);

    res.status(200).json({
      page,
      limit,
      totalPages,
      totalItems,
      comments
    });
  } catch (err) {
    console.error("Error fetching comments:", err);
    next(createHttpError(500, 'Failed to get comments'));
  }
};

// Get a specific comment with its replies
export const getCommentWithReplies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId)
      .populate('user', 'name email')
      .populate({
        path: 'replies',
        populate: {
          path: 'user',
          select: 'name email'
        }
      });

    if (!comment) {
      return next(createHttpError(404, 'Comment not found'));
    }

    res.status(200).json(comment);
  } catch (err) {
    console.error("Error fetching comment with replies:", err);
    next(createHttpError(500, 'Failed to get comment with replies'));
  }
};

export const getAllComments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const _req = req as AuthRequest;
  try {
    // Get pagination parameters from query
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    let query;
    let totalComments: number;

    if (_req.roles === 'admin') {
      // Admin can see all comments
      query = Comment.find();
      totalComments = await Comment.countDocuments();
    } else {
      // For sellers, first get all their posts
      const sellerPosts = await Post.find({ author: _req.userId });
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


    res.status(200).json({
      success: true,
      data: {
        comments,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalComments / limit),
          totalItems: totalComments,
          itemsPerPage: limit
        }
      }
    });
  } catch (err) {
    console.error("Error fetching comments:", err);
    next(createHttpError(500, 'Failed to get comments'));
  }
};
export const getUnapprovedCommentsCount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const _req = req as AuthRequest;
  try {
    let unapprovedCount;

    if (_req.roles === 'admin') {
      // Admin counts all unapproved comments
      unapprovedCount = await Comment.countDocuments({ approve: false });
    } else {
      // Sellers count unapproved comments on their posts
      const sellerPosts = await Post.find({ author: _req.userId });
      const postIds = sellerPosts.map(post => post._id);

      unapprovedCount = await Comment.countDocuments({ approve: false, post: { $in: postIds } });
    }

    // Send the count as response
    res.status(200).json({ unapprovedCount });
  } catch (err) {
    console.error("Error fetching unapproved comments count:", err);
    next(createHttpError(500, 'Failed to get unapproved comments count'));
  }
};

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

    res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (err) {
    console.error("Error deleting comment:", err);
    next(createHttpError(500, 'Failed to delete comment'));
  }
};