# Frontend Setup Guide

## Overview

The CRM Portal frontend is built with Next.js 16, React 19, TypeScript, and Tailwind CSS. It connects to the FastAPI backend for all data operations.

## Environment Variables

Create a `.env.local` file in the root directory:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

For production, set this to your deployed backend URL.

## Project Structure

```
app/
├── page.tsx                    # Landing page
├── login/page.tsx              # Login page
├── register/page.tsx           # Registration page
├── dashboard/                  # Protected dashboard routes
│   ├── page.tsx               # Main dashboard
│   ├── leads/page.tsx         # Lead management
│   ├── clients/page.tsx       # Client management
│   ├── projects/page.tsx      # Project management
│   ├── tasks/page.tsx         # Task management
│   ├── tickets/page.tsx       # Support tickets
│   └── invoices/page.tsx      # Invoicing
components/
├── dashboard-layout.tsx        # Main dashboard layout with sidebar
├── dashboard-nav.tsx           # Navigation component
└── ui/                        # shadcn/ui components
hooks/
├── use-auth.tsx               # Authentication context and hook
├── use-mobile.tsx             # Mobile detection hook
└── use-toast.ts               # Toast notifications
lib/
├── api-client.ts              # API client for backend communication
└── utils.ts                   # Utility functions
```

## Authentication Flow

1. User registers or logs in via `/register` or `/login`
2. Backend returns JWT access token
3. Token is stored in localStorage and used for all API requests
4. `useAuth` hook provides authentication state throughout the app
5. `DashboardLayout` protects routes by checking authentication
6. User can logout, which clears the token and redirects to login

## API Integration

The `api-client.ts` file provides a typed client for all backend endpoints:

- Authentication: `login()`, `register()`, `getCurrentUser()`
- Dashboard: `getDashboardStats()`
- Leads: `getLeads()`, `createLead()`, `updateLead()`, `deleteLead()`, `convertLead()`
- Clients: `getClients()`, `createClient()`, `updateClient()`, `deleteClient()`
- Projects: `getProjects()`, `createProject()`, `updateProject()`, `deleteProject()`
- Tasks: `getTasks()`, `createTask()`, `updateTask()`, `deleteTask()`
- Tickets: `getTickets()`, `createTicket()`, `updateTicket()`, `deleteTicket()`
- Invoices: `getInvoices()`, `createInvoice()`, `updateInvoice()`, `deleteInvoice()`

## Running the Frontend

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open http://localhost:3000

## Building for Production

```bash
npm run build
npm start
```

## Features Implemented

- ✅ Landing page with CRM overview
- ✅ User authentication (login/register)
- ✅ Protected dashboard routes
- ✅ Responsive sidebar navigation
- ✅ Dashboard with real-time statistics
- ✅ Lead management with CRUD operations
- ✅ Integration with FastAPI backend
- ✅ Toast notifications for user feedback
- ✅ Loading states and error handling
- ✅ Role-based access display

## Next Steps

To complete the frontend implementation:

1. Add create/edit dialogs for all modules
2. Implement search and filter functionality
3. Add pagination for large datasets
4. Build detailed view pages for each entity
5. Implement real-time notifications
6. Add file upload for attachments
7. Create reporting and analytics views
8. Add data export functionality
