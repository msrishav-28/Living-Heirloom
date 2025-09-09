#!/bin/bash

# Time Capsule - Production Deployment Script
echo "🚀 Deploying Time Capsule to Vercel..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run type checking
echo "🔍 Running type checks..."
npm run type-check
if [ $? -ne 0 ]; then
    echo "❌ Type checking failed. Please fix TypeScript errors before deploying."
    exit 1
fi

# Run linting
echo "🧹 Running linter..."
npm run lint
if [ $? -ne 0 ]; then
    echo "⚠️  Linting issues found. Consider fixing them before deploying."
fi

# Build the project
echo "🏗️  Building project..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix build errors before deploying."
    exit 1
fi

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
if command -v vercel &> /dev/null; then
    vercel --prod
    if [ $? -eq 0 ]; then
        echo "✅ Deployment successful!"
        echo ""
        echo "🎉 Time Capsule is now live!"
        echo "📊 Features deployed:"
        echo "   • GPT-OSS 20B LLM (browser-based)"
        echo "   • ElevenLabs Voice Cloning"
        echo "   • End-to-end Encryption"
        echo "   • PWA Support"
        echo "   • Beautiful Lovable UI"
        echo ""
        echo "🏆 Ready for hackathon judging!"
    else
        echo "❌ Deployment failed. Please check Vercel configuration."
        exit 1
    fi
else
    echo "❌ Vercel CLI not found. Please install it with: npm i -g vercel"
    exit 1
fi