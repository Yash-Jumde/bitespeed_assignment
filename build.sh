#!/bin/bash

# Print current directory
echo "Current directory: $(pwd)"
echo "Listing files:"
ls -la

# Clean any existing build
echo "Cleaning existing dist directory..."
rm -rf dist

# Install dependencies
echo "Installing dependencies..."
npm install

# Run TypeScript compilation
echo "Compiling TypeScript..."
npx tsc

# Check if dist directory exists
echo "Checking dist directory..."
if [ -d "dist" ]; then
  echo "dist directory created successfully:"
  ls -la dist
else
  echo "ERROR: dist directory was not created!"
  exit 1
fi

# Check if the main file exists
if [ -f "dist/app.js" ]; then
  echo "dist/app.js exists!"
else
  echo "ERROR: dist/app.js was not generated!"
  exit 1
fi

echo "Build completed successfully!"