#!/bin/bash
# Validation script for dev container setup

echo "🔍 Validating Trail Counter Dev Container Setup"
echo "================================================"

# Check if devcontainer.json exists
if [ -f ".devcontainer/devcontainer.json" ]; then
    echo "✅ devcontainer.json found"
else
    echo "❌ devcontainer.json not found"
    exit 1
fi

# Check if Node.js version requirement is met (18+)
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version | sed 's/v//')
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d. -f1)
    if [ "$MAJOR_VERSION" -ge 18 ]; then
        echo "✅ Node.js version $NODE_VERSION (meets requirement >=18)"
    else
        echo "❌ Node.js version $NODE_VERSION (requires >=18)"
    fi
else
    echo "❌ Node.js not found"
fi

# Check if npm is available
if command -v npm >/dev/null 2>&1; then
    NPM_VERSION=$(npm --version)
    echo "✅ npm version $NPM_VERSION"
else
    echo "❌ npm not found"
fi

# Check if wrangler is available (should be in node_modules)
if [ -f "node_modules/.bin/wrangler" ]; then
    echo "✅ Wrangler CLI available in node_modules"
elif command -v wrangler >/dev/null 2>&1; then
    echo "✅ Wrangler CLI available globally"
else
    echo "⚠️  Wrangler CLI not found (will be available after npm install)"
fi

# Check if package.json has required scripts
if [ -f "package.json" ]; then
    if grep -q '"dev":' package.json; then
        echo "✅ dev script found in package.json"
    else
        echo "❌ dev script not found in package.json"
    fi
    
    if grep -q '"cf-typegen":' package.json; then
        echo "✅ cf-typegen script found in package.json"
    else
        echo "❌ cf-typegen script not found in package.json"
    fi
else
    echo "❌ package.json not found"
fi

echo ""
echo "🚀 Setup validation complete!"
echo ""
echo "Next steps:"
echo "1. Open repository in VS Code"
echo "2. Install Dev Containers extension if not already installed"
echo "3. Use Command Palette -> 'Dev Containers: Reopen in Container'"
echo "4. Wait for container to build and dependencies to install"
echo "5. Run 'npm run dev' to start development server"