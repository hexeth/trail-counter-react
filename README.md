# Trail Counter

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

A QR code-based registration system for horse riders on trails, built with React Router, shadcn/ui, and Cloudflare Workers.

<div align="center" >

[Report Bug](https://github.com/hexeth/trail-counter-react/issues) | [Request Feature](https://github.com/hexeth/trail-counter-react/issues)

</div>

## 📋 Table of Contents

- [About](#about)
- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Security](#security)
- [Performance](#performance)
- [License](#license)

## 🚀 About

Trail Counter is a modern web application that simplifies trail registration for horse riders and provides administrators with powerful tools for managing trails and analyzing registration data.

### Built With

- **Frontend**: [React Router](https://reactrouter.com/) with [shadcn/ui](https://ui.shadcn.com/) components
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Backend**: [Cloudflare Workers](https://workers.cloudflare.com/) with Durable Objects for storage
- **Deployment**: [Cloudflare Pages](https://pages.cloudflare.com/)
- **Authentication**: [Clerk](https://clerk.dev/)

## ✨ Features

### For Riders
- Quick registration via QR code scanning
- Mobile-friendly forms optimized for on-trail usage
- Instant confirmation of successful registration

### For Administrators
- **Comprehensive Dashboard**
  - Real-time analytics and statistics
  - Visual data representations
  - Customizable date ranges for reports
- **Trail Management**
  - Create, update, and delete trail information
  - Generate custom QR codes for each trail
  - Create print templates for QR code signage
- **Data Management**
  - Export registration data in multiple formats
  - Delete outdated entries
  - Filter and search functionality

### Security Features
- Role-based access control for administrative functions
- JWT authentication for protected routes
- Data validation and sanitization


## 🏗️ Architecture

Trail Counter uses a serverless architecture built on Cloudflare Workers and Durable Objects, providing a scalable and resilient system. Read more about the architecture in the [ARCHITECTURE.MD](https://github.com/hexeth/trail-counter-react/blob/master/ARCHITECTURE.md)

## 🛠️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18.x or higher
- [npm](https://www.npmjs.com/) 8.x or higher
- [Cloudflare account](https://dash.cloudflare.com/sign-up) with Workers and Durable Objects enabled
- [Wrangler CLI](https://developers.cloudflare.com/workers/cli-wrangler/install-update)
- [Clerk account](https://clerk.dev/) for authentication

### Installation

1. Clone the repository
   ```sh
   git clone https://github.com/yourusername/trail-counter-react.git
   cd trail-counter-react/my-react-router-app
   ```

2. Install dependencies
   ```sh
   npm install
   ```

3. Set up environment configuration

   **Development Environment**
   
   Create a `.env.development` file:
   ```
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_DEV_KEY_HERE
   ```

   Set up development secrets:
   ```sh
   npx wrangler secret put CLERK_SECRET_KEY --env development
   ```

   **Production Environment**
   
   Create a `.env.production` file:
   ```
   VITE_CLERK_PUBLISHABLE_KEY=pk_live_YOUR_PRODUCTION_KEY_HERE
   ```

   Set up production secrets:
   ```sh
   npx wrangler secret put CLERK_SECRET_KEY --env production
   ```

## 🖥️ Usage

### Local Development

Run the development server:

```sh
npm run dev
```

### Deployment

1. Build the project:
   ```sh
   npm run build
   ```

2. Deploy to Cloudflare:
   ```sh
   npm run deploy
   ```

## 📁 Project Structure

```
├── app/                  # React frontend application
│   ├── components/       # UI components
│   ├── lib/              # Frontend utilities
│   └── routes/           # Route components and pages
├── lib/                  # Shared code between frontend and backend
├── workers/              # Cloudflare Workers backend
│   ├── durable-objects/  # Durable Objects definitions
│   └── services/         # Service implementations
├── public/               # Static assets
├── tests/                # Test suites
└── scripts/              # Utility scripts
```

## 🧪 Testing

```sh
# Run all tests
npm test

# Run specific test suites
npm run test:security
npm run test:api
```

## 🔒 Security

The application implements several security measures:

- **Authentication**: All admin routes require Clerk authentication
- **Authorization**: Role-based access controls for administrative functions
- **API Protection**: JWT verification for API endpoints
- **Data Validation**: Input validation and sanitization on all forms
- **Rate Limiting**: Protection against abuse on registration endpoints
- **Regular Testing**: Security testing through automated pentesting scripts

## 🚀 Performance

- **Caching Strategy**: Frequently accessed data is cached with TTLs
- **Optimized Data Loading**: Pagination and incremental loading for large datasets
- **Efficient Updates**: Batch processing for analytics operations
- **Smart Invalidation**: Debounced cache invalidation to reduce overhead

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Built with ❤️ for my mom</sub>
</div>
