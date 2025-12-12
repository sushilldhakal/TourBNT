# Travel Tour Booking - Frontend

A modern Next.js frontend application for a travel tour booking platform with comprehensive tour management, booking system, and user authentication.

## 🚀 Features

- **Tour Management**: Browse, search, and filter tours with advanced filtering options
- **Booking System**: Complete booking flow with date selection and payment integration
- **User Authentication**: Secure login/signup with JWT-based authentication
- **Admin Dashboard**: Comprehensive admin panel for managing tours, bookings, and users
- **Tour Facts & FAQs**: Dynamic tour information with customizable facts and frequently asked questions
- **Destination Management**: Organize tours by destinations with rich media support
- **Category System**: Categorize tours for better organization and discovery
- **Responsive Design**: Fully responsive UI built with Tailwind CSS
- **Dark Mode**: Built-in dark mode support with next-themes

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Radix UI primitives
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form with Zod validation
- **Rich Text Editor**: Tiptap
- **Icons**: Lucide React
- **Authentication**: JWT with HTTP-only cookies
- **API Client**: Axios

## 📋 Prerequisites

- Node.js 20.x or higher
- npm or yarn package manager
- Backend API server running (see server directory)

## 🔧 Installation

1. Clone the repository:
```bash
git clone git@github.com:sushilldhakal/travel.git
cd travel/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.local.example .env.local
```

4. Configure environment variables in `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```
The application will be available at `http://localhost:3000`

### Production Build
```bash
npm run build
npm start
```

### Linting
```bash
npm run lint
```

## 📁 Project Structure

```
frontend/
├── app/                    # Next.js app directory
│   ├── dashboard/         # Admin dashboard pages
│   ├── tours/            # Tour-related pages
│   └── layout.tsx        # Root layout
├── components/            # React components
│   ├── dashboard/        # Dashboard-specific components
│   ├── ui/              # Reusable UI components
│   └── ...
├── lib/                  # Utility functions and configurations
│   ├── api/             # API client functions
│   ├── auth/            # Authentication utilities
│   └── utils/           # Helper functions
├── providers/           # Context providers
├── store/              # Zustand store
├── public/             # Static assets
└── src/                # Additional source files
```

## 🔑 Key Features Implementation

### Checkbox-Based Multiple Selection
- Implemented in Facts and FAQs management
- Bulk delete functionality with confirmation dialogs
- Select all/deselect all functionality
- Visual feedback for selected items

### View Toggle (Grid/List)
- Persistent view preferences using localStorage
- Smooth transitions between views
- Responsive design for both layouts

### Tour Management
- Create, read, update, and delete tours
- Rich text editor for tour descriptions
- Image upload and management
- Dynamic pricing and availability

### Booking System
- Date-based availability checking
- Real-time price calculation
- Secure payment integration
- Booking confirmation and management

## 🔐 Authentication

The application uses JWT-based authentication with HTTP-only cookies for security:

- Login/Signup flows
- Protected routes with middleware
- Role-based access control (Admin/Seller/User)
- Automatic token refresh

## 🎨 UI Components

Built with Radix UI primitives and custom styling:

- Buttons, Inputs, Selects
- Dialogs, Dropdowns, Popovers
- Cards, Badges, Avatars
- Tables, Tabs, Accordions
- Toast notifications
- Loading skeletons

## 📱 Responsive Design

- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Touch-friendly interactions
- Optimized for all screen sizes

## 🧪 Testing

```bash
npm run test
```

## 📦 Building for Production

```bash
npm run build
```

The optimized production build will be created in the `.next` directory.

## 🚢 Deployment

### Vercel (Recommended)
```bash
vercel deploy
```

### Docker
```bash
docker build -t travel-frontend .
docker run -p 3000:3000 travel-frontend
```

### Manual Deployment
1. Build the application: `npm run build`
2. Start the production server: `npm start`
3. Configure reverse proxy (nginx/Apache)

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:5000` |
| `NEXT_PUBLIC_APP_URL` | Frontend URL | `http://localhost:3000` |

### Tailwind Configuration

Customize theme in `tailwind.config.ts`:
- Colors
- Fonts
- Spacing
- Breakpoints

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 Code Style

- ESLint configuration included
- Prettier for code formatting
- TypeScript strict mode enabled
- Follow React best practices

## 🐛 Known Issues

- None currently reported

## 📄 License

This project is licensed under the MIT License.

## 👥 Authors

- Sushil Dhakal - [@sushilldhakal](https://github.com/sushilldhakal)

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Radix UI for accessible components
- Tailwind CSS for utility-first styling
- All contributors and supporters

## 📞 Support

For support, email support@example.com or open an issue in the repository.

## 🔗 Links

- [Backend Repository](../server)
- [Dashboard Repository](../dashboard)
- [Documentation](./docs)
- [Live Demo](https://travel-demo.vercel.app)
