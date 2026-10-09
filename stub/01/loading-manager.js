/**
 * Loading Manager Module - Handles loading sequences and states
 */
class LoadingManager {
    constructor(uiManager, dataManager, imageScraper) {
        this.uiManager = uiManager;
        this.dataManager = dataManager;
        this.imageScraper = imageScraper;
    }

    // Main loading sequence: skeleton → data → placeholders → scraping
    async initializeApp() {
        try {
            // Step 1: Show skeleton loading
            console.log('🔄 [LOAD] Step 1: Showing skeleton');
            this.uiManager.showSkeletonLoading();
            
            // Step 2: Load data
            console.log('🔄 [LOAD] Step 2: Loading data');
            await this.dataManager.loadData();
            
            // Step 3: Render with placeholders (immediate)
            console.log('🔄 [LOAD] Step 3: Rendering with placeholders');
            this.uiManager.render();
            this.uiManager.updateFilters();
            
            // Step 4: Start image scraping (background)
            console.log('🔄 [LOAD] Step 4: Starting background image scraping');
            setTimeout(() => {
                this.startImageScraping().catch(error => {
                    console.error('❌ [SCRAPE] Could not persist scraped images:', error);
                });
            }, 500); // Small delay to ensure UI is rendered
            
        } catch (error) {
            console.error('❌ [LOAD] Error during initialization:', error);
            this.uiManager.showError(error);
        }
    }

    // Background image scraping process
    async startImageScraping() {
        console.log('🚀 [SCRAPE] Starting background image scraping...');
        
        const cardsNeedingImages = this.dataManager.getCardsNeedingImages();
        
        if (cardsNeedingImages.length === 0) {
            console.log('✅ [SCRAPE] No cards need image scraping');
            return;
        }

        console.log(`🔍 [SCRAPE] Found ${cardsNeedingImages.length} cards needing images`);
        
        const imageUpdates = [];
        console.log(`🔄 [SCRAPE] Processing ${cardsNeedingImages.length} cards that need images`);

        for (const card of cardsNeedingImages) {
            try {
                console.log(`🔍 [SCRAPE] Processing: ${card.title}`);
                
                const newImageUrl = await this.imageScraper.fetchResourceLogo(card.mainUrl);
                
                if (newImageUrl && newImageUrl !== card.coverImage) {
                    imageUpdates.push({ cardId: card.id, imageUrl: newImageUrl });
                    this.uiManager.updateCardImage(card.id, newImageUrl);
                    
                    console.log(`✅ [SCRAPE] Updated ${card.title} with new image: ${newImageUrl}`);
                } else {
                    console.log(`⚠️ [SCRAPE] No better image found for ${card.title} (current: ${card.coverImage})`);
                }
                
                // Small delay between requests to be respectful
                await this.delay(300);
                
            } catch (error) {
                console.log(`❌ [SCRAPE] Failed to process ${card.title}:`, error);
            }
        }

        if (imageUpdates.length > 0) {
            try {
                this.dataManager.updateCardImages(imageUpdates);
            } catch (error) {
                this.uiManager.render();
                throw error;
            }
        }
        
        console.log('✅ [SCRAPE] Background image scraping completed!');
    }

    // Utility delay function
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Force refresh all images (manual trigger)
    async refreshAllImages() {
        console.log('🔄 [REFRESH] Force refreshing all images...');
        
        this.uiManager.showLoading('Actualizando imágenes...');
        
        try {
            // Get all cards with URLs
            const allCards = [];
            this.dataManager.getDecks().forEach(deck => {
                deck.cards.forEach(card => {
                    if (card.mainUrl) {
                        allCards.push(card);
                    }
                });
            });

            const imageUpdates = [];
            for (const card of allCards) {
                try {
                    const newImageUrl = await this.imageScraper.fetchResourceLogo(card.mainUrl);
                    
                    if (newImageUrl) {
                        imageUpdates.push({ cardId: card.id, imageUrl: newImageUrl });
                        this.uiManager.updateCardImage(card.id, newImageUrl);
                    }
                    
                    await this.delay(100);
                    
                } catch (error) {
                    console.log(`❌ [REFRESH] Failed to refresh ${card.title}:`, error);
                }
            }

            if (imageUpdates.length > 0) {
                try {
                    this.dataManager.updateCardImages(imageUpdates);
                } catch (error) {
                    this.uiManager.render();
                    throw error;
                }
            }
            
        } finally {
            this.uiManager.hideLoading();
        }
        
        console.log('✅ [REFRESH] Image refresh completed!');
    }

    // Check if scraping is in progress
    isScrapingInProgress() {
        return this.scrapingInProgress || false;
    }
}

// Export for use in main script
window.LoadingManager = LoadingManager;
