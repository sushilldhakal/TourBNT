/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from "express";
import { db, tours, users } from "@tourbnt/db";
import { eq } from "drizzle-orm";

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
      if (['reviews', 'all', 'pending'].includes(label)) {
        label = label.charAt(0).toUpperCase() + label.slice(1);
      } else {
        try {
          const [tour] = await db.select({ title: tours.title }).from(tours).where(eq(tours.id, label)).limit(1);
          if (tour) {
            label = tour.title;
          }
        } catch (error) {
          console.error(`Error fetching tour title for ID ${label}:`, error);
        }
      }
    } else if (i > 0 && parts[i - 1] === 'users') {
      try {
        const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, label)).limit(1);
        if (user) {
          label = user.name;
        } else {
          label = `Username: ${label}`;
        }
      } catch (error) {
        console.error(`Error fetching user name for ID ${label}:`, error);
      }
    }

    breadcrumbs.push({ label, url });
  }

  req.breadcrumbs = breadcrumbs;
  next();
};

export default breadcrumbsMiddleware;
