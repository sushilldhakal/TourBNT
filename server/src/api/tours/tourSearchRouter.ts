import express from 'express';
import { getLatestTours,  searchTours } from './controllers/tourController';

const tourSearchRouter = express.Router();

// Define specific routes before more generic ones
tourSearchRouter.get('/latest', (req, res, next) => {
  try {
    getLatestTours(req, res, next);
  } catch (err) {
    console.error('Error in latest tours endpoint:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching latest tours', 
      error: err instanceof Error ? err.message : String(err) 
    });
  }
});

tourSearchRouter.get('/', (req, res, next) => {
  try {
    console.log('Search query:', req.query);
    searchTours(req, res, next);
  } catch (err) {
    console.error('Error in search tours endpoint:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error searching tours', 
      error: err instanceof Error ? err.message : String(err) 
    });
  }
});


export default tourSearchRouter;
