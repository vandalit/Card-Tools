class ResourceManager {
    constructor() {
        this.decks = [];
        this.allCategories = new Set();
        this.allHashtags = new Set();
        this.currentSearchQuery = '';
        this.currentDeck = null;
        this.currentCard = null;
        this.showOnlyFavorites = false;
        this.isSimplifiedView = false;
        this.isLocalEnvironment = false;
        
        this.init();
    }

    async init() {
        this.detectEnvironment();
        await this.loadData();
        this.bindEvents();
        this.render();
        this.updateFilters();
    }

    detectEnvironment() {
        this.isLocal = window.location.protocol === 'file:' || 
                      window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';
        
        this.isGitHubPages = window.location.hostname.includes('github.io');
        
        if (this.isGitHubPages) {
            this.storageMode = 'web';
        } else if (this.isLocal) {
            this.storageMode = 'local';
        } else {
            this.storageMode = 'web';
        }
        
        this.updateStorageUI();
    }
    
    updateStorageUI() {
        const storageChip = document.getElementById('storageChip');
        
        if (storageChip) {
            if (this.isGitHubPages) {
                storageChip.textContent = 'Web';
                storageChip.className = 'storage-chip web';
            } else if (this.isLocal) {
                storageChip.textContent = 'Local';
                storageChip.className = 'storage-chip local';
            }
        }
    }

    // Data Loading
    async loadData() {
        try {
            if (this.storageMode === 'local') {
                const response = await fetch('./vault.json');
                if (response.ok) {
                    const data = await response.json();
                    this.decks = data.decks || [];
                } else {
                    this.initializeDefaultData();
                }
            } else {
                const savedData = localStorage.getItem('cardtools-data');
                if (savedData) {
                    const data = JSON.parse(savedData);
                    this.decks = data.decks || [];
                } else {
                    this.initializeDefaultData();
                }
            }
        } catch (error) {
            console.error('Error loading data:', error);
            this.initializeDefaultData();
        }
        
        this.updateCategoriesAndHashtags();
    }

    initializeDefaultData() {
        this.decks = [
            {
                id: 'recursos-generales-default',
                name: 'Recursos Generales',
                description: 'Recursos principales para desarrollo y diseño',
                createdAt: new Date().toISOString(),
                order: 0,
                layout: 'horizontal',
                cards: []
            },
            {
                id: 'demo-deck-001',
                name: 'Frameworks & Librerías',
                description: 'Frameworks y librerías populares para desarrollo',
                layout: 'column',
                order: 1,
                cards: [
                    {
                        id: 'demo-card-001',
                        title: 'React',
                        category: 'desarrollo',
                        description: 'Biblioteca de JavaScript para construir interfaces de usuario',
                        notes: 'Desarrollado por Facebook, ideal para aplicaciones SPA y componentes reutilizables.',
                        hashtags: ['react', 'javascript', 'frontend', 'spa'],
                        mainUrl: 'https://reactjs.org',
                        coverImage: 'https://reactjs.org/logo-og.png',
                        urls: [
                            { description: 'Documentación', url: 'https://reactjs.org/docs', bookmark: true, like: false },
                            { description: 'GitHub', url: 'https://github.com/facebook/react', bookmark: false, like: true }
                        ],
                        favorite: true,
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: 'demo-card-002',
                        title: 'Tailwind CSS',
                        category: 'diseño',
                        description: 'Framework CSS utility-first para desarrollo rápido de interfaces',
                        notes: 'Excelente para prototipado rápido y diseños consistentes.',
                        hashtags: ['tailwind', 'css', 'frontend', 'utility'],
                        mainUrl: 'https://tailwindcss.com',
                        coverImage: 'https://tailwindcss.com/_next/static/media/tailwindcss-mark.3c5441fc7a190fb1800d4a5c7f07ba4b1345a9c8.svg',
                        urls: [
                            { description: 'Documentación', url: 'https://tailwindcss.com/docs', bookmark: true, like: true },
                            { description: 'Playground', url: 'https://play.tailwindcss.com', bookmark: true, like: false }
                        ],
                        favorite: true,
                        createdAt: new Date().toISOString()
                    }
                ],
                createdAt: new Date().toISOString()
            },
            {
                id: 'demo-deck-002',
                name: 'Herramientas de Diseño',
                description: 'Herramientas esenciales para diseñadores',
                layout: 'column',
                order: 2,
                cards: [
                    {
                        id: 'demo-card-003',
                        title: 'Figma',
                        category: 'diseño',
                        description: 'Herramienta de diseño colaborativo basada en la web',
                        notes: 'Ideal para diseño de interfaces, prototipado y colaboración en equipo.',
                        hashtags: ['figma', 'design', 'ui', 'prototyping'],
                        mainUrl: 'https://figma.com',
                        coverImage: 'https://cdn.sanity.io/images/599r6htc/localized/46a76c802176eb17b04e12108de7e7e0f3736dc6-1024x1024.png',
                        urls: [
                            { description: 'Web App', url: 'https://figma.com', bookmark: true, like: true },
                            { description: 'Community', url: 'https://figma.com/community', bookmark: true, like: false }
                        ],
                        favorite: true,
                        createdAt: new Date().toISOString()
                    }
                ],
                createdAt: new Date().toISOString()
            }
        ];
        
        this.saveData();
    }

    saveData() {
        try {
            const dataToSave = {
                decks: this.decks,
                lastModified: new Date().toISOString(),
                version: '1.0.0'
            };
            
            if (this.storageMode === 'web') {
                const dataString = JSON.stringify(dataToSave);
                
                // Check if localStorage has enough space
                try {
                    localStorage.setItem('cardtools-data', dataString);
                } catch (quotaError) {
                    console.error('LocalStorage quota exceeded:', quotaError);
                    alert('Espacio de almacenamiento lleno. Considera exportar y limpiar datos antiguos.');
                    return false;
                }
            }
            return true;
        } catch (error) {
            console.error('Error saving data:', error);
            alert('Error al guardar los datos. Los cambios pueden perderse.');
            return false;
        }
    }

    updateCategoriesAndHashtags() {
        this.allCategories.clear();
        this.allHashtags.clear();
        
        this.decks.forEach(deck => {
            deck.cards?.forEach(card => {
                if (card.category) {
                    this.allCategories.add(card.category);
                }
                if (card.hashtags) {
                    card.hashtags.forEach(tag => {
                        this.allHashtags.add(tag.replace('#', ''));
                    });
                }
            });
        });
    }

    generateId() {
        return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    // Rendering
    render() {
        this.renderDecks();
    }

    renderDecks() {
        const container = document.getElementById('decksContainer');
        if (!container) return;
        
        const sortedDecks = [...this.decks].sort((a, b) => {
            if (a.name === 'Recursos Generales') return -1;
            if (b.name === 'Recursos Generales') return 1;
            if (a.order !== b.order) return (a.order || 0) - (b.order || 0);
            return new Date(a.createdAt) - new Date(b.createdAt);
        });
        
        container.innerHTML = sortedDecks.map(deck => this.renderDeck(deck)).join('');
    }

    renderDeck(deck) {
        const filteredCards = this.filterCards(deck.cards || []);
        const layout = deck.layout || 'column';
        
        return `
            <div class="deck" data-deck-id="${deck.id}">
                <div class="deck-header">
                    <div class="deck-info">
                        <h2>${deck.name}</h2>
                        <p>${deck.description || ''}</p>
                    </div>
                    <div class="deck-actions">
                        <button class="deck-action-btn" onclick="app.toggleDeckLayout('${deck.id}')" title="Cambiar layout">
                            <i class="fas ${layout === 'horizontal' ? 'fa-grip-lines' : 'fa-grip-vertical'}"></i>
                        </button>
                        <button class="deck-action-btn" onclick="app.showCardModal('${deck.id}')" title="Agregar recurso">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="deck-action-btn" onclick="app.editDeck('${deck.id}')" title="Editar deck">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="deck-action-btn" onclick="app.deleteDeck('${deck.id}')" title="Eliminar deck">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="cards-container ${layout === 'horizontal' ? 'deck-horizontal' : ''}" data-deck-id="${deck.id}">
                    ${filteredCards.map(card => this.renderCard(card, deck.id)).join('')}
                </div>
            </div>
        `;
    }

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

    renderCard(card, deckId) {
        const hashtags = (card.hashtags || []).map(tag => 
            `<span class="hashtag">#${tag}</span>`
        ).join('');
        
        const urls = (card.urls || []).slice(0, 3).map(urlObj => `
            <div class="card-url">
                <a href="${urlObj.url}" target="_blank" rel="noopener">${urlObj.description}</a>
                <div class="url-actions">
                    <button class="url-action ${urlObj.bookmark ? 'active' : ''}" 
                            onclick="app.toggleUrlBookmark('${card.id}', '${urlObj.url}')" 
                            title="Bookmark">
                        <i class="fas fa-bookmark"></i>
                    </button>
                    <button class="url-action like ${urlObj.like ? 'active' : ''}" 
                            onclick="app.toggleUrlLike('${card.id}', '${urlObj.url}')" 
                            title="Like">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        const cardClass = this.isSimplifiedView ? 'card simplified' : 'card';
        
        return `
            <div class="${cardClass}" data-card-id="${card.id}" data-deck-id="${deckId}" onclick="app.showCardDetail('${card.id}')">
                <div class="card-cover">
                    ${card.coverImage ? 
                        `<img src="${card.coverImage}" alt="${card.title}" onerror="this.parentElement.innerHTML='<i class=\\"fas fa-tools placeholder-icon\\"></i>'">` :
                        '<i class="fas fa-tools placeholder-icon"></i>'
                    }
                    ${card.favorite ? '<div class="card-favorite"><i class="fas fa-star"></i></div>' : ''}
                </div>
                <div class="card-content">
                    <div class="card-header">
                        <div>
                            <h3 class="card-title">${card.title}</h3>
                            <span class="card-category">${card.category}</span>
                        </div>
                    </div>
                    <p class="card-description">${card.description || ''}</p>
                    <div class="card-hashtags">${hashtags}</div>
                    ${urls ? `<div class="card-urls">${urls}</div>` : ''}
                </div>
            </div>
        `;
    }

    updateFilters() {
        this.updateCategoryFilters();
        this.updateHashtagFilters();
    }

    updateCategoryFilters() {
        const container = document.getElementById('categoryFilters');
        if (!container) return;
        
        container.innerHTML = Array.from(this.allCategories).map(category => 
            `<span class="filter-tag" onclick="app.toggleCategoryFilter('${category}')">${category}</span>`
        ).join('');
    }

    updateHashtagFilters() {
        const container = document.getElementById('hashtagFilters');
        if (!container) return;
        
        container.innerHTML = Array.from(this.allHashtags).slice(0, 10).map(hashtag => 
            `<span class="filter-tag" onclick="app.toggleHashtagFilter('${hashtag}')">#${hashtag}</span>`
        ).join('');
    }

    toggleCategoryFilter(category) {
        // Implementar filtro por categoría
        console.log('Filter by category:', category);
    }

    toggleHashtagFilter(hashtag) {
        // Implementar filtro por hashtag
        console.log('Filter by hashtag:', hashtag);
    }

    // Web Scraping for Logo/Favicon
    async fetchResourceLogo(url) {
        try {
            const domain = new URL(url).origin;
            const hostname = new URL(url).hostname;
            
            // Priority list for favicon URLs
            const faviconUrls = [
                `${domain}/favicon-192x192.png`,
                `${domain}/favicon-180x180.png`,
                `${domain}/favicon-96x96.png`,
                `${domain}/apple-touch-icon.png`,
                `${domain}/favicon.ico`,
                `${domain}/favicon.png`,
                `${domain}/favicon.svg`
            ];

            // Try each favicon URL
            for (const faviconUrl of faviconUrls) {
                try {
                    const response = await fetch(faviconUrl, { 
                        method: 'HEAD', 
                        mode: 'no-cors',
                        cache: 'force-cache'
                    });
                    if (response.ok || response.type === 'opaque') {
                        return faviconUrl;
                    }
                } catch (e) {
                    continue;
                }
            }

            // Fallback: use Google's favicon service
            return `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
            
        } catch (error) {
            console.error('Error fetching logo:', error);
            return `https://www.google.com/s2/favicons?domain=example.com&sz=128`;
        }
    }

    // Enhanced scraping for additional metadata
    async scrapeResourceMetadata(url) {
        try {
            // Use a CORS proxy service for scraping
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            
            if (!response.ok) {
                throw new Error('Failed to fetch metadata');
            }
            
            const data = await response.json();
            const parser = new DOMParser();
            const doc = parser.parseFromString(data.contents, 'text/html');
            
            const metadata = {
                title: this.extractTitle(doc),
                description: this.extractDescription(doc),
                logo: await this.fetchResourceLogo(url)
            };
            
            return metadata;
        } catch (error) {
            console.error('Error scraping metadata:', error);
            return {
                title: '',
                description: '',
                logo: await this.fetchResourceLogo(url)
            };
        }
    }

    extractTitle(doc) {
        const selectors = [
            'meta[property="og:title"]',
            'meta[name="twitter:title"]',
            'title',
            'h1'
        ];
        
        for (const selector of selectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const content = element.getAttribute('content') || element.textContent;
                if (content && content.trim()) {
                    return content.trim();
                }
            }
        }
        return '';
    }

    extractDescription(doc) {
        const selectors = [
            'meta[name="description"]',
            'meta[property="og:description"]',
            'meta[name="twitter:description"]'
        ];
        
        for (const selector of selectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const content = element.getAttribute('content');
                if (content && content.trim()) {
                    return content.trim();
                }
            }
        }
        return '';
    }

    // Auto-fill resource data from URL
    async autoFillResourceData(url) {
        const titleField = document.getElementById('cardTitle');
        const descriptionField = document.getElementById('cardDescription');
        
        if (!titleField.value || !descriptionField.value) {
            try {
                const loadingIndicator = this.showLoadingIndicator();
                const metadata = await this.scrapeResourceMetadata(url);
                
                if (!titleField.value && metadata.title) {
                    titleField.value = metadata.title;
                }
                
                if (!descriptionField.value && metadata.description) {
                    descriptionField.value = metadata.description;
                }
                
                this.hideLoadingIndicator(loadingIndicator);
            } catch (error) {
                console.error('Error auto-filling data:', error);
            }
        }
    }

    showLoadingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'loading-indicator';
        indicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Obteniendo información...';
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--bg-card);
            color: var(--text-primary);
            padding: 10px 15px;
            border-radius: 8px;
            border: 1px solid var(--border-color);
            z-index: 1001;
            box-shadow: var(--shadow);
        `;
        document.body.appendChild(indicator);
        return indicator;
    }

    hideLoadingIndicator(indicator) {
        if (indicator && indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
        }
    }

    // Event Binding
    bindEvents() {
        // Header actions
        const createDeckBtn = document.getElementById('createDeckBtn');
        const dataMenuBtn = document.getElementById('dataMenuBtn');
        const favoriteFilterBtn = document.getElementById('favoriteFilterBtn');
        
        if (createDeckBtn) createDeckBtn.addEventListener('click', () => this.showDeckModal());
        if (dataMenuBtn) dataMenuBtn.addEventListener('click', () => this.toggleDataMenu());
        if (favoriteFilterBtn) favoriteFilterBtn.addEventListener('click', () => this.toggleFavoriteFilter());
        
        // View mode toggle
        const viewModeBtn = document.getElementById('viewModeBtn');
        if (viewModeBtn) viewModeBtn.addEventListener('click', () => this.toggleViewMode());
        
        // Modal events
        const closeDeckModal = document.getElementById('closeDeckModal');
        const cancelDeckBtn = document.getElementById('cancelDeckBtn');
        const closeCardModal = document.getElementById('closeCardModal');
        const cancelCardBtn = document.getElementById('cancelCardBtn');
        const closeDetailModal = document.getElementById('closeDetailModal');
        
        if (closeDeckModal) closeDeckModal.addEventListener('click', () => this.hideDeckModal());
        if (cancelDeckBtn) cancelDeckBtn.addEventListener('click', () => this.hideDeckModal());
        if (closeCardModal) closeCardModal.addEventListener('click', () => this.hideCardModal());
        if (cancelCardBtn) cancelCardBtn.addEventListener('click', () => this.hideCardModal());
        if (closeDetailModal) closeDetailModal.addEventListener('click', () => this.hideDetailModal());
        
        // Form submissions
        const deckForm = document.getElementById('deckForm');
        const cardForm = document.getElementById('cardForm');
        
        if (deckForm) deckForm.addEventListener('submit', (e) => this.handleDeckSubmit(e));
        if (cardForm) cardForm.addEventListener('submit', (e) => this.handleCardSubmit(e));
        
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentSearchQuery = e.target.value.toLowerCase();
                this.render();
            });
        }
        
        // Close modals on outside click
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideAllModals();
            }
        });
        
        // Auto-fetch metadata when URL is entered
        const cardMainUrl = document.getElementById('cardMainUrl');
        if (cardMainUrl) {
            cardMainUrl.addEventListener('blur', async (e) => {
                if (e.target.value && this.isValidUrl(e.target.value)) {
                    await this.autoFillResourceData(e.target.value);
                }
            });
        }
    }

    // Toggle favorite filter
    toggleFavoriteFilter() {
        this.showOnlyFavorites = !this.showOnlyFavorites;
        const btn = document.getElementById('favoriteFilterBtn');
        if (btn) {
            btn.classList.toggle('active', this.showOnlyFavorites);
        }
        this.render();
    }

    // Toggle simplified view mode
    toggleViewMode() {
        this.isSimplifiedView = !this.isSimplifiedView;
        const btn = document.getElementById('viewModeBtn');
        const icon = btn.querySelector('i');
        
        if (this.isSimplifiedView) {
            icon.className = 'fas fa-th-large';
            btn.title = 'Vista completa';
            document.body.classList.add('simplified-view');
        } else {
            icon.className = 'fas fa-list';
            btn.title = 'Vista simplificada';
            document.body.classList.remove('simplified-view');
        }
        
        this.render();
    }

    // Toggle data menu
    toggleDataMenu() {
        const dataMenu = document.querySelector('.dropdown');
        if (dataMenu) {
            dataMenu.classList.toggle('active');
        }
    }

    // Modal management
    showDeckModal() {
        const modal = document.getElementById('deckModal');
        if (modal) {
            modal.classList.add('active');
        }
    }

    hideDeckModal() {
        const modal = document.getElementById('deckModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    showCardModal(deckId = null) {
        const modal = document.getElementById('cardModal');
        const title = document.getElementById('cardModalTitle');
        
        if (this.currentEditingCard) {
            title.textContent = 'Editar Recurso';
            this.populateCardForm(this.currentEditingCard);
        } else {
            title.textContent = 'Crear Nuevo Recurso';
            this.resetCardForm();
        }
        
        modal.dataset.deckId = deckId;
        modal.classList.add('active');
    }

    hideCardModal() {
        const modal = document.getElementById('cardModal');
        modal.classList.remove('active');
        this.currentEditingCard = null;
        this.resetCardForm();
    }

    hideDetailModal() {
        const modal = document.getElementById('cardDetailModal');
        if (modal) {
            modal.classList.remove('active');
        }
        this.currentDetailCard = null;
    }

    hideAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => modal.classList.remove('active'));
        this.currentEditingCard = null;
        this.currentEditingDeck = null;
        this.currentDetailCard = null;
        
        // Reset modal titles
        document.getElementById('deckModalTitle').textContent = 'Crear Nuevo Deck';
        document.getElementById('cardModalTitle').textContent = 'Crear Nuevo Recurso';
    }

    // Form management
    resetCardForm() {
        const form = document.getElementById('cardForm');
        if (form) {
            form.reset();
        }
    }

    populateCardForm(card) {
        document.getElementById('cardTitle').value = card.title || '';
        document.getElementById('cardMainUrl').value = card.mainUrl || '';
        document.getElementById('cardCategory').value = card.category || '';
        document.getElementById('cardDescription').value = card.description || '';
        document.getElementById('cardNotes').value = card.notes || '';
        document.getElementById('cardHashtags').value = (card.hashtags || []).map(tag => `#${tag}`).join(' ');
        document.getElementById('cardFavorite').checked = card.favorite || false;
        
        const urlsText = (card.urls || []).map(urlObj => 
            `${urlObj.description}: ${urlObj.url}`
        ).join('\n');
        document.getElementById('cardUrls').value = urlsText;
    }

    // Handle form submissions
    handleDeckSubmit(e) {
        e.preventDefault();
        
        const deckName = document.getElementById('deckName').value.trim();
        const deckDescription = document.getElementById('deckDescription').value.trim();
        
        if (!deckName) {
            alert('El nombre del deck es obligatorio');
            return;
        }
        
        if (this.currentEditingDeck) {
            // Update existing deck
            this.currentEditingDeck.name = deckName;
            this.currentEditingDeck.description = deckDescription;
            this.currentEditingDeck = null;
        } else {
            // Create new deck
            const deckData = {
                id: this.generateId(),
                name: deckName,
                description: deckDescription,
                layout: 'column',
                order: this.decks.length,
                cards: [],
                createdAt: new Date().toISOString()
            };
            this.decks.push(deckData);
        }
        
        if (this.saveData()) {
            this.render();
            this.updateFilters();
            this.hideDeckModal();
            
            // Reset form and modal title
            document.getElementById('deckForm').reset();
            document.getElementById('deckModalTitle').textContent = 'Crear Nuevo Deck';
        }
    }

    async handleCardSubmit(e) {
        e.preventDefault();
        
        const modal = document.getElementById('cardModal');
        const deckId = modal.dataset.deckId;
        
        // Validation
        const title = document.getElementById('cardTitle').value.trim();
        const mainUrl = document.getElementById('cardMainUrl').value.trim();
        const category = document.getElementById('cardCategory').value;
        
        if (!title) {
            alert('El título del recurso es obligatorio');
            return;
        }
        
        if (!mainUrl) {
            alert('La URL principal es obligatoria');
            return;
        }
        
        if (!this.isValidUrl(mainUrl)) {
            alert('La URL principal no es válida');
            return;
        }
        
        if (!category) {
            alert('La categoría es obligatoria');
            return;
        }
        
        if (!deckId) {
            alert('Error: No se puede determinar el deck de destino');
            return;
        }
        
        try {
            // Show loading indicator
            const loadingIndicator = this.showLoadingIndicator();
            
            // Parse URLs with validation
            const urlsText = document.getElementById('cardUrls').value;
            const urls = [];
            
            if (urlsText.trim()) {
                const urlLines = urlsText.split('\n').filter(line => line.trim());
                for (const line of urlLines) {
                    const colonIndex = line.indexOf(':');
                    if (colonIndex > 0) {
                        const description = line.substring(0, colonIndex).trim();
                        const url = line.substring(colonIndex + 1).trim();
                        
                        if (this.isValidUrl(url)) {
                            urls.push({
                                description: description || 'Link',
                                url: url,
                                bookmark: false,
                                like: false
                            });
                        } else {
                            console.warn(`Invalid URL skipped: ${url}`);
                        }
                    } else if (this.isValidUrl(line.trim())) {
                        urls.push({
                            description: 'Link',
                            url: line.trim(),
                            bookmark: false,
                            like: false
                        });
                    }
                }
            }
            
            // Get cover image from scraping
            let coverImage = '';
            try {
                coverImage = await this.fetchResourceLogo(mainUrl);
            } catch (error) {
                console.error('Error fetching logo:', error);
                coverImage = `https://www.google.com/s2/favicons?domain=${new URL(mainUrl).hostname}&sz=128`;
            }
            
            const cardData = {
                id: this.currentEditingCard?.id || this.generateId(),
                title: title,
                mainUrl: mainUrl,
                category: category,
                description: document.getElementById('cardDescription').value.trim(),
                notes: document.getElementById('cardNotes').value.trim(),
                hashtags: document.getElementById('cardHashtags').value
                    .split(/[\s,]+/)
                    .map(tag => tag.replace('#', '').trim())
                    .filter(tag => tag && tag.length > 0),
                coverImage: coverImage,
                urls: urls,
                favorite: document.getElementById('cardFavorite').checked,
                createdAt: this.currentEditingCard?.createdAt || new Date().toISOString()
            };
            
            if (this.currentEditingCard) {
                this.updateCard(cardData);
            } else {
                this.addCard(deckId, cardData);
            }
            
            this.hideLoadingIndicator(loadingIndicator);
            this.hideCardModal();
            
        } catch (error) {
            console.error('Error saving card:', error);
            alert('Error al guardar el recurso. Por favor, inténtalo de nuevo.');
        }
    }

    // Card management
    addCard(deckId, cardData) {
        const deck = this.decks.find(d => d.id === deckId);
        if (deck) {
            if (!deck.cards) deck.cards = [];
            deck.cards.push(cardData);
            this.saveData();
            this.updateCategoriesAndHashtags();
            this.render();
            this.updateFilters();
        }
    }

    updateCard(cardData) {
        for (const deck of this.decks) {
            const cardIndex = deck.cards?.findIndex(c => c.id === cardData.id);
            if (cardIndex !== -1) {
                deck.cards[cardIndex] = cardData;
                this.saveData();
                this.updateCategoriesAndHashtags();
                this.render();
                this.updateFilters();
                break;
            }
        }
    }

    // URL actions
    toggleUrlBookmark(cardId, url) {
        if (event) event.stopPropagation();
        
        const card = this.findCard(cardId);
        if (!card || !card.urls) {
            console.error('Card or URLs not found:', cardId);
            return;
        }
        
        const urlObj = card.urls.find(u => u.url === url);
        if (urlObj) {
            urlObj.bookmark = !urlObj.bookmark;
            if (this.saveData()) {
                this.render();
                
                // Update detail modal if open
                if (this.currentDetailCard && this.currentDetailCard.id === cardId) {
                    this.showCardDetail(cardId);
                }
            }
        } else {
            console.error('URL not found in card:', url);
        }
    }

    toggleUrlLike(cardId, url) {
        if (event) event.stopPropagation();
        
        const card = this.findCard(cardId);
        if (!card || !card.urls) {
            console.error('Card or URLs not found:', cardId);
            return;
        }
        
        const urlObj = card.urls.find(u => u.url === url);
        if (urlObj) {
            urlObj.like = !urlObj.like;
            if (this.saveData()) {
                this.render();
                
                // Update detail modal if open
                if (this.currentDetailCard && this.currentDetailCard.id === cardId) {
                    this.showCardDetail(cardId);
                }
            }
        } else {
            console.error('URL not found in card:', url);
        }
    }

    findCard(cardId) {
        for (const deck of this.decks) {
            const card = deck.cards?.find(c => c.id === cardId);
            if (card) return card;
        }
        return null;
    }

    // Toggle deck layout between horizontal and column
    toggleDeckLayout(deckId) {
        const deck = this.decks.find(d => d.id === deckId);
        if (deck) {
            deck.layout = deck.layout === 'horizontal' ? 'column' : 'horizontal';
            this.saveData();
            this.render();
        }
    }

    editDeck(deckId) {
        const deck = this.decks.find(d => d.id === deckId);
        if (!deck) {
            alert('Deck no encontrado');
            return;
        }
        
        // Populate deck form for editing
        document.getElementById('deckName').value = deck.name;
        document.getElementById('deckDescription').value = deck.description || '';
        
        // Set editing mode
        this.currentEditingDeck = deck;
        
        // Update modal title
        document.getElementById('deckModalTitle').textContent = 'Editar Deck';
        
        this.showDeckModal();
    }

    deleteDeck(deckId) {
        const deck = this.decks.find(d => d.id === deckId);
        if (!deck) {
            alert('Deck no encontrado');
            return;
        }
        
        const cardCount = deck.cards ? deck.cards.length : 0;
        const message = cardCount > 0 
            ? `¿Estás seguro de que quieres eliminar "${deck.name}"? Se eliminarán ${cardCount} recursos.`
            : `¿Estás seguro de que quieres eliminar "${deck.name}"?`;
            
        if (confirm(message)) {
            this.decks = this.decks.filter(d => d.id !== deckId);
            if (this.saveData()) {
                this.updateCategoriesAndHashtags();
                this.render();
                this.updateFilters();
            }
        }
    }

    editCard(cardId) {
        const card = this.findCard(cardId);
        if (!card) {
            alert('Recurso no encontrado');
            return;
        }
        
        this.currentEditingCard = card;
        
        // Find the deck containing this card
        const deck = this.decks.find(d => d.cards?.some(c => c.id === cardId));
        
        this.showCardModal(deck?.id);
    }

    deleteCard(cardId) {
        const card = this.findCard(cardId);
        if (!card) {
            alert('Recurso no encontrado');
            return;
        }
        
        if (confirm(`¿Estás seguro de que quieres eliminar "${card.title}"?`)) {
            for (const deck of this.decks) {
                const cardIndex = deck.cards?.findIndex(c => c.id === cardId);
                if (cardIndex !== -1) {
                    deck.cards.splice(cardIndex, 1);
                    if (this.saveData()) {
                        this.updateCategoriesAndHashtags();
                        this.render();
                        this.updateFilters();
                    }
                    break;
                }
            }
        }
    }

    showCardDetail(cardId) {
        const card = this.findCard(cardId);
        if (!card) {
            console.error('Card not found:', cardId);
            return;
        }
        
        this.currentDetailCard = card;
        
        // Populate detail modal
        document.getElementById('detailTitle').textContent = card.title;
        document.getElementById('detailCategory').textContent = card.category;
        document.getElementById('detailDescription').textContent = card.description || 'Sin descripción';
        document.getElementById('detailNotes').textContent = card.notes || 'Sin notas';
        document.getElementById('detailMainUrl').href = card.mainUrl;
        document.getElementById('detailMainUrl').textContent = card.mainUrl;
        
        // Show/hide favorite star
        const favoriteEl = document.getElementById('detailFavorite');
        if (card.favorite) {
            favoriteEl.classList.remove('hidden');
        } else {
            favoriteEl.classList.add('hidden');
        }
        
        // Set background image
        const bgEl = document.getElementById('detailParallaxBg');
        if (card.coverImage) {
            bgEl.style.backgroundImage = `url(${card.coverImage})`;
        } else {
            bgEl.style.backgroundImage = 'none';
        }
        
        // Populate hashtags
        const hashtagsEl = document.getElementById('detailHashtags');
        hashtagsEl.innerHTML = (card.hashtags || []).map(tag => 
            `<span class="detail-hashtag">#${tag}</span>`
        ).join('');
        
        // Populate URLs
        const urlsEl = document.getElementById('detailUrls');
        urlsEl.innerHTML = (card.urls || []).map(urlObj => `
            <div class="detail-url">
                <a href="${urlObj.url}" target="_blank" rel="noopener">${urlObj.description}</a>
                <div class="detail-url-actions">
                    <button class="detail-url-action ${urlObj.bookmark ? 'active' : ''}" 
                            onclick="app.toggleUrlBookmark('${card.id}', '${urlObj.url}')" 
                            title="Bookmark">
                        <i class="fas fa-bookmark"></i>
                    </button>
                    <button class="detail-url-action like ${urlObj.like ? 'active' : ''}" 
                            onclick="app.toggleUrlLike('${card.id}', '${urlObj.url}')" 
                            title="Like">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        // Bind edit and delete buttons
        document.getElementById('editDetailBtn').onclick = () => {
            this.hideDetailModal();
            this.editCard(cardId);
        };
        
        document.getElementById('deleteDetailBtn').onclick = () => {
            this.hideDetailModal();
            this.deleteCard(cardId);
        };
        
        // Show modal
        document.getElementById('cardDetailModal').classList.add('active');
        
        // Setup parallax effects
        this.setupMouseParallax();
    }

    hideDetailModal() {
        document.getElementById('cardDetailModal').classList.remove('active');
        this.cleanupMouseParallax();
        this.currentDetailCard = null;
    }

    // Mouse Parallax Effects for Card Detail (Ana Cards style)
    setupMouseParallax() {
        const modal = document.getElementById('cardDetailModal');
        if (!modal || !modal.classList.contains('active')) return;
        
        // Clean up any existing handlers first
        this.cleanupMouseParallax();
        
        let ticking = false;
        
        const updateMouseParallax = (e) => {
            const cardContainer = modal.querySelector('.detail-card-container');
            const parallaxBg = modal.querySelector('.detail-parallax-bg');
            const categoryBadge = modal.querySelector('.detail-category-badge');
            const title = modal.querySelector('.detail-title');
            
            if (!cardContainer) return;
            
            const rect = cardContainer.getBoundingClientRect();
            const cardCenterX = rect.left + rect.width / 2;
            const cardCenterY = rect.top + rect.height / 2;
            
            // Calculate mouse position relative to card center (-1 to 1)
            const mouseXPercent = (e.clientX - cardCenterX) / (rect.width / 2);
            const mouseYPercent = (e.clientY - cardCenterY) / (rect.height / 2);
            
            // Clamp values to prevent extreme movements
            const clampedX = Math.max(-1, Math.min(1, mouseXPercent));
            const clampedY = Math.max(-1, Math.min(1, mouseYPercent));
            
            // Card container - subtle movement with 3D rotation
            const cardMoveX = clampedX * 12;
            const cardMoveY = clampedY * 12;
            const cardRotateX = clampedY * -5;
            const cardRotateY = clampedX * 5;
            
            cardContainer.style.transform = `translateX(${cardMoveX}px) translateY(${cardMoveY}px) rotateX(${cardRotateX}deg) rotateY(${cardRotateY}deg)`;
            
            // Background - opposite direction, more movement
            if (parallaxBg) {
                const bgMoveX = clampedX * -20;
                const bgMoveY = clampedY * -20;
                const bgScale = 1 + (Math.abs(clampedX) + Math.abs(clampedY)) * 0.03;
                
                parallaxBg.style.transform = `translateX(${bgMoveX}px) translateY(${bgMoveY}px) scale(${bgScale})`;
            }
            
            // Category badge - floating effect
            if (categoryBadge) {
                const badgeMoveX = clampedX * 8;
                const badgeMoveY = clampedY * 8;
                categoryBadge.style.transform = `translateX(${badgeMoveX}px) translateY(${badgeMoveY}px)`;
            }
            
            // Title - subtle floating
            if (title) {
                const titleMoveX = clampedX * 5;
                const titleMoveY = clampedY * 5;
                title.style.transform = `translateX(${titleMoveX}px) translateY(${titleMoveY}px)`;
            }
            
            ticking = false;
        };
        
        // Mouse move handler with throttling
        const handleMouseMove = (e) => {
            if (!ticking) {
                requestAnimationFrame(() => updateMouseParallax(e));
                ticking = true;
            }
        };
        
        // Mouse leave handler - reset positions
        const handleMouseLeave = () => {
            const cardContainer = modal.querySelector('.detail-card-container');
            const parallaxBg = modal.querySelector('.detail-parallax-bg');
            const categoryBadge = modal.querySelector('.detail-category-badge');
            const title = modal.querySelector('.detail-title');
            
            // Smooth return to center
            if (cardContainer) {
                cardContainer.style.transition = 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)';
                cardContainer.style.transform = 'translateX(0) translateY(0) rotateX(0) rotateY(0)';
            }
            
            if (parallaxBg) {
                parallaxBg.style.transition = 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)';
                parallaxBg.style.transform = 'translateX(0) translateY(0) scale(1)';
            }
            
            if (categoryBadge) {
                categoryBadge.style.transition = 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)';
                categoryBadge.style.transform = 'translateX(0) translateY(0)';
            }
            
            if (title) {
                title.style.transition = 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)';
                title.style.transform = 'translateX(0) translateY(0)';
            }
            
            // Clear transitions after animation
            setTimeout(() => {
                if (cardContainer) cardContainer.style.transition = '';
                if (parallaxBg) parallaxBg.style.transition = '';
                if (categoryBadge) categoryBadge.style.transition = '';
                if (title) title.style.transition = '';
            }, 600);
        };
        
        // Add event listeners to the modal container
        modal.addEventListener('mousemove', handleMouseMove);
        modal.addEventListener('mouseleave', handleMouseLeave);
        
        // Store handlers for cleanup
        this.mouseParallaxHandlers = {
            modal: modal,
            mousemove: handleMouseMove,
            mouseleave: handleMouseLeave
        };
    }

    // Cleanup parallax handlers
    cleanupMouseParallax() {
        if (this.mouseParallaxHandlers) {
            const { modal, mousemove, mouseleave } = this.mouseParallaxHandlers;
            if (modal) {
                modal.removeEventListener('mousemove', mousemove);
                modal.removeEventListener('mouseleave', mouseleave);
            }
            this.mouseParallaxHandlers = null;
        }
    }
}

// Initialize the app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new ResourceManager();
});
