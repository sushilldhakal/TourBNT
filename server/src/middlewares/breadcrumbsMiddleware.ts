import { Request, Response, NextFunction } from "express";
import tourModel from "../api/tours/tourModel";
import userModel from "../api/user/userModel";
import mongoose from "mongoose";

export interface Breadcrumb {
  label: string;
  url: string;
}

const breadcrumbsMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const breadcrumbs: Breadcrumb[] = [];

  const parts = req.path.split('/').filter(part => part);

  for (let i = 0; i < parts.length; i++) {
    const url = '/' + parts.slice(0, i + 1).join('/');
    let label = parts[i];

    if (i > 0 && parts[i - 1] === 'tours') {
      // Skip fetching tour title for special routes
      if (['reviews', 'all', 'pending'].includes(label)) {
        // Just capitalize the label for special routes
        label = label.charAt(0).toUpperCase() + label.slice(1);
      } else {
        // Only try to fetch a tour if the label is a valid ObjectId
        if (mongoose.isValidObjectId(label)) {
          try {
            const tour = await tourModel.findById(label).select('title');
            if (tour) {
              label = tour.title;
            }
          } catch (error) {
            console.error(`Error fetching tour title for ID ${label}:`, error);
            // Handle the error appropriately, such as logging and returning a generic label
          }
        }
      }
    } else if (i > 0 && parts[i - 1] === 'users') {
      // Check if label is a valid ObjectId
      if (mongoose.isValidObjectId(label)) {
        try {
          const user = await userModel.findById(label).select('name');
          if (user) {
            label = user.name;
          }
        } catch (error) {
          console.error(`Error fetching user name for ID ${label}:`, error);
          // Handle the error appropriately, such as logging and returning a generic label
        }
      } else {
        // Handle non-ObjectId identifier (e.g., username)
        label = `Username: ${label}`;
      }
    }

    breadcrumbs.push({
      label,
      url,
    });
  }

  req.breadcrumbs = breadcrumbs;
  next();
};

export default breadcrumbsMiddleware;
