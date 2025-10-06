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

## External Dependencies

- **Database**: Neon PostgreSQL serverless database for production data storage
- **UI Components**: Radix UI primitives for accessible component foundations
- **Validation**: Zod for runtime type validation and schema definition
- **Styling**: Tailwind CSS for utility-first styling approach
- **Build Tools**: Vite for fast development and production builds
- **Development**: Replit-specific plugins for development environment integration