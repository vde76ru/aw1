/**
 * Управление страницей магазина
 * Современный интерфейс с поддержкой двух видов отображения
 */

import { productService } from './services/ProductService.js';
import { showToast } from './utils.js';
import { addToCart } from './cart.js';

class ShopManager {
    constructor() {
        // Состояние
        this.products = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.totalProducts = 0;
        this.itemsPerPage = 20;
        this.currentView = 'grid';
        this.currentSort = 'relevance';
        this.searchQuery = '';
        this.filters = {};
        this.isLoading = false;
        
        // DOM элементы
        this.elements = {
            productsGrid: document.getElementById('productsGrid'),
            loadingOverlay: document.getElementById('loadingOverlay'),
            noProducts: document.getElementById('noProducts'),
            searchInput: document.getElementById('searchInput'),
            searchClear: document.getElementById('searchClear'),
            sortSelect: document.getElementById('sortSelect'),
            itemsPerPageSelect: document.getElementById('itemsPerPageSelect'),
            totalProductsCount: document.getElementById('totalProductsCount'),
            currentPage: document.getElementById('currentPage'),
            totalPages: document.getElementById('totalPages'),
            prevPage: document.getElementById('prevPage'),
            nextPage: document.getElementById('nextPage'),
            paginationNumbers: document.getElementById('paginationNumbers'),
            activeFilters: document.getElementById('activeFilters'),
            viewButtons: document.querySelectorAll('.view-btn'),
            quickViewModal: document.getElementById('quickViewModal'),
            quickViewContent: document.getElementById('quickViewContent'),
            closeQuickView: document.getElementById('closeQuickView')
        };
        
        this.init();
    }
    
    init() {
        this.loadFromStorage();
        this.bindEvents();
        this.loadProducts();
    }
    
    /**
     * Загрузка настроек из localStorage
     */
    loadFromStorage() {
        const savedView = localStorage.getItem('shopView');
        if (savedView) {
            this.currentView = savedView;
            this.updateViewButtons();
        }
        
        const savedItemsPerPage = localStorage.getItem('shopItemsPerPage');
        if (savedItemsPerPage) {
            this.itemsPerPage = parseInt(savedItemsPerPage);
            this.elements.itemsPerPageSelect.value = this.itemsPerPage;
        }
        
        const savedSort = localStorage.getItem('shopSort');
        if (savedSort) {
            this.currentSort = savedSort;
            this.elements.sortSelect.value = this.currentSort;
        }
    }
    
