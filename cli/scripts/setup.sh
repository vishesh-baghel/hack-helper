#!/bin/bash

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the project
echo "Building project..."
npm run build

echo "Setup complete! You can now run the CLI with:"
echo "node dist/index.js"
echo ""
echo "To use the CLI globally during development, run:"
echo "npm link"
