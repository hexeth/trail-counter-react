# Dev Container

This repository includes a development container configuration for VS Code and GitHub Codespaces.

## Getting Started

### Prerequisites
- [Visual Studio Code](https://code.visualstudio.com/)
- [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

### Using the Dev Container

1. Open the repository in VS Code
2. When prompted, click "Reopen in Container" 
   - Or use Command Palette (Ctrl+Shift+P) → "Dev Containers: Reopen in Container"
3. Wait for the container to build and install dependencies
4. Start developing!

### What's Included

- **Node.js 18**: The runtime required for this project
- **Git & GitHub CLI**: Version control and GitHub integration
- **VS Code Extensions**: 
  - TypeScript language support
  - Tailwind CSS IntelliSense
  - Prettier code formatting
  - ESLint linting
  - Cloudflare Workers support
- **Port Forwarding**: Automatic forwarding of development server ports
- **Environment Setup**: Proper environment variables and settings

### Development Commands

```bash
# Install dependencies (done automatically)
npm install

# Start development server
npm run dev

# Generate Cloudflare types
npm run cf-typegen

# Run tests
npm run test:security
```

### Ports

- **5173**: React Router development server (Vite)
- **8787**: Wrangler dev server (if using `wrangler dev`)
- **3000**: Alternative dev server port

## Troubleshooting

If you encounter issues:
1. Rebuild the container: Command Palette → "Dev Containers: Rebuild Container"
2. Check the output logs in VS Code's integrated terminal
3. Ensure Docker is running on your system