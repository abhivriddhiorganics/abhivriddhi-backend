#!/usr/bin/env bash
# exit on error
set -o errexit

# Install dependencies
npm install

# Install Chrome for Puppeteer/WhatsApp
echo "Installing Chrome for Puppeteer..."
npx puppeteer browsers install chrome

# The browser is installed to ~/.cache/puppeteer by default.
# Render native doesn't always find it, so we'll leave it to the code to find it in the cache.
echo "Build complete."
