# Tildra

AI-powered content summarization platform that transforms lengthy articles into concise, actionable summaries.

## Overview

Tildra is a SaaS platform designed to help professionals save time by automatically generating intelligent summaries of web content. Our AI-powered system extracts key insights and presents them in a structured format, enabling users to quickly process information and make informed decisions.

## Architecture

### Core Components

- **Web Application**: Next.js frontend with TypeScript and Tailwind CSS
- **API Backend**: FastAPI with Python, providing summarization and user management
- **Browser Extension**: Chrome extension for seamless content extraction
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk for user management and security
- **Payment Processing**: Stripe integration for subscription management

### Technology Stack

**Frontend**
- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- Shadcn/ui components

**Backend**
- FastAPI (Python)
- Prisma ORM
- PostgreSQL database
- JWT authentication
- Stripe payments

**Infrastructure**
- Fly.io deployment
- Docker containerization
- Chrome Web Store distribution

## Features

### Core Functionality
- Intelligent content summarization
- Key point extraction
- Reading time estimation
- Export capabilities
- Usage analytics

### Premium Features
- Unlimited summaries
- Advanced AI models
- Priority processing
- Extended history
- Custom formatting

### Browser Extension
- One-click summarization
- Context menu integration
- Local storage sync
- Cross-site compatibility

## API Endpoints

### Summary Generation
```
POST /summarize
```
Generates AI-powered summaries from article content.

### User Management
```
GET /api/user/status
POST /api/user/settings
```
Handles user authentication and preferences.

### Subscription Management
```
POST /api/create-checkout-session
POST /api/create-portal-session
```
Manages Stripe subscription workflows.

## Database Schema

The application uses PostgreSQL with the following core tables:
- `User`: User profiles and authentication data
- `Summary`: Generated summaries and metadata
- `Subscription`: Payment and plan information

## Deployment

The application is containerized using Docker and deployed on Fly.io with automatic scaling and health monitoring.

## Security

- JWT-based authentication
- CORS protection
- Rate limiting
- Input validation
- Secure webhook handling

## Support

For technical support or business inquiries, contact: support@tildra.xyz

## License

Proprietary software. All rights reserved.