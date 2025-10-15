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

## Points Configuration System (Added October 2025)

The platform includes a dynamic points configuration system that allows admins to modify point assignment rules and set redemption periods without code changes.

### Admin Configuration
- **Points Config Tab**: Dedicated admin panel tab (9th tab) for managing all points-related settings
- **Editable Rules**: Admins can modify point assignment rates for each product type:
  - Software: Dollars per 1 point (default: $1000)
  - Hardware: Dollars per 1 point (default: $5000)
  - Equipment: Dollars per 1 point (default: $10000)
- **Grand Prize Threshold**: Configurable point threshold for grand prize eligibility (default: 50,000 points)
- **Redemption Period**: Admins can set start and end dates for when users can redeem rewards
  - Start Date: Beginning of redemption period
  - End Date: End of redemption period
  - Dates are optional and only displayed to users when both are configured

### User Experience
- **Dynamic Point Calculation**: All new deals automatically use the current configured rates
- **Redemption Period Display**: Users see the active redemption period as an alert on the Rewards page
  - Format: "Período de Redención: [fecha inicio] - [fecha fin]"
  - Dates formatted in Spanish locale (e.g., "1 de octubre de 2025 - 31 de diciembre de 2025")
  - Alert only shows when both dates are configured

### Technical Implementation
- **Database Table**: `points_config` with fields:
  - `software_rate`, `hardware_rate`, `equipment_rate`: Integer rates for point calculation
  - `grand_prize_threshold`: Integer threshold for grand prize
  - `redemption_start_date`, `redemption_end_date`: Nullable timestamps for redemption period
  - `updated_at`, `updated_by`: Audit trail fields
- **API Endpoints**:
  - GET `/api/points-config` - Public endpoint returning redemption dates and grand prize threshold
  - GET `/api/admin/points-config` - Admin endpoint returning full configuration
  - PATCH `/api/admin/points-config` - Admin endpoint for updating configuration
- **Components**:
  - `PointsConfigTab.tsx` - Admin panel component with forms for all configuration options
  - Date pickers for redemption period with HTML5 date inputs
  - Alert component in `rewards.tsx` displaying redemption period to users

## Real-Time Notification System (Added October 2025)

The platform includes a comprehensive real-time notification system using Socket.IO for instant user updates.

### User Features
- **Notification Bell**: Icon in navigation bar shows unread notification count
- **Real-Time Updates**: Notifications appear instantly without page refresh
- **Notification Popover**: Click bell to view notification history
- **Mark as Read**: Click individual notifications or mark all as read
- **Browser Notifications**: Optional native browser notifications (requires permission)

### Notification Types
- **Deal Approved**: Success notification with points earned
- **Deal Rejected**: Warning notification
- **Reward Redeemed**: Info notification for pending approval
- **Reward Approved**: Success notification
- **Reward Rejected**: Warning notification with points refund info
- **Shipment Updated**: Info notification for shipping status (shipped/delivered)
- **Support Response**: Info notification when admin responds to ticket

### Technical Implementation
- **Backend**: Socket.IO server integrated with Express
- **Database Table**: `notifications` with fields for userId, title, message, type, isRead, createdAt
- **Socket Events**: `notification:{userId}` for user-specific notifications
- **API Endpoints**:
  - GET `/api/notifications` - Get user notifications
  - PATCH `/api/notifications/:id/read` - Mark notification as read
  - PATCH `/api/notifications/read-all` - Mark all as read
- **Frontend Components**:
  - `useSocket` hook - Manages Socket.IO connection
  - `NotificationBell.tsx` - Bell icon with popover UI
  - Integrated in `navigation.tsx`
- **Notification Helper**: `server/notifications.ts` - Centralizes notification creation and Socket.IO emission

### How It Works
1. Admin/system performs action (approve deal, ship reward, etc.)
2. Backend creates notification in database
3. Backend emits Socket.IO event to specific user
4. Frontend receives event and updates UI in real-time
5. User sees notification badge update instantly
6. User clicks to view and mark as read

## External Dependencies

- **Database**: Neon PostgreSQL serverless database for production data storage
- **Real-Time**: Socket.IO for WebSocket-based real-time notifications
- **UI Components**: Radix UI primitives for accessible component foundations
- **Validation**: Zod for runtime type validation and schema definition
- **Styling**: Tailwind CSS for utility-first styling approach
- **Build Tools**: Vite for fast development and production builds
- **Development**: Replit-specific plugins for development environment integration