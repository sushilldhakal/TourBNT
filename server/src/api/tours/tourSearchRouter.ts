import express from 'express';
import { getLatestTours, searchTours } from './controllers/tourController';
import { sendError } from '../../utils/apiResponse';

const tourSearchRouter = express.Router();

// Define specific routes before more generic ones
/**
 * @swagger
 * /api/v1/tour-search/latest:
 *   get:
 *     summary: Get latest tours
 *     description: Retrieve the most recently created tours
 *     tags: [Tour Search]
 *     responses:
 *       200:
 *         description: Latest tours retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Tour'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 */
tourSearchRouter.get('/latest', (req, res, next) => {
  try {
    getLatestTours(req, res, next);
  } catch (err) {
    console.error('Error in latest tours endpoint:', err);
    return sendError(res, 'Error fetching latest tours');
  }
});

/**
 * @swagger
 * /api/v1/tour-search:
 *   get:
 *     summary: Advanced tour search
 *     description: Search tours with advanced filters including category, destination, price range, and text search
 *     tags: [Tour Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query for title and description
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Category ID to filter by
 *       - in: query
 *         name: destination
 *         schema:
 *           type: string
 *         description: Destination ID to filter by
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: rating
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *         description: Minimum rating filter
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *         description: Number of results per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [price, rating, createdAt, title]
 *         description: Field to sort by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Tour'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: number
 *                     limit:
 *                       type: number
 *                     total:
 *                       type: number
 *                     totalPages:
 *                       type: number
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 */
tourSearchRouter.get('/', (req, res, next) => {
  try {
    console.log('Search query:', req.query);
    searchTours(req, res, next);
  } catch (err) {
    console.error('Error in search tours endpoint:', err);
    return sendError(res, 'Error searching tours');
  }
});


export default tourSearchRouter;
