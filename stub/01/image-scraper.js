/**
 * Image Scraper Module - High-quality image fetching for Card-Tools
 * Handles curated images, SEO metadata, manifest.json, and favicon fallbacks
 */
class ImageScraper {
    constructor() {
        this.validationTimeout = 3000;
    }

    // Main entry point for fetching resource logos
    async fetchResourceLogo(url) {
        if (!url) return null;
        
        try {
            const domain = new URL(url).origin;
            const hostname = new URL(url).hostname;
            
            console.log(`🔍 [SCRAPE] Fetching logo for: ${hostname}`);
            
            // Try curated high-quality images first
            const curatedImage = await this.getCuratedImage(hostname);
            if (curatedImage) {
                console.log(`✅ [CURATED] Found curated image for ${hostname}`);
                return curatedImage;
            }
            
            // Try SEO/social media images + manifest.json
            const seoImage = await this.getSEOImage(url);
            if (seoImage) {
                console.log(`✅ [SEO] Found SEO image for ${hostname}`);
                return seoImage;
            }
            
            // Fallback to favicon hierarchy
            const faviconUrls = [
                `${domain}/favicon-192x192.png`,
                `${domain}/favicon-180x180.png`,
                `${domain}/favicon-96x96.png`,
                `${domain}/favicon-32x32.png`,
                `${domain}/favicon.png`,
                `${domain}/favicon.ico`
            ];
            
            for (const faviconUrl of faviconUrls) {
                if (await this.validateImage(faviconUrl)) {
                    console.log(`✅ [FAVICON] Found favicon for ${hostname}`);
                    return faviconUrl;
                }
            }
            
            // Last resort: Google favicon service
            const googleFavicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
            console.log(`🔄 [FALLBACK] Using Google favicon for ${hostname}`);
            return googleFavicon;
            
        } catch (error) {
            console.log(`❌ [SCRAPE] Error fetching logo for ${url}:`, error);
            return null;
        }
    }

    // Get curated high-quality images for popular tools (updated URLs)
    async getCuratedImage(hostname) {
        const curatedImages = {
            'reactjs.org': 'https://reactjs.org/logo-og.png',
            'vuejs.org': 'https://vuejs.org/images/logo.png',
            'angular.io': 'https://angular.io/assets/images/logos/angular/angular.png',
            'svelte.dev': 'https://svelte.dev/svelte-logo-horizontal.svg',
            'nextjs.org': 'https://nextjs.org/static/favicon/android-chrome-192x192.png',
            'nuxtjs.org': 'https://nuxtjs.org/icon.png',
            'gatsbyjs.com': 'https://www.gatsbyjs.com/Gatsby-Monogram.svg',
            'vitejs.dev': 'https://vitejs.dev/logo.svg',
            'webpack.js.org': 'https://webpack.js.org/assets/icon-square-big.svg',
            'rollupjs.org': 'https://rollupjs.org/logo.svg',
            'parceljs.org': 'https://parceljs.org/assets/parcel.png',
            // Updated URLs (fixed hash/path issues)
            'tailwindcss.com': 'https://tailwindcss.com/favicons/apple-touch-icon.png',
            'getbootstrap.com': 'https://getbootstrap.com/docs/5.3/assets/brand/bootstrap-logo.svg',
            'bulma.io': 'https://bulma.io/images/bulma-logo.png',
            'fontawesome.com': 'https://fontawesome.com/images/logos/fa-brands.svg',
            'fonts.google.com': 'https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg',
            'figma.com': 'https://cdn.sanity.io/images/599r6htc/localized/46a76c802176eb17b04e12108de7e7e0f3736dc6-1024x1024.png',
            'sketch.com': 'https://www.sketch.com/images/press/sketch-press-kit/app-icons/sketch-mac-icon@2x.png',
            'adobe.com': 'https://www.adobe.com/content/dam/cc/icons/Adobe_Corporate_Horizontal_Red_HEX.svg',
            'canva.com': 'https://static.canva.com/static/images/canva_logo_white-d0dcf2b86b.svg',
            'github.com': 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
            'gitlab.com': 'https://about.gitlab.com/images/press/logo/png/gitlab-logo-gray-rgb.png',
            'bitbucket.org': 'https://wac-cdn.atlassian.com/dam/jcr:8b4c0c0f-4b0a-4b0a-8b4c-0c0f4b0a4b0a/bitbucket-icon-gradient-blue.svg',
            'netlify.com': 'https://www.netlify.com/v3/img/components/logomark.png',
            'vercel.com': 'https://assets.vercel.com/image/upload/front/favicon/vercel/180x180.png',
            'heroku.com': 'https://brand.heroku.com/static/media/heroku-logo-stroke.aa0b53be.svg',
            // Additional high-quality sources
            'jsonplaceholder.typicode.com': 'https://jsonplaceholder.typicode.com/favicon.ico',
            'postman.com': 'https://www.postman.com/web-assets/icons/icon-96x96.png',
            'insomnia.rest': 'https://insomnia.rest/images/insomnia-logo.svg'
        };
        
        const imageUrl = curatedImages[hostname];
        if (imageUrl && await this.validateImage(imageUrl)) {
            return imageUrl;
        }
        
        return null;
    }

