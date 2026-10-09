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
        this.storageNotice = '';
        this.storageKey = 'cardToolsData';
        this.legacyStorageKey = 'cardtools-data';
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
        if (this.loadFromStorage()) {
            this.updateCollections();
            return;
        }

        await this.loadFromFile();
        this.updateCollections();
    }

    async loadFromFile() {
        let response;
        try {
            response = await fetch('./vault.json');
        } catch (error) {
            console.warn('No se pudo acceder a vault.json; se usarán los datos iniciales mínimos.', error);
            this.initializeDefaultData();
            return;
        }

        if (!response.ok) {
            console.warn(`No se pudo cargar vault.json (HTTP ${response.status}); se usarán los datos iniciales mínimos.`);
            this.initializeDefaultData();
            return;
        }

        let data;
        try {
            data = await response.json();
        } catch (error) {
            throw new Error('vault.json contiene JSON inválido; no se cargaron datos de reemplazo.', { cause: error });
        }

        this.validateData(data, 'vault.json');
        this.decks = data.decks;
        console.info('Datos iniciales cargados desde vault.json');
    }

    loadFromStorage() {
        const savedData = localStorage.getItem(this.storageKey);
        const legacyData = localStorage.getItem(this.legacyStorageKey);

        if (savedData !== null) {
            const data = this.parseData(savedData, this.storageKey);

            if (legacyData !== null) {
                try {
                    const legacy = this.parseData(legacyData, this.legacyStorageKey);
                    if (JSON.stringify(data.decks) !== JSON.stringify(legacy.decks)) {
                        throw new Error(
                            `Hay dos copias distintas (${this.storageKey} y ${this.legacyStorageKey}). Se conservaron ambas; respáldalas y elige cuál restaurar.`
                        );
                    }

                    this.storageNotice = `Las claves ${this.storageKey} y ${this.legacyStorageKey} contienen los mismos decks; ambas copias se conservaron.`;
                } catch (error) {
                    if (error.message.startsWith('Hay dos copias distintas')) throw error;
                    console.warn(`No se pudo validar la copia ${this.legacyStorageKey}; se conserva sin modificar.`, error);
                    this.storageNotice = `Se cargó ${this.storageKey}. Existe una copia ${this.legacyStorageKey} que no se pudo validar y fue conservada.`;
                }
            }

            this.decks = data.decks;
            return true;
        }

        if (legacyData === null) return false;

        const data = this.parseData(legacyData, this.legacyStorageKey);
        this.decks = data.decks;
        this.saveData();
        console.info(`Datos migrados desde ${this.legacyStorageKey}; la clave antigua se conserva.`);
        this.storageNotice = `Datos migrados desde ${this.legacyStorageKey}. La copia original se conserva en el navegador.`;
        return true;
    }

    parseData(serializedData, source) {
        let data;
        try {
            data = JSON.parse(serializedData);
        } catch (error) {
            throw new Error(`Los datos de ${source} contienen JSON inválido. Se conservaron sin cambios.`, { cause: error });
        }

        this.validateData(data, source);
        return data;
    }

    validateData(data, source) {
        if (!data || !Array.isArray(data.decks)) {
            throw new Error(`Los datos de ${source} no tienen una lista válida de decks.`);
        }

        for (const [deckIndex, deck] of data.decks.entries()) {
            if (!deck || typeof deck !== 'object' || !Array.isArray(deck.cards)) {
                throw new Error(`Los datos de ${source} contienen un deck inválido en la posición ${deckIndex}.`);
            }

            if (deck.cards.some(card => !card || typeof card !== 'object')) {
                throw new Error(`Los datos de ${source} contienen una tarjeta inválida en el deck ${deckIndex}.`);
            }
        }
    }

    // Data saving
    saveData() {
        const data = {
            decks: this.decks,
            lastModified: new Date().toISOString(),
            version: '1.0.0'
        };

        try {
            const serializedData = JSON.stringify(data);
            localStorage.setItem(this.storageKey, serializedData);
            console.log(`💾 Datos guardados en localStorage (${this.storageKey})`);
            return true;
        } catch (error) {
            console.error('No se pudieron guardar los datos en localStorage:', error);
            alert('No se pudieron guardar los cambios en este navegador. Conserva una copia de seguridad y revisa el espacio disponible.');
            throw error;
        }
    }

    getStorageNotice() {
        return this.storageNotice;
    }

    persistMutation(mutation) {
        const previousDecks = JSON.stringify(this.decks);

        try {
            mutation();
            this.updateCollections();
            return this.saveData();
        } catch (error) {
            this.decks = JSON.parse(previousDecks);
            this.updateCollections();
            throw error;
        }
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
        })).filter(deck => deck.cards.length > 0 ||
            (!this.currentSearchQuery && !this.showOnlyFavorites));
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
        return this.persistMutation(() => this.decks.push(deck));
    }

    updateDeck(deckId, updates) {
        const deck = this.findDeck(deckId);
        if (deck) {
            return this.persistMutation(() => Object.assign(deck, updates));
        }
        return false;
    }

    deleteDeck(deckId) {
        if (!this.findDeck(deckId)) return false;
        return this.persistMutation(() => {
            this.decks = this.decks.filter(d => d.id !== deckId);
        });
    }

    addCard(deckId, card) {
        const deck = this.findDeck(deckId);
        if (deck) {
            return this.persistMutation(() => deck.cards.push(card));
        }
        return false;
    }

    updateCard(cardId, updates) {
        const card = this.findCard(cardId);
        if (card) {
            return this.persistMutation(() => Object.assign(card, updates));
        }
        return false;
    }

    deleteCard(cardId) {
        const deck = this.decks.find(item => item.cards.some(card => card.id === cardId));
        if (!deck) return false;
        return this.persistMutation(() => {
            deck.cards = deck.cards.filter(card => card.id !== cardId);
        });
    }

    toggleCardFavorite(cardId) {
        const card = this.findCard(cardId);
        if (card) {
            return this.persistMutation(() => {
                card.favorite = !card.favorite;
            });
        }
        return false;
    }

    toggleDeckLayout(deckId) {
        const deck = this.findDeck(deckId);
        if (deck) {
            return this.persistMutation(() => {
                deck.layout = deck.layout === 'horizontal' ? 'grid' : 'horizontal';
            });
        }
        return false;
    }

    toggleUrlFlag(cardId, url, flag) {
        const card = this.findCard(cardId);
        const urlEntry = card?.urls?.find(item => item.url === url);
        if (!urlEntry || !['bookmark', 'like'].includes(flag)) return false;

        return this.persistMutation(() => {
            urlEntry[flag] = !urlEntry[flag];
        });
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
        return this.updateCardImages([{ cardId, imageUrl }]);
    }

    updateCardImages(imageUpdates) {
        const validUpdates = imageUpdates.filter(({ cardId }) => this.findCard(cardId));
        if (validUpdates.length === 0) return false;

        return this.persistMutation(() => {
            validUpdates.forEach(({ cardId, imageUrl }) => {
                const card = this.findCard(cardId);
                card.coverImage = imageUrl;
            });
        });
    }
}

// Export for use in main script
window.DataManager = DataManager;
