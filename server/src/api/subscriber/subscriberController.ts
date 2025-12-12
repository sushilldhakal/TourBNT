// routes/subscriberRoutes.js
import { Request, Response } from 'express';
import Subscriber from './subscriberModel';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

// Subscribe a new email
export const newSubscriber = async (req: Request, res: Response) => {
  const email = req.body.email || '';
  const emails = typeof email === 'string' ? email.split(/[,;]\s*/) : Array.isArray(email) ? email : [];
  if (emails.length === 0) {
      return res.status(400).json({ error: 'No valid emails provided.' });
  }
  const normalizedEmails = emails.map(normalizeEmail);
  try {
    const existingSubscribers = await Subscriber.find({ email: { $in: normalizedEmails } });
    const existingEmails = new Set(existingSubscribers.map(sub => normalizeEmail(sub.email)));
    const newEmails = normalizedEmails.filter(email => !existingEmails.has(email));

    const allExistingEmails = [...existingEmails];

    if (newEmails.length === 0) {
      return res.status(400).json({ 
        error: 'All provided emails are either already subscribed', 
        existingEmails: allExistingEmails
      });
    }
      const newSubscribers = newEmails.map(email => ({ email }));
      await Subscriber.insertMany(newSubscribers);
      res.status(201).json({ message: 'Subscription(s) successful!', addedEmails: newEmails });
  } catch (error) {
      res.status(500).json({ error: 'Server error, please try again later.' });
  }
};


export const getAllSubscribers = async (req: Request, res: Response) => {
    try {
      const subscribers = await Subscriber.find();
      res.status(200).json(subscribers);
    } catch (error) {
      console.error('Error in getAllSubscribers:', error);
      res.status(500).json({ error: 'Server error, please try again later.' });
    }
  };

// Unsubscribe an email
export const unsubscribe = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const existingSubscriber = await Subscriber.findOne({ email });
    if (!existingSubscriber) {
      return res.status(400).json({ error: 'Email not found.' });
    }

    await Subscriber.deleteOne({ email });
    res.status(200).json({ message: 'Unsubscribed successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error, please try again later.' });
  }
};