    // Get SEO/social media images from page metadata + manifest.json
    async getSEOImage(url) {
        try {
            // First try manifest.json for PWA icons (high quality)
            const manifestImage = await this.getManifestImage(url);
            if (manifestImage) {
                console.log(`✅ [MANIFEST] Found PWA icon for ${new URL(url).hostname}`);
                return manifestImage;
            }
            
            // Then try SEO metadata
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            const data = await response.json();
            const html = data.contents;
            
            // Parse HTML for meta tags
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Try different meta tag selectors in priority order
            const selectors = [
                'meta[property="og:image"]',
                'meta[name="twitter:image"]',
                'meta[property="twitter:image"]',
                'meta[name="og:image"]',
                'meta[property="og:image:secure_url"]'
            ];
            
            for (const selector of selectors) {
                const metaTag = doc.querySelector(selector);
                if (metaTag) {
                    let imageUrl = metaTag.getAttribute('content');
                    if (imageUrl) {
                        // Convert relative URLs to absolute
                        if (!imageUrl.startsWith('http')) {
                            imageUrl = new URL(imageUrl, url).href;
                        }
                        
                        if (await this.validateImage(imageUrl)) {
                            return imageUrl;
                        }
                    }
                }
            }
            
        } catch (error) {
            console.log(`❌ [SEO] Error scraping SEO image for ${url}:`, error);
        }
        
        return null;
    }

    // Get high-quality icons from manifest.json (PWA apps)
    async getManifestImage(url) {
        try {
            const domain = new URL(url).origin;
            const manifestUrl = `${domain}/manifest.json`;
            
            const response = await fetch(manifestUrl);
            if (!response.ok) return null;
            
            const manifest = await response.json();
            if (manifest.icons && manifest.icons.length > 0) {
                // Find largest icon (prefer 192x192 or higher)
                const largeIcon = manifest.icons
                    .filter(icon => icon.sizes)
                    .sort((a, b) => {
                        const sizeA = parseInt(a.sizes.split('x')[0]);
                        const sizeB = parseInt(b.sizes.split('x')[0]);
                        return sizeB - sizeA;
                    })[0];
                
                if (largeIcon) {
                    let iconUrl = largeIcon.src;
                    if (!iconUrl.startsWith('http')) {
                        iconUrl = new URL(iconUrl, domain).href;
                    }
                    
                    if (await this.validateImage(iconUrl)) {
                        return iconUrl;
                    }
                }
            }
        } catch (error) {
            // Manifest not found or invalid - this is normal
        }
        
        return null;
    }

    // Validate if image URL is accessible
    async validateImage(url) {
        return new Promise((resolve) => {
            const img = new Image();
            const timeout = setTimeout(() => {
                resolve(false);
            }, this.validationTimeout);
            
            img.onload = () => {
                clearTimeout(timeout);
                resolve(true);
            };
            
            img.onerror = () => {
                clearTimeout(timeout);
                resolve(false);
            };
            
            img.src = url;
        });
    }

    // Batch process multiple URLs
    async batchFetchLogos(urls) {
        const results = {};
        
        for (const url of urls) {
            try {
                const logo = await this.fetchResourceLogo(url);
                if (logo) {
                    results[url] = logo;
                }
            } catch (error) {
                console.log(`❌ [BATCH] Failed to fetch logo for ${url}:`, error);
            }
        }
        
        return results;
    }
}

// Export for use in main script
window.ImageScraper = ImageScraper;
