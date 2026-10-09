/**
 * Data Manager Module - Handles data loading, saving, filtering, and CRUD operations
 */
class DataManager {
    constructor() {
        this.decks = [];
        this.allCategories = new Set();
        this.allHashtags = new Set();
        this.currentSearchQuery = '';
        this.showOnlyFavorites = false;
        this.storageMode = 'local';
    }

    // Environment detection
    detectEnvironment() {
        const isLocal = window.location.protocol === 'file:' || 
                       window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
        
        const isGitHubPages = window.location.hostname.includes('github.io');
        
        if (isGitHubPages) {
            this.storageMode = 'web';
        } else if (isLocal) {
            this.storageMode = 'local';
        } else {
            this.storageMode = 'web';
        }
        
        this.updateStorageUI();
    }
    
    updateStorageUI() {
        const storageChip = document.getElementById('storageChip');
        
        if (storageChip) {
            if (this.storageMode === 'web') {
                storageChip.textContent = 'Web';
                storageChip.className = 'storage-chip web';
            } else {
                storageChip.textContent = 'Local';
                storageChip.className = 'storage-chip local';
            }
        }
    }

    // Data loading
    async loadData() {
        try {
            if (this.storageMode === 'local') {
                await this.loadFromFile();
            } else {
                this.loadFromStorage();
            }
        } catch (error) {
            console.log('Error loading data, using defaults:', error);
            this.initializeDefaultData();
        }
        
        this.updateCollections();
    }

    async loadFromFile() {
        try {
            const response = await fetch('./vault.json');
            if (response.ok) {
                const data = await response.json();
                this.decks = data.decks || [];
            } else {
                throw new Error('Failed to load vault.json');
            }
        } catch (error) {
            console.log('Could not load vault.json, checking localStorage...');
            this.loadFromStorage();
        }
    }

    loadFromStorage() {
        const savedData = localStorage.getItem('cardToolsData');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                this.decks = data.decks || [];
            } catch (error) {
                console.error('Error parsing saved data:', error);
                this.initializeDefaultData();
            }
        } else {
            this.initializeDefaultData();
        }
    }

    // Data saving
    saveData() {
        const data = {
            decks: this.decks,
            lastModified: new Date().toISOString()
        };
        
        localStorage.setItem('cardToolsData', JSON.stringify(data));
        console.log('💾 Data saved to localStorage');
    }

    // Initialize default data
    initializeDefaultData() {
        this.decks = [
            {
                id: 'recursos-generales-default',
                name: 'Recursos Generales',
                layout: 'grid',
                cards: [
                    {
                        id: 'react-default',
                        title: 'React',
                        description: 'Biblioteca de JavaScript para construir interfaces de usuario',
                        category: 'frontend',
                        mainUrl: 'https://reactjs.org',
                        hashtags: ['javascript', 'ui', 'components'],
                        favorite: false,
                        urls: [
                            {
                                url: 'https://reactjs.org',
                                description: 'Sitio oficial',
                                bookmark: false,
                                like: false
                            }
                        ]
                    }
                ]
            }
        ];
    }

    // Update collections for filters
    updateCollections() {
        this.allCategories.clear();
        this.allHashtags.clear();
        
        this.decks.forEach(deck => {
            deck.cards.forEach(card => {
                if (card.category) {
                    this.allCategories.add(card.category);
                }
                if (card.hashtags) {
                    card.hashtags.forEach(tag => this.allHashtags.add(tag));
                }
            });
        });
    }

    // Filtering
    filterCards(cards) {
        return cards.filter(card => {
            if (this.showOnlyFavorites && !card.favorite) {
                return false;
            }
            
            if (this.currentSearchQuery) {
                const searchFields = [
                    card.title,
                    card.description,
                    card.notes,
                    card.category,
                    ...(card.hashtags || [])
                ].filter(Boolean).join(' ').toLowerCase();
                
                return searchFields.includes(this.currentSearchQuery);
            }
            
            return true;
        });
    }

    // Getters
    getDecks() {
        return this.decks;
    }

    getFilteredDecks() {
        return this.decks.map(deck => ({
            ...deck,
            cards: this.filterCards(deck.cards)
        })).filter(deck => deck.cards.length > 0);
    }

    getAllCategories() {
        return this.allCategories;
    }

    getAllHashtags() {
        return this.allHashtags;
    }

    findCard(cardId) {
        for (const deck of this.decks) {
            const card = deck.cards.find(c => c.id === cardId);
            if (card) return card;
        }
        return null;
    }

    findDeck(deckId) {
        return this.decks.find(d => d.id === deckId);
    }

    // Search and filters
    setSearchQuery(query) {
        this.currentSearchQuery = query.toLowerCase();
    }

    toggleFavoritesFilter() {
        this.showOnlyFavorites = !this.showOnlyFavorites;
    }

    // CRUD operations
    addDeck(deck) {
        this.decks.push(deck);
        this.updateCollections();
        this.saveData();
    }

    updateDeck(deckId, updates) {
        const deck = this.findDeck(deckId);
        if (deck) {
            Object.assign(deck, updates);
            this.updateCollections();
            this.saveData();
        }
    }

    deleteDeck(deckId) {
        this.decks = this.decks.filter(d => d.id !== deckId);
        this.updateCollections();
        this.saveData();
    }

    addCard(deckId, card) {
        const deck = this.findDeck(deckId);
        if (deck) {
            deck.cards.push(card);
            this.updateCollections();
            this.saveData();
        }
    }

    updateCard(cardId, updates) {
        const card = this.findCard(cardId);
        if (card) {
            Object.assign(card, updates);
            this.updateCollections();
            this.saveData();
        }
    }

    deleteCard(cardId) {
        for (const deck of this.decks) {
            const cardIndex = deck.cards.findIndex(c => c.id === cardId);
            if (cardIndex !== -1) {
                deck.cards.splice(cardIndex, 1);
                this.updateCollections();
                this.saveData();
                break;
            }
        }
    }

    toggleCardFavorite(cardId) {
        const card = this.findCard(cardId);
        if (card) {
            card.favorite = !card.favorite;
            this.saveData();
        }
    }

    toggleDeckLayout(deckId) {
        const deck = this.findDeck(deckId);
        if (deck) {
            deck.layout = deck.layout === 'horizontal' ? 'grid' : 'horizontal';
            this.saveData();
        }
    }

    // Get cards that need image scraping (including those with placeholder/low-quality images)
    getCardsNeedingImages() {
        const cardsNeedingImages = [];
        
        this.decks.forEach(deck => {
            deck.cards.forEach(card => {
                if (card.mainUrl) {
                    // Include cards with no image OR with Google favicon (low quality)
                    if (!card.coverImage || 
                        card.coverImage.includes('google.com/s2/favicons') ||
                        card.coverImage.includes('cdn.jsdelivr.net/npm/simple-icons')) {
                        cardsNeedingImages.push(card);
                    }
                }
            });
        });
        
        return cardsNeedingImages;
    }

    // Update card image after scraping
    updateCardImage(cardId, imageUrl) {
        const card = this.findCard(cardId);
        if (card) {
            card.coverImage = imageUrl;
            this.saveData();
            return true;
        }
        return false;
    }
}

// Export for use in main script
window.DataManager = DataManager;