    /**
     * Привязка событий
     */
    bindEvents() {
        // Поиск
        let searchTimeout;
        this.elements.searchInput.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            this.elements.searchClear.style.display = value ? 'block' : 'none';
            
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchQuery = value;
                this.currentPage = 1;
                this.loadProducts();
            }, 300);
        });
        
        this.elements.searchClear.addEventListener('click', () => {
            this.elements.searchInput.value = '';
            this.elements.searchClear.style.display = 'none';
            this.searchQuery = '';
            this.currentPage = 1;
            this.loadProducts();
        });
        
        // Сортировка
        this.elements.sortSelect.addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            localStorage.setItem('shopSort', this.currentSort);
            this.currentPage = 1;
            this.loadProducts();
        });
        
        // Количество на странице
        this.elements.itemsPerPageSelect.addEventListener('change', (e) => {
            this.itemsPerPage = parseInt(e.target.value);
            localStorage.setItem('shopItemsPerPage', this.itemsPerPage);
            this.currentPage = 1;
            this.loadProducts();
        });
        
        // Переключение вида
        this.elements.viewButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                this.setView(view);
            });
        });
        
        // Пагинация
        this.elements.prevPage.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadProducts();
            }
        });
        
        this.elements.nextPage.addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.loadProducts();
            }
        });
        
        // Модальное окно
        this.elements.closeQuickView.addEventListener('click', () => {
            this.closeQuickView();
        });
        
        this.elements.quickViewModal.addEventListener('click', (e) => {
            if (e.target === this.elements.quickViewModal) {
                this.closeQuickView();
            }
        });
        
        // Делегирование событий для динамических элементов
        this.elements.productsGrid.addEventListener('click', (e) => {
            // Добавить в корзину
            if (e.target.closest('.btn-add-to-cart')) {
                const btn = e.target.closest('.btn-add-to-cart');
                const productId = btn.dataset.productId;
                const quantityInput = btn.closest('.product-card').querySelector('.quantity-input');
                const quantity = parseInt(quantityInput.value) || 1;
                this.handleAddToCart(productId, quantity);
            }
            
            // Изменение количества
            if (e.target.closest('.quantity-btn')) {
                const btn = e.target.closest('.quantity-btn');
                const input = btn.parentElement.querySelector('.quantity-input');
                const currentValue = parseInt(input.value) || 1;
                
                if (btn.classList.contains('quantity-minus')) {
                    input.value = Math.max(1, currentValue - 1);
                } else {
                    input.value = currentValue + 1;
                }
            }
            
            // Быстрый просмотр
            if (e.target.closest('.btn-quick-view')) {
                const btn = e.target.closest('.btn-quick-view');
                const productId = btn.dataset.productId;
                this.showQuickView(productId);
            }
        });
    }
    
    /**
     * Рендеринг товаров
     */
    async loadProducts() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoading();
        
        try {
            const params = {
                q: this.searchQuery,
                page: this.currentPage,
                limit: this.itemsPerPage,
                sort: this.currentSort,
                city_id: this.getCityId(),
                ...this.filters
            };
            
            const result = await productService.search(params);
            
            if (result.success) {
                this.products = result.data.products;
                this.totalProducts = result.data.total;
                this.totalPages = Math.ceil(this.totalProducts / this.itemsPerPage);
                
                this.renderProducts();
                this.updatePagination();
                this.updateInfo();
            } else {
                this.showNoProductsError(result.error);
            }
        } catch (error) {
            console.error('Error loading products:', error);
            this.showNoProductsError(error.message);
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }
    
    showNoProductsError(errorMessage = null) {
        this.products = [];
        this.totalProducts = 0;
        this.totalPages = 1;
        
        // Показываем блок "товары не найдены" ТОЛЬКО ОДИН РАЗ
        this.showNoProducts();
        
        // Обновляем интерфейс
        this.updatePagination();
        this.updateInfo();
        
        // Логируем ошибку, но НЕ показываем toast
        if (errorMessage) {
            console.warn('Поиск товаров:', errorMessage);
        }
    }
    

    
    /**
     * Рендеринг карточки товара
     */
    renderProductCard(product) {
        const isInStock = product.stock?.quantity > 0 || product.available;
        const price = this.formatPrice(product);
        const imageUrl = this.getProductImage(product);
        
        return `
            <div class="product-card" style="opacity: 0; transform: translateY(20px); transition: all 0.3s ease;">
                <div class="product-image-wrapper">
                    <img src="${imageUrl}" alt="${this.escapeHtml(product.name)}" class="product-image" loading="lazy">
                    
                    <div class="product-badges">
                        ${product._exact_match ? '<span class="product-badge badge-new">Точное совпадение</span>' : ''}
                        ${product.price?.has_special ? '<span class="product-badge badge-sale">Скидка</span>' : ''}
                        ${isInStock ? '<span class="product-badge badge-stock">В наличии</span>' : ''}
                    </div>
                    
                    <div class="product-actions">
                        <button class="action-btn btn-quick-view" data-product-id="${product.product_id}" title="Быстрый просмотр">
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <div class="product-info">
                    <div class="product-meta">
                        <span class="product-code">${product.external_id || product.sku || ''}</span>
                        ${product.brand_name ? `<span class="product-brand">${product.brand_name}</span>` : ''}
                    </div>
                    
                    <h3 class="product-name">
                        <a href="/shop/product?id=${product.external_id || product.product_id}">
                            ${product._formatted_name || this.escapeHtml(product.name)}
                        </a>
                    </h3>
                    
                    ${this.currentView === 'grid' ? this.renderProductFeatures(product) : ''}
                    
                    <div class="product-footer">
                        <div class="product-price-row">
                            <div>
                                ${price.old ? `<span class="product-price-old">${price.old}</span>` : ''}
                                <span class="product-price">${price.current}</span>
                            </div>
                        </div>
                        
                        <div class="product-availability ${isInStock ? 'in-stock' : 'out-of-stock'}">
                            <span class="availability-indicator"></span>
                            <span>${this.getAvailabilityText(product)}</span>
                        </div>
                        
                        <div class="product-buttons">
                            <div class="product-quantity">
                                <button class="quantity-btn quantity-minus">−</button>
                                <input type="number" class="quantity-input" value="1" min="1">
                                <button class="quantity-btn quantity-plus">+</button>
                            </div>
                            <button class="btn-add-to-cart" data-product-id="${product.product_id}" ${!isInStock ? 'disabled' : ''}>
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                </svg>
                                В корзину
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Рендеринг характеристик товара
     */
    renderProductFeatures(product) {
        const features = [];
        
        if (product.min_sale > 1) {
            features.push(`<div class="product-feature">Мин. ${product.min_sale} ${product.unit || 'шт'}</div>`);
        }
        
        if (product.series_name) {
            features.push(`<div class="product-feature">Серия: ${product.series_name}</div>`);
        }
        
        return features.length > 0 ? `<div class="product-features">${features.join('')}</div>` : '';
    }
    
    /**
     * Форматирование цены
     */
    formatPrice(product) {
        let current = 'По запросу';
        let old = null;
        
        if (product.price?.final) {
            current = `${product.price.final.toFixed(2)} ₽`;
            if (product.price.has_special && product.price.base) {
                old = `${product.price.base.toFixed(2)} ₽`;
            }
        } else if (product.base_price) {
            current = `${parseFloat(product.base_price).toFixed(2)} ₽`;
        }
        
        return { current, old };
    }
    
    /**
     * Получение изображения товара
     */
    getProductImage(product) {
        if (product.images && product.images.length > 0) {
            return product.images[0];
        }
        
        if (product.image_url) {
            return product.image_url;
        }
        
        return '/images/placeholder.jpg';
    }
    
    /**
     * Получение текста наличия
     */
    getAvailabilityText(product) {
        if (product.stock?.quantity > 0) {
            return `В наличии: ${product.stock.quantity} шт`;
        }
        
        if (product.delivery?.text) {
            return product.delivery.text;
        }
        
        return product.available ? 'В наличии' : 'Под заказ';
    }
    
    /**
     * Обновление информации
     */
    updateInfo() {
        this.elements.totalProductsCount.textContent = this.totalProducts;
        this.elements.currentPage.textContent = this.currentPage;
        this.elements.totalPages.textContent = this.totalPages;
    }
    
    /**
     * Обновление пагинации
     */
    updatePagination() {
        // Кнопки prev/next
        this.elements.prevPage.disabled = this.currentPage <= 1;
        this.elements.nextPage.disabled = this.currentPage >= this.totalPages;
        
        // Номера страниц
        this.renderPageNumbers();
    }
    
    /**
     * Рендеринг номеров страниц
     */
    renderPageNumbers() {
        const html = [];
        const maxVisible = 5;
        let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(this.totalPages, start + maxVisible - 1);
        
        if (end - start < maxVisible - 1) {
            start = Math.max(1, end - maxVisible + 1);
        }
        
        if (start > 1) {
            html.push('<button class="page-number" data-page="1">1</button>');
            if (start > 2) {
                html.push('<span class="page-dots">...</span>');
            }
        }
        
        for (let i = start; i <= end; i++) {
            const active = i === this.currentPage ? 'active' : '';
            html.push(`<button class="page-number ${active}" data-page="${i}">${i}</button>`);
        }
        
        if (end < this.totalPages) {
            if (end < this.totalPages - 1) {
                html.push('<span class="page-dots">...</span>');
            }
            html.push(`<button class="page-number" data-page="${this.totalPages}">${this.totalPages}</button>`);
        }
        
        this.elements.paginationNumbers.innerHTML = html.join('');
        
        // Привязка событий к номерам страниц
        this.elements.paginationNumbers.querySelectorAll('.page-number').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.dataset.page);
                if (page !== this.currentPage) {
                    this.currentPage = page;
                    this.loadProducts();
                }
            });
        });
    }
    
    /**
     * Переключение вида
     */
    setView(view) {
        this.currentView = view;
        localStorage.setItem('shopView', view);
        
        this.elements.productsGrid.className = `products-grid view-${view}`;
        this.updateViewButtons();
    }
    
    /**
     * Обновление кнопок вида
     */
    updateViewButtons() {
        this.elements.viewButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === this.currentView);
        });
    }
    
    /**
     * Добавление в корзину
     */
    async handleAddToCart(productId, quantity) {
        try {
            await addToCart(productId, quantity);
            showToast('Товар добавлен в корзину', false);
            
            // Анимация кнопки
            const btn = document.querySelector(`[data-product-id="${productId}"]`);
            if (btn) {
                btn.classList.add('added');
                setTimeout(() => btn.classList.remove('added'), 1000);
            }
        } catch (error) {
            showToast('Ошибка добавления в корзину', true);
        }
    }
    
    /**
     * Быстрый просмотр товара
     */
    async showQuickView(productId) {
        // TODO: Реализовать быстрый просмотр
        showToast('Функция в разработке', false);
    }
    
    /**
     * Закрытие быстрого просмотра
     */
    closeQuickView() {
        this.elements.quickViewModal.style.display = 'none';
        document.body.style.overflow = '';
    }
    
    /**
     * Показать индикатор загрузки
     */
    showLoading() {
        this.elements.loadingOverlay.style.display = 'flex';
    }
    
    /**
     * Скрыть индикатор загрузки
     */
    hideLoading() {
        this.elements.loadingOverlay.style.display = 'none';
    }
    
    /**
     * Показать сообщение об отсутствии товаров
     */
    showNoProducts() {
        this.elements.productsGrid.innerHTML = '';
        this.elements.noProducts.style.display = 'block';
    }
    
    /**
     * Скрыть сообщение об отсутствии товаров
     */
    hideNoProducts() {
        this.elements.noProducts.style.display = 'none';
    }
     
    showError(message) {
        showToast(message, true);
    }
    
    /**
     * Получить ID города
     */
    getCityId() {
        const citySelect = document.getElementById('citySelect');
        return citySelect ? citySelect.value : '1';
    }
    
    /**
     * Экранирование HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Установка фильтра
     */
    setFilter(key, value) {
        if (value) {
            this.filters[key] = value;
        } else {
            delete this.filters[key];
        }
        
        this.currentPage = 1;
        this.loadProducts();
        this.renderActiveFilters();
    }
    
    /**
     * Очистка всех фильтров
     */
    clearAllFilters() {
        this.filters = {};
        this.searchQuery = '';
        this.elements.searchInput.value = '';
        this.elements.searchClear.style.display = 'none';
        this.currentPage = 1;
        this.loadProducts();
        this.renderActiveFilters();
    }
    
    /**
     * Рендеринг активных фильтров
     */
    renderActiveFilters() {
        const filterTags = [];
        
        // Поиск
        if (this.searchQuery) {
            filterTags.push(this.createFilterTag('Поиск', this.searchQuery, () => {
                this.searchQuery = '';
                this.elements.searchInput.value = '';
                this.elements.searchClear.style.display = 'none';
                this.loadProducts();
            }));
        }
        
        // Другие фильтры
        Object.entries(this.filters).forEach(([key, value]) => {
            const label = this.getFilterLabel(key);
            filterTags.push(this.createFilterTag(label, value, () => {
                delete this.filters[key];
                this.loadProducts();
                this.renderActiveFilters();
            }));
        });
        
        this.elements.activeFilters.innerHTML = filterTags.join('');
    }
    
    /**
     * Создание тега фильтра
     */
    createFilterTag(label, value, onRemove) {
        const tag = document.createElement('div');
        tag.className = 'filter-tag';
        tag.innerHTML = `
            <span>${label}: ${value}</span>
            <button type="button">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                </svg>
            </button>
        `;
        
        tag.querySelector('button').addEventListener('click', onRemove);
        
        // Временно возвращаем HTML строку для innerHTML
        return tag.outerHTML;
    }
    
    /**
     * Получение названия фильтра
     */
    getFilterLabel(key) {
        const labels = {
            brand_name: 'Бренд',
            series_name: 'Серия',
            category: 'Категория',
            min_price: 'Мин. цена',
            max_price: 'Макс. цена'
        };
        
        return labels[key] || key;
    }
    
    
}

// Экспорт для глобального доступа
window.ShopManager = ShopManager;

// // Инициализация при загрузке страницы
// document.addEventListener('DOMContentLoaded', () => {
//     if (document.querySelector('.shop-container')) {
//         window.shopManager = new ShopManager();
        
//         // Глобальные функции для обратной совместимости
//         window.clearAllFilters = () => window.shopManager.clearAllFilters();
//         window.setFilter = (key, value) => window.shopManager.setFilter(key, value);
//     }
// });

// Экспорт класса
export { ShopManager };