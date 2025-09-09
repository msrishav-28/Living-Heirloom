# Living Heirloom - Deployment Guide

## Overview

Living Heirloom is a privacy-first web application that runs entirely in the browser. This guide covers deployment options and configuration for production environments.

## Prerequisites

- Node.js 18+ and npm
- Modern web server with HTTPS support
- (Optional) ElevenLabs API key for voice cloning

## Environment Configuration

### 1. Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Required for voice features
VITE_ELEVENLABS_API_KEY=your_api_key_here

# Optional: Customize AI model
VITE_AI_MODEL_NAME="Llama-3.2-3B-Instruct-q4f32_1-MLC"

# Optional: Feature flags
VITE_ENABLE_AI=true
VITE_ENABLE_VOICE_FEATURES=true
VITE_ENABLE_ANALYTICS=false
```

### 2. Build Configuration

For production builds:

```bash
# Install dependencies
npm install

# Build for production
npm run build

# The built files will be in the `dist` directory
```

## Deployment Options

### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
npm run deploy
```

Or connect your GitHub repository to Vercel for automatic deployments.

### Option 2: Netlify

1. Connect your repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables in Netlify dashboard

### Option 3: Static Hosting

Deploy the `dist` folder to any static hosting service:

- GitHub Pages
- AWS S3 + CloudFront
- Google Cloud Storage
- Azure Static Web Apps

### Option 4: Self-Hosted

Requirements:
- Web server (nginx, Apache, etc.)
- HTTPS certificate
- Proper CORS headers

#### Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL configuration
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # Security headers
    add_header Cross-Origin-Embedder-Policy require-corp;
    add_header Cross-Origin-Opener-Policy same-origin;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    
    # Serve static files
    location / {
        root /path/to/living-heirloom/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

## Security Considerations

### Required Headers

The application requires these headers for AI features:

```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

### HTTPS Requirement

- HTTPS is required for:
  - Microphone access (voice features)
  - Service Worker (PWA features)
  - Secure storage APIs

### Content Security Policy

Recommended CSP header:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' https://api.elevenlabs.io; worker-src 'self' blob:;
```

## Performance Optimization

### 1. Caching Strategy

```nginx
# Cache static assets aggressively
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Cache HTML with shorter duration
location ~* \.html$ {
    expires 1h;
    add_header Cache-Control "public, must-revalidate";
}
```

### 2. Compression

Enable gzip/brotli compression for:
- JavaScript files
- CSS files
- HTML files
- JSON files

### 3. CDN Configuration

If using a CDN:
- Enable compression
- Set appropriate cache headers
- Ensure CORS headers are preserved

## Monitoring and Analytics

### Error Monitoring

The application includes comprehensive error boundaries. To monitor errors in production:

1. Check browser console for client-side errors
2. Monitor network requests for API failures
3. Track user feedback for UX issues

### Performance Monitoring

Key metrics to monitor:
- Initial page load time
- AI model loading time
- Voice processing time
- Memory usage during extended sessions

## Troubleshooting

### Common Issues

#### AI Features Not Working
- Check browser compatibility (Chrome/Firefox recommended)
- Verify sufficient memory (4GB+ recommended)
- Check network connectivity
- Verify CORS headers are set correctly

#### Voice Features Not Working
- Verify HTTPS is enabled
- Check microphone permissions
- Verify ElevenLabs API key (if using)
- Check browser compatibility

#### Storage Issues
- Check available browser storage
- Verify IndexedDB is enabled
- Check for storage quota limits

### Browser Compatibility

Minimum requirements:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Performance Issues

If experiencing slow performance:
- Check available memory (4GB+ recommended for AI)
- Close other browser tabs
- Try disabling AI features temporarily
- Check network connection speed

## Maintenance

### Regular Tasks

1. **Monitor Storage Usage**
   - Check browser storage limits
   - Clean up old draft heirlooms
   - Monitor user feedback about storage issues

2. **Update Dependencies**
   - Keep dependencies updated for security
   - Test thoroughly after updates
   - Monitor for breaking changes

3. **Performance Monitoring**
   - Track loading times
   - Monitor memory usage
   - Check for memory leaks

### Backup and Recovery

Since the application stores data locally:
- Educate users about export functionality
- Provide clear instructions for data backup
- Consider implementing cloud sync (future feature)

## Support

### User Support

Common user issues and solutions:
- **Microphone not working**: Check permissions and HTTPS
- **AI loading slowly**: Explain one-time download process
- **Storage full**: Guide through cleanup process
- **Voice cloning failed**: Provide fallback options

### Technical Support

For technical issues:
1. Check browser console for errors
2. Verify environment configuration
3. Test with different browsers
4. Check network connectivity
5. Review server logs (if self-hosted)

## Scaling Considerations

### Traffic Growth
- Monitor bandwidth usage (AI models are large)
- Consider CDN for global distribution
- Plan for increased storage needs

### Feature Expansion
- Modular architecture supports new features
- Configuration system allows feature flags
- Error boundaries provide stability

## Security Updates

### Regular Security Tasks
1. Update dependencies regularly
2. Monitor for security advisories
3. Review and update CSP headers
4. Audit third-party integrations
5. Test security measures regularly

### Incident Response
1. Monitor error rates and user reports
2. Have rollback plan ready
3. Communicate with users during issues
4. Document and learn from incidents