/**
 * UI Manager Module - Handles rendering, DOM manipulation, and visual states
 */
class UIManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.isSimplifiedView = false;
    }

    // Show skeleton loading state
    showSkeletonLoading() {
        const container = document.getElementById('decksContainer');
        container.innerHTML = `
            <div class="skeleton-loading">
                <div class="skeleton-deck">
                    <div class="skeleton-header"></div>
                    <div class="skeleton-cards">
                        ${Array(6).fill(0).map(() => `
                            <div class="skeleton-card">
                                <div class="skeleton-banner"></div>
                                <div class="skeleton-content">
                                    <div class="skeleton-title"></div>
                                    <div class="skeleton-description"></div>
                                    <div class="skeleton-tags"></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // Get category-based placeholder icon from Simple Icons CDN
    getCategoryIcon(category) {
        const categoryIcons = {
            'frontend': 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/react.svg',
            'backend': 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/nodejs.svg',
            'database': 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/postgresql.svg',
            'design': 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/figma.svg',
            'tools': 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/visualstudiocode.svg',
            'hosting': 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/netlify.svg',
            'api': 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/postman.svg',
            'css': 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/css3.svg',
            'javascript': 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/javascript.svg',
            'framework': 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/vuedotjs.svg'
        };
        
        return categoryIcons[category.toLowerCase()] || 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/github.svg';
    }

    // Render all decks
    render() {
        const container = document.getElementById('decksContainer');
        const decks = this.dataManager.getFilteredDecks();
        
        if (decks.length === 0) {
            container.innerHTML = '<div class="empty-state">No hay decks disponibles</div>';
            return;
        }

        container.innerHTML = decks.map(deck => this.renderDeck(deck)).join('');
    }

    // Render single deck
    renderDeck(deck) {
        const filteredCards = this.dataManager.filterCards(deck.cards);
        const isHorizontal = deck.layout === 'horizontal';
        
        return `
            <div class="deck" data-deck-id="${deck.id}">
                <div class="deck-header">
                    <div class="deck-info">
                        <h2 class="deck-title">${deck.name}</h2>
                        <span class="deck-count">${filteredCards.length} recursos</span>
                    </div>
                    <div class="deck-actions">
                        <button class="deck-action-btn" onclick="app.toggleDeckLayout('${deck.id}')" title="Cambiar layout">
                            <i class="fas ${isHorizontal ? 'fa-th' : 'fa-list'}"></i>
                        </button>
                        <button class="deck-action-btn" onclick="app.addCard('${deck.id}')" title="Añadir recurso">
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
                <div class="cards-container ${isHorizontal ? 'deck-horizontal' : ''}" data-deck-id="${deck.id}">
                    ${filteredCards.map(card => this.renderCard(card, deck.id)).join('')}
                </div>
            </div>
        `;
    }

    // Render single card with immediate placeholder
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
        
        // Always use placeholder initially, scraping will replace later
        const imageSource = card.coverImage || this.getCategoryIcon(card.category);
        
        return `
            <div class="${cardClass}" data-card-id="${card.id}" data-deck-id="${deckId}" onclick="app.showCardDetail('${card.id}')">
                <div class="card-cover">
                    <img src="${imageSource}" alt="${card.title}" class="${card.coverImage ? '' : 'category-icon'}" onerror="this.src='${this.getCategoryIcon(card.category)}'">
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

    // Update specific card image in DOM without full re-render
    updateCardImage(cardId, newImageUrl) {
        const cardElement = document.querySelector(`[data-card-id="${cardId}"]`);
        if (cardElement) {
            const imgElement = cardElement.querySelector('.card-cover img');
            if (imgElement) {
                imgElement.src = newImageUrl;
                imgElement.classList.remove('category-icon');
                console.log(`🎨 [UI] Updated card ${cardId} image`);
            }
        }
    }

    // Toggle simplified view
    toggleSimplifiedView() {
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

    // Update filters UI
    updateFilters() {
        this.updateCategoryFilters();
        this.updateHashtagFilters();
    }

    updateCategoryFilters() {
        const container = document.getElementById('categoryFilters');
        if (!container) return;
        
        const categories = this.dataManager.getAllCategories();
        container.innerHTML = Array.from(categories).map(category => 
            `<span class="filter-tag" onclick="app.toggleCategoryFilter('${category}')">${category}</span>`
        ).join('');
    }

    updateHashtagFilters() {
        const container = document.getElementById('hashtagFilters');
        if (!container) return;
        
        const hashtags = this.dataManager.getAllHashtags();
        container.innerHTML = Array.from(hashtags).slice(0, 20).map(hashtag => 
            `<span class="filter-tag" onclick="app.toggleHashtagFilter('${hashtag}')">#${hashtag}</span>`
        ).join('');
    }

    // Show loading indicator
    showLoading(message = 'Cargando...') {
        const loader = document.createElement('div');
        loader.id = 'loading-indicator';
        loader.className = 'loading-indicator';
        loader.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-message">${message}</div>
        `;
        document.body.appendChild(loader);
    }

    // Hide loading indicator
    hideLoading() {
        const loader = document.getElementById('loading-indicator');
        if (loader) {
            loader.remove();
        }
    }
}

// Export for use in main script
window.UIManager = UIManager;
