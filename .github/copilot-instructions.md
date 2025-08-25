# Trail Counter React - GitHub Copilot Instructions

**ALWAYS** reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Bootstrap, Build, and Test the Repository

**CRITICAL**: Set appropriate timeouts (60+ minutes) for all build commands. DO NOT use default timeouts that may cause premature cancellation.

1. **Install Dependencies**:
   ```bash
   PUPPETEER_SKIP_DOWNLOAD=true npm install
   ```
   - **NEVER CANCEL**: Takes 30-60 seconds. Network limitations prevent Puppeteer browser download.
   - Must use `PUPPETEER_SKIP_DOWNLOAD=true` to avoid network errors.

2. **Generate Types**:
   ```bash
   npm run cf-typegen
   ```
   - Takes 10-15 seconds. Generates Cloudflare Worker types.

3. **Type Check**:
   ```bash
   npm run typecheck
   ```
   - **EXPECTED BEHAVIOR**: This command WILL show TypeScript errors related to Durable Object types but the build still succeeds.
   - The type errors are not blocking - build process works despite them.

4. **Build the Application**:
   ```bash
   npm run build
   ```
   - **NEVER CANCEL**: Takes 15-20 seconds. ALWAYS wait for completion.
   - **SUCCESS CRITERIA**: Build completes with client and server bundles, even with TypeScript warnings.
   - **VALIDATION**: Look for "✓ built in X.XXs" messages for both client and server builds.

### Development Server

**Run the Development Server**:
```bash
npm run dev
```
- **NEVER CANCEL**: Takes 5-10 seconds to start.
- **EXPECTED BEHAVIOR**: Server starts on http://localhost:5173/ but shows Clerk authentication error without proper environment setup.
- **SUCCESS CRITERIA**: Server responds with "Unexpected Server Error" regarding Clerk publishableKey - this means the server is working correctly.
- **VALIDATION**: Access http://localhost:5173/ and verify you see the Clerk authentication error message.

### Testing

**Run Security Tests**:
```bash
# All tests
npm run test:all

# Individual test suites  
npm run test:security:api
npm run test:security:web
npm run test:workers
```
- **NEVER CANCEL**: Test suite takes 30-60 seconds to complete.
- **EXPECTED BEHAVIOR**: Tests will fail if no server is running or if network access is limited.
- **NETWORK LIMITATION**: Tests cannot reach external domains due to environment restrictions.

## Validation

### Manual Validation Requirements

**ALWAYS** perform these validation steps after making changes:

1. **Build Validation**:
   ```bash
   npm run build
   ```
   - Ensure build completes successfully within 20 seconds.
   - TypeScript errors about Durable Objects are expected and not blocking.

2. **Dev Server Validation**:
   ```bash
   npm run dev
   ```
   - Start the server and verify it responds on http://localhost:5173/
   - **SUCCESS**: Server shows Clerk authentication error (means React app loaded correctly)
   - **FAILURE**: Server doesn't start or shows different errors

3. **Code Formatting**:
   ```bash
   npx prettier . --check
   ```
   - **EXPECTED**: Code is currently not formatted (will show many warnings)
   - To format code: `npx prettier . --write`

### Environment Setup Requirements

**Development Environment Variables**:
Create `.env.development` file:
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_DEV_KEY_HERE
```

**Production Environment Variables**:
Create `.env.production` file:
```
VITE_CLERK_PUBLISHABLE_KEY=pk_live_YOUR_PRODUCTION_KEY_HERE
```

**Clerk Secrets** (requires Wrangler CLI and Cloudflare account):
```bash
# Development
npx wrangler secret put CLERK_SECRET_KEY --env development

# Production  
npx wrangler secret put CLERK_SECRET_KEY --env production
```

## Common Tasks

### Deployment
```bash
npm run deploy
```
- **NEVER CANCEL**: Takes 60+ seconds. Set timeout to 120+ seconds.
- Runs build followed by Wrangler deployment to Cloudflare.

### Available npm Scripts
- `npm run build` - Build for production (15-20 seconds)
- `npm run dev` - Start development server (5-10 seconds)
- `npm run deploy` - Build and deploy to Cloudflare (60+ seconds)
- `npm run cf-typegen` - Generate Cloudflare types (10-15 seconds)
- `npm run typecheck` - Type checking (shows expected errors, 15-20 seconds)
- `npm run test:all` - Run all security tests (30-60 seconds)
- `npm run test:security` - API and web security tests
- `npm run test:workers` - Worker-specific tests

### Key Project Structure
```
├── app/                  # React frontend application
│   ├── components/       # UI components (shadcn/ui based)
│   ├── lib/              # Frontend utilities  
│   └── routes/           # Route components and pages
├── lib/                  # Shared code between frontend and backend
├── workers/              # Cloudflare Workers backend
│   ├── durable-objects/  # Durable Objects definitions
│   └── services/         # Service implementations
├── tests/                # Security test suites
└── scripts/              # Utility scripts
```

### System Requirements
- **Node.js**: v20.19.4 (confirmed working)
- **npm**: v10.8.2 (confirmed working)  
- **Network**: Limited external access (many domains blocked)
- **Prettier**: Available for code formatting
- **TypeScript**: Has expected type errors that don't block builds

## Known Issues and Workarounds

1. **Puppeteer Installation**: Always use `PUPPETEER_SKIP_DOWNLOAD=true npm install`
2. **TypeScript Errors**: Durable Object type errors are expected - build still works
3. **Clerk Configuration**: Dev server needs proper environment variables to function fully
4. **Network Access**: External domain access is limited in this environment
5. **Test Failures**: Security tests fail without proper server setup or network access

## Timeout Recommendations

**NEVER CANCEL these commands. Always set appropriate timeouts:**

- `npm install`: 120 seconds minimum (measured: 60 seconds)
- `npm run build`: 60 seconds minimum (measured: 16 seconds)  
- `npm run deploy`: 180 seconds minimum
- `npm run test:all`: 120 seconds minimum
- `npm run dev`: 30 seconds to start (measured: 8 seconds)
- `npm run cf-typegen`: 30 seconds minimum (measured: 3 seconds)

## Frequently Used Files

### Configuration Files
- `package.json` - npm scripts and dependencies
- `wrangler.jsonc` - Cloudflare Workers configuration
- `vite.config.ts` - Vite build configuration
- `react-router.config.ts` - React Router SSR configuration

### Key Source Files
- `workers/app.ts` - Main Cloudflare Worker entry point
- `app/root.tsx` - React application root
- `app/routes/` - All application pages and API routes
- `workers/durable-objects/` - Durable Object implementations
- `workers/services/` - Business logic services

**When modifying backend code**: Always check corresponding service files in `workers/services/` after changing Durable Objects.

**When modifying frontend routes**: Always check `app/routes.ts` for routing configuration.

## Quick Reference Commands

```bash
# Full development setup
PUPPETEER_SKIP_DOWNLOAD=true npm install
npm run cf-typegen  
npm run build

# Start development
npm run dev

# Validate changes
npm run build
npx prettier . --check

# Deploy (with proper Cloudflare setup)
npm run deploy
```