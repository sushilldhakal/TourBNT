# TourBNT

A comprehensive tour booking and management platform.

## Features

- 🎫 Tour booking and management
- 👥 User authentication and authorization
- 🏢 Seller/vendor management
- 📊 Admin dashboard
- 🖼️ Media gallery management
- 💳 Payment integration
- 📧 Email notifications
- 🔐 Secure API with JWT authentication

## Tech Stack

### Frontend
- Next.js 16
- React 18
- TypeScript
- Tailwind CSS
- Zustand (State Management)
- React Query (Data Fetching)

### Backend
- Node.js
- Express
- TypeScript
- MongoDB with Mongoose
- JWT Authentication
- Cloudinary (Media Storage)

### Dashboard
- Vite + React
- TypeScript
- Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/TourBNT.git
cd TourBNT
```

2. Install dependencies:
```bash
# Install server dependencies
cd server
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Install dashboard dependencies
cd ../dashboard
npm install
```

3. Set up environment variables:
```bash
# Copy example env files
cp server/.env.example server/.env
cp frontend/.env.example frontend/.env
cp dashboard/.env.example dashboard/.env

# Edit the .env files with your actual values
```

4. Start development servers:
```bash
# Terminal 1 - Start backend
cd server
npm run dev

# Terminal 2 - Start frontend
cd frontend
npm run dev

# Terminal 3 - Start dashboard
cd dashboard
npm run dev
```

5. Access the applications:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Dashboard: http://localhost:5173

## Project Structure

```
TourBNT/
├── frontend/          # Next.js frontend application
├── dashboard/         # Vite dashboard application
├── server/           # Express backend API
├── .gitignore        # Git ignore rules
└── README.md         # This file
```

## Environment Variables

See `.env.example` files in each directory for required environment variables.

## User Roles

- **admin**: Full system access
- **seller**: Can manage tours and bookings
- **user**: Can browse and book tours
- **subscriber**: Premium user features

## API Documentation

API documentation is available at `/api/docs` when running the server.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support, email support@tourbnt.com or open an issue in the repository.
