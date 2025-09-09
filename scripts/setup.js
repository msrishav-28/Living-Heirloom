#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Time Capsule Generator...\n');

// Create .env.local if it doesn't exist
const envPath = path.join(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  const envExample = fs.readFileSync(path.join(process.cwd(), '.env.example'), 'utf8');
  fs.writeFileSync(envPath, envExample);
  console.log('✅ Created .env.local from template');
} else {
  console.log('ℹ️  .env.local already exists');
}

// Create public directory structure
const publicDirs = [
  'public/icons',
  'public/models',
  'public/audio'
];

publicDirs.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

// Create PWA icons placeholder
const iconSizes = [192, 512];
iconSizes.forEach(size => {
  const iconPath = path.join(process.cwd(), `public/pwa-${size}x${size}.png`);
  if (!fs.existsSync(iconPath)) {
    // Create a simple placeholder SVG that can be converted to PNG
    const svgContent = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#8B5CF6"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size/3}" fill="white" opacity="0.9"/>
  <text x="${size/2}" y="${size/2 + 10}" text-anchor="middle" fill="#8B5CF6" font-size="${size/8}" font-family="serif">TC</text>
</svg>`;
    fs.writeFileSync(iconPath.replace('.png', '.svg'), svgContent);
    console.log(`✅ Created icon placeholder: pwa-${size}x${size}.svg`);
  }
});

// Create manifest.json
const manifestPath = path.join(process.cwd(), 'public/manifest.json');
if (!fs.existsSync(manifestPath)) {
  const manifest = {
    name: "Time Capsule - Preserve Your Voice",
    short_name: "Time Capsule",
    description: "An emotionally intelligent app for preserving voices and stories across time",
    theme_color: "#8B5CF6",
    background_color: "#FEFEFE",
    display: "standalone",
    orientation: "portrait",
    scope: "/",
    start_url: "/",
    icons: [
      {
        src: "pwa-192x192.svg",
        sizes: "192x192",
        type: "image/svg+xml"
      },
      {
        src: "pwa-512x512.svg", 
        sizes: "512x512",
        type: "image/svg+xml"
      }
    ]
  };
  
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('✅ Created PWA manifest.json');
}

console.log('\n🎉 Setup complete! Next steps:');
console.log('1. Add your ElevenLabs API key to .env.local (optional)');
console.log('2. Run: npm install');
console.log('3. Run: npm run dev');
console.log('4. Open: http://localhost:3000\n');

console.log('🏆 Ready for hackathon submission!');
console.log('📝 Features enabled:');
console.log('   • GPT-OSS 20B LLM (browser-based)');
console.log('   • Voice cloning & preservation');
console.log('   • AI-powered adaptive interviews');
console.log('   • End-to-end encryption');
console.log('   • PWA offline support');
console.log('   • Beautiful Lovable UI');
console.log('   • CodeRabbit quality standards\n');

console.log('🤖 AI Models:');
console.log('   • Llama-3.2-3B-Instruct (WebLLM)');
console.log('   • ElevenLabs Voice Cloning');
console.log('   • Emotional Intelligence Analysis');
console.log('   • Multilingual Support\n');