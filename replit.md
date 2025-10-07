# Overview

This is a Loyalty Program Platform - a full-stack web application designed to manage reward and loyalty programs for manufacturers, distributors, and partners in the hardware and software industry. The platform enables users to register deals, earn points based on sales performance, and redeem rewards. It includes comprehensive admin functionality for managing users, approving deals, and tracking metrics across different countries and partner levels.

The application features a React frontend with TypeScript, an Express.js backend, and uses PostgreSQL with Drizzle ORM for data management. It implements role-based authentication, deal management workflows, points tracking, and a rewards redemption system.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for build tooling
- **UI Library**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod validation

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Session-based auth with bcrypt for password hashing
- **API Design**: RESTful API endpoints with structured error handling

## Database Design
- **Database**: PostgreSQL with connection pooling via Neon serverless
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Core Entities**:
  - Users with role-based access (user/admin) and partner levels (bronze/silver/gold/platinum)
  - Deals with approval workflow and points calculation
  - Rewards catalog with category-based organization
  - Points history tracking for audit trails
  - User rewards redemption tracking
  - Support tickets with status tracking and admin responses

## Authentication & Authorization
- **Session Management**: Server-side sessions with secure cookie handling
- **Password Security**: bcrypt hashing with salt rounds
- **Role-Based Access**: Admin and user roles with different permission levels
- **Route Protection**: Authentication middleware on protected endpoints

## Key Features
- **Deal Management**: Users can submit deals for approval, admins can approve/reject and edit deals
- **Points System**: Automatic points calculation based on deal values and product types
- **Rewards Catalog**: Categorized rewards with stock management and redemption tracking. Admins can create, edit, and delete rewards
- **User Statistics**: Real-time dashboard with points, deals, and performance metrics
- **Admin Dashboard**: User management, deal approval workflows, and system analytics
- **Multi-language Support**: Internationalization structure with English and Spanish support
- **Support System**: Floating support button with ticket submission, FAQ section, and admin ticket management

## Support System (Added October 2025)

The application includes a comprehensive support ticket system that allows users to submit questions and requests, and admins to manage and respond to them.

### User Features
- **Floating Support Button**: Always visible in the bottom-right corner for authenticated users
- **Ticket Submission**: Users can create support tickets with subject, message, and priority level
- **FAQ Section**: Quick access to 8 frequently asked questions covering common topics like deal registration, points, rewards, and shipment tracking
- **Ticket History**: Users can view their own submitted tickets

### Admin Features
- **Support Tab**: Dedicated admin panel tab for managing all support tickets
- **Ticket Dashboard**: Statistics showing counts by status (open, in-progress, resolved, closed)
- **Response System**: Admins can respond to tickets and update their status
- **Quick Actions**: One-click status updates (start working, mark as resolved)
- **User Information**: Each ticket displays full user details including name and email

### Technical Implementation
- **Database Table**: `support_tickets` with fields for subject, message, status, priority, admin response, and timestamps
- **Status Enum**: `support_ticket_status` with values: open, in_progress, resolved, closed
- **API Endpoints**:
  - POST `/api/support-tickets` - Create ticket (user)
  - GET `/api/support-tickets` - Get user's tickets (user)
  - GET `/api/admin/support-tickets` - Get all tickets (admin)
  - PATCH `/api/admin/support-tickets/:id` - Update ticket (admin)
- **Components**:
  - `SupportButton.tsx` - Floating button with dialogs for ticket submission and FAQ
  - `SupportTicketsTab.tsx` - Admin panel component for ticket management

## External Dependencies

- **Database**: Neon PostgreSQL serverless database for production data storage
- **UI Components**: Radix UI primitives for accessible component foundations
- **Validation**: Zod for runtime type validation and schema definition
- **Styling**: Tailwind CSS for utility-first styling approach
- **Build Tools**: Vite for fast development and production builds
- **Development**: Replit-specific plugins for development environment integration