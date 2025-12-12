import express from 'express';
import { addPost, getPost, deletePost, editPost, getAllPosts, getUserPost, getAllUserPosts } from './postController';
import { authenticate, isAdminOrSeller } from '../../middlewares/authenticate';
import { uploadNone } from '../../middlewares/multer';
import { 
  addComment, 
  deleteComment, 
  editComment, 
  getAllComments, 
  getCommentsByPost, 
  getUnapprovedCommentsCount,
  addReply,
  likeComment,
  viewComment,
  getCommentWithReplies
} from './commentController';

const postRouter = express.Router();

// Post-related routes
postRouter.post('/add',authenticate, uploadNone, addPost);
postRouter.get('/user', authenticate, getAllUserPosts);  // Fetch all posts
postRouter.get('/user/:userId', authenticate, getUserPost);
postRouter.get('/:postId', getPost);  // Fetch a single post by ID
postRouter.get('/', getAllPosts);     // Fetch all posts
postRouter.patch('/:postId', authenticate, uploadNone, editPost);  // Edit post
postRouter.delete('/:postId', authenticate, deletePost);  // Delete post

// Comment-related routes
postRouter.post('/comment/:postId', authenticate, addComment); // Add comment to a specific post
postRouter.get('/comment/post/:postId', getCommentsByPost);    // Get comments for a specific post
postRouter.get('/comment/unapproved/count', authenticate, getUnapprovedCommentsCount);
postRouter.get('/comment/post',authenticate, isAdminOrSeller as any, getAllComments); // Get all comments
postRouter.patch('/comment/:commentId', authenticate, editComment); // Edit comment by ID
postRouter.delete('/comment/:commentId', authenticate, deleteComment); // Delete comment by ID

// New comment functionality routes
postRouter.post('/comment/reply/:commentId', authenticate, addReply); // Add reply to a comment
postRouter.patch('/comment/like/:commentId', authenticate, likeComment); // Like a comment
postRouter.patch('/comment/view/:commentId', viewComment); // Track comment view (no auth required)
postRouter.get('/comment/:commentId/replies', getCommentWithReplies); // Get a comment with its replies

export default postRouter;
