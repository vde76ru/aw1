/**
 * Унифицированный менеджер товаров
 * Объединяет функционал ShopManager и старого кода
 * Поддерживает как карточки, так и табличный вид
 */

import { productService } from './services/ProductService.js';
import { availabilityService } from './availability.js';
import { showToast } from './utils.js';
import { addToCart } from './cart.js';

export class ProductManager {
    constructor() {
        // Состояние приложения
        this.state = {
            products: [],
            currentPage: 1,
            totalPages: 1,
            totalProducts: 0,
            itemsPerPage: parseInt(localStorage.getItem('itemsPerPage') || '20'),
            currentView: localStorage.getItem('productView') || 'grid',
            currentSort: localStorage.getItem('productSort') || 'relevance',
            searchQuery: '',
            filters: this.loadFiltersFromStorage(),
            isLoading: false,
            selectedProducts: new Set()
        };

        // DOM элементы - универсальные для обоих видов
        this.elements = null;
        this.viewMode = this.detectViewMode();
        
        // Инициализация
        this.init();
    }

    /**
     * Определение режима отображения (карточки или таблица)
     */
    detectViewMode() {
        // Проверяем URL и наличие элементов
        const isShopPage = window.location.pathname === '/shop';
        const hasShopContainer = document.querySelector('.shop-container');
        const hasProductTable = document.querySelector('.product-table');
        
        if (isShopPage || hasShopContainer) {
            return 'shop'; // Новый интерфейс с карточками
        } else if (hasProductTable) {
            return 'table'; // Старый табличный интерфейс
        }
        
        return null;
    }

    /**
     * Инициализация менеджера
     */
    init() {
        if (!this.viewMode) {
            console.warn('ProductManager: Не найден подходящий интерфейс');
            return;
        }

        console.log(`🚀 ProductManager: Инициализация в режиме ${this.viewMode}`);
        
        this.cacheElements();
        this.bindEvents();
        this.restoreStateFromURL();
        this.loadProducts();
    }

    /**
     * Кеширование DOM элементов
     */
    cacheElements() {
        if (this.viewMode === 'shop') {
            // Элементы для карточного вида
            this.elements = {
                container: document.getElementById('productsGrid'),
                loadingOverlay: document.getElementById('loadingOverlay'),
                noProducts: document.getElementById('noProducts'),
                searchInput: document.getElementById('searchInput'),
                searchClear: document.getElementById('searchClear'),
                sortSelect: document.getElementById('sortSelect'),
                itemsPerPageSelect: document.getElementById('itemsPerPageSelect'),
                totalCount: document.getElementById('totalProductsCount'),
                currentPage: document.getElementById('currentPage'),
                totalPages: document.getElementById('totalPages'),
                prevPage: document.getElementById('prevPage'),
                nextPage: document.getElementById('nextPage'),
                paginationNumbers: document.getElementById('paginationNumbers'),
                activeFilters: document.getElementById('activeFilters'),
                viewButtons: document.querySelectorAll('.view-btn')
            };
        } else {
            // Элементы для табличного вида
            this.elements = {
                container: document.querySelector('.product-table tbody'),
                searchInput: document.getElementById('searchInput'),
                sortHeaders: document.querySelectorAll('th.sortable'),
                itemsPerPageSelect: document.getElementById('itemsPerPageSelect'),
                pageInputs: document.querySelectorAll('.pageInput'),
                totalCount: document.getElementById('totalProductsText'),
                prevButtons: document.querySelectorAll('.prev-btn'),
                nextButtons: document.querySelectorAll('.next-btn'),
                selectAll: document.getElementById('selectAll')
            };
        }
    }

    /**
     * Привязка событий
     */
    bindEvents() {
        // Поиск (универсальный)
        if (this.elements.searchInput) {
            let searchTimeout;
            this.elements.searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.state.searchQuery = e.target.value.trim();
                    this.state.currentPage = 1;
                    this.saveStateToStorage();
                    this.loadProducts();
                }, 300);
            });
        }

        // Сортировка
        if (this.viewMode === 'shop' && this.elements.sortSelect) {
            this.elements.sortSelect.addEventListener('change', (e) => {
                this.state.currentSort = e.target.value;
                this.state.currentPage = 1;
                this.saveStateToStorage();
                this.loadProducts();
            });
        } else if (this.viewMode === 'table') {
            // Клики по заголовкам таблицы
            this.elements.sortHeaders?.forEach(header => {
                header.addEventListener('click', () => {
                    this.handleTableSort(header.dataset.column);
                });
            });
        }

        // Количество на странице
        if (this.elements.itemsPerPageSelect) {
            this.elements.itemsPerPageSelect.addEventListener('change', (e) => {
                this.state.itemsPerPage = parseInt(e.target.value);
                this.state.currentPage = 1;
                this.saveStateToStorage();
                this.loadProducts();
            });
        }

        // Пагинация
        this.bindPaginationEvents();

        // Делегирование событий для динамического контента
        if (this.elements.container) {
            this.elements.container.addEventListener('click', (e) => {
                this.handleContainerClick(e);
            });
        }

        // Глобальные события
        this.bindGlobalEvents();
    }

    /**
     * Загрузка товаров
     */
    async loadProducts() {
        if (this.state.isLoading) return;

        console.log('📦 ProductManager: Загрузка товаров', this.state);

        this.state.isLoading = true;
        this.showLoading();

        try {
            // Подготовка параметров
            const params = {
                q: this.state.searchQuery,
                page: this.state.currentPage,
                limit: this.state.itemsPerPage,
                sort: this.state.currentSort,
                city_id: this.getCityId(),
                ...this.state.filters
            };

            // Вызов API
            const result = await productService.search(params);

            if (result.success) {
                this.state.products = result.data.products || [];
                this.state.totalProducts = result.data.total || 0;
                this.state.totalPages = Math.ceil(this.state.totalProducts / this.state.itemsPerPage);

                console.log(`✅ Загружено ${this.state.products.length} из ${this.state.totalProducts} товаров`);

                // Рендеринг
                this.renderProducts();
                this.updateUI();
                
                // Загрузка дополнительных данных о наличии
                if (this.state.products.length > 0) {
                    this.loadAvailability();
                }
            } else {
                console.error('❌ Ошибка загрузки:', result);
                this.showError(result.error || 'Ошибка загрузки товаров');
            }
        } catch (error) {
            console.error('💥 Исключение при загрузке:', error);
            this.showError('Не удалось загрузить товары');
        } finally {
            this.state.isLoading = false;
            this.hideLoading();
        }
    }

    /**
     * Рендеринг товаров в зависимости от режима
     */
    renderProducts() {
        if (!this.elements.container) {
            console.error('❌ Контейнер для товаров не найден');
            return;
        }

        if (this.state.products.length === 0) {
            this.showNoProducts();
            return;
        }

        this.hideNoProducts();

        if (this.viewMode === 'shop') {
            this.renderCardsView();
        } else {
            this.renderTableView();
        }
    }

    /**
     * Рендеринг карточек товаров
     */
    renderCardsView() {
        const fragment = document.createDocumentFragment();
        
        this.state.products.forEach((product, index) => {
            const card = this.createProductCard(product);
            fragment.appendChild(card);
        });

        this.elements.container.innerHTML = '';
        this.elements.container.appendChild(fragment);

        // Анимация появления
        requestAnimationFrame(() => {
            this.elements.container.querySelectorAll('.product-card').forEach((card, index) => {
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, index * 50);
            });
        });
    }

    /**
     * Создание карточки товара
     */
    createProductCard(product) {
        const div = document.createElement('div');
        div.className = 'product-card';
        div.style.cssText = 'opacity: 0; transform: translateY(20px); transition: all 0.3s ease;';
        
        const isInStock = product.stock?.quantity > 0 || product.available;
        const price = this.formatPrice(product);
        const imageUrl = this.getProductImage(product);
        
        div.innerHTML = `
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
                
                <div class="product-footer">
                    <div class="product-price-row">
                        <div>
                            ${price.old ? `<span class="product-price-old">${price.old}</span>` : ''}
                            <span class="product-price">${price.current}</span>
                        </div>
                    </div>
                    
                    <div class="product-availability ${isInStock ? 'in-stock' : 'out-of-stock'}">
                        <span class="availability-indicator"></span>
                        <span class="availability-text">${this.getAvailabilityText(product)}</span>
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
        `;
        
        return div;
    }

    /**
     * Рендеринг табличного вида
     */
    renderTableView() {
        const fragment = document.createDocumentFragment();
        
        this.state.products.forEach(product => {
            const row = this.createProductRow(product);
            fragment.appendChild(row);
        });

        this.elements.container.innerHTML = '';
        this.elements.container.appendChild(fragment);

        // Обновление заголовка таблицы
        this.updateTableHeaders();
    }

    /**
     * Создание строки таблицы товара
     */
    createProductRow(product) {
        const tr = document.createElement('tr');
        tr.setAttribute('data-product-id', product.product_id);
        
        const imageUrl = this.getProductImage(product);
        const price = this.formatPrice(product);
        
        tr.innerHTML = `
            <td class="col-checkbox">
                <input type="checkbox" class="product-checkbox" data-product-id="${product.product_id}">
            </td>
            <td class="col-code">
                <div class="item-code">
                    <span>${product.external_id || ''}</span>
                    <a href="#" class="copy-icon" data-text="${product.external_id || ''}">
                        <i class="far fa-clone"></i>
                    </a>
                </div>
            </td>
            <td class="col-image">
                <a href="/shop/product?id=${product.external_id || product.product_id}">
                    <div class="product-image-container">
                        <img src="${imageUrl}" alt="${this.escapeHtml(product.name)}" class="product-image">
                        <div class="product-image-zoom">
                            <img src="${imageUrl}" alt="${this.escapeHtml(product.name)}">
                        </div>
                    </div>
                </a>
            </td>
            <td class="name-cell">
                <a href="/shop/product?id=${product.external_id || product.product_id}">
                    <div class="item-code">
                        <span>${product._highlight?.name?.[0] || this.escapeHtml(product.name)}</span>
                        <a href="#" class="copy-icon" data-text="${product.name}">
                            <i class="far fa-clone"></i>
                        </a>
                    </div>
                </a>
            </td>
            <td class="col-sku">
                <div class="item-code">
                    <span>${product.sku || ''}</span>
                    <a href="#" class="copy-icon" data-text="${product.sku || ''}">
                        <i class="far fa-clone"></i>
                    </a>
                </div>
            </td>
            <td class="col-brand-series">
                <div>
                    ${product.brand_name ? `<span class="brand-name clickable" data-filter="brand_name" data-value="${product.brand_name}">${product.brand_name}</span>` : ''}
                    ${product.series_name ? `<span class="series-name clickable" data-filter="series_name" data-value="${product.series_name}"> / ${product.series_name}</span>` : ''}
                </div>
            </td>
            <td class="col-status">
                <span class="status-badge ${product.status === 'active' ? 'status-available' : 'status-out'}">
                    ${product.status || 'Активен'}
                </span>
            </td>
            <td class="col-min-sale-unit">
                <span>${product.min_sale || ''}</span>
                <span>${product.unit ? ` / ${product.unit}` : ''}</span>
            </td>
            <td class="col-availability availability-cell" data-product-id="${product.product_id}">
                <span>${product.stock?.quantity || '...'}</span>
            </td>
            <td class="col-delivery-date delivery-date-cell" data-product-id="${product.product_id}">
                <span>${product.delivery?.text || '...'}</span>
            </td>
            <td class="col-price">
                <span>${price.current}</span>
            </td>
            <td class="col-retail-price">
                <span>${price.old || '—'}</span>
            </td>
            <td class="cart-cell">
                <div class="cart-controls">
                    <input type="number" class="quantity-input form-control" value="1" min="1">
                    <button class="add-to-cart-btn" data-product-id="${product.product_id}">
                        <i class="fas fa-shopping-cart"></i>
                    </button>
                </div>
            </td>
        `;
        
        return tr;
    }

    /**
     * Загрузка данных о наличии
     */
    async loadAvailability() {
        const productIds = this.state.products.map(p => p.product_id);
        const cityId = this.getCityId();
        
        try {
            const availabilityData = await availabilityService.loadAvailability(productIds);
            // Данные автоматически обновятся в DOM через availabilityService
        } catch (error) {
            console.error('Ошибка загрузки наличия:', error);
        }
    }

    /**
     * Обработка кликов в контейнере
     */
    handleContainerClick(e) {
        // Добавить в корзину
        if (e.target.closest('.btn-add-to-cart, .add-to-cart-btn')) {
            e.preventDefault();
            const btn = e.target.closest('.btn-add-to-cart, .add-to-cart-btn');
            const productId = btn.dataset.productId;
            const container = btn.closest('.product-card, tr');
            const quantityInput = container?.querySelector('.quantity-input');
            const quantity = parseInt(quantityInput?.value || '1');
            
            this.handleAddToCart(productId, quantity);
            return;
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
            return;
        }

        // Копирование текста
        if (e.target.closest('.copy-icon')) {
            e.preventDefault();
            const icon = e.target.closest('.copy-icon');
            const text = icon.dataset.text;
            if (text) {
                this.copyToClipboard(text);
            }
            return;
        }

        // Фильтр по бренду/серии (для таблицы)
        if (e.target.closest('.clickable[data-filter]')) {
            const element = e.target.closest('.clickable[data-filter]');
            const filterKey = element.dataset.filter;
            const filterValue = element.dataset.value;
            
            this.setFilter(filterKey, filterValue);
            return;
        }

        // Быстрый просмотр
        if (e.target.closest('.btn-quick-view')) {
            e.preventDefault();
            const btn = e.target.closest('.btn-quick-view');
            const productId = btn.dataset.productId;
            this.showQuickView(productId);
            return;
        }
    }

    /**
     * Добавление товара в корзину
     */
    async handleAddToCart(productId, quantity) {
        try {
            await addToCart(productId, quantity);
            showToast('Товар добавлен в корзину');
            
            // Визуальная обратная связь
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
     * Обработка сортировки таблицы
     */
    handleTableSort(column) {
        // Преобразование колонки в формат API
        const sortMap = {
            'name': 'name',
            'external_id': 'external_id',
            'base_price': 'price_asc', // или price_desc в зависимости от направления
            'availability': 'availability'
        };

        if (this.state.currentSort === column) {
            // Меняем направление
            this.state.currentSort = column === 'base_price' ? 
                (this.state.currentSort === 'price_asc' ? 'price_desc' : 'price_asc') : 
                column;
        } else {
            this.state.currentSort = sortMap[column] || column;
        }

        this.state.currentPage = 1;
        this.saveStateToStorage();
        this.loadProducts();
    }

    /**
     * Установка фильтра
     */
    setFilter(key, value) {
        if (value) {
            this.state.filters[key] = value;
        } else {
            delete this.state.filters[key];
        }

        this.state.currentPage = 1;
        this.saveStateToStorage();
        this.loadProducts();
        this.renderActiveFilters();
    }

    /**
     * Очистка всех фильтров
     */
    clearAllFilters() {
        this.state.filters = {};
        this.state.searchQuery = '';
        this.state.currentPage = 1;
        
        if (this.elements.searchInput) {
            this.elements.searchInput.value = '';
        }
        
        this.saveStateToStorage();
        this.loadProducts();
        this.renderActiveFilters();
    }

    /**
     * Рендеринг активных фильтров
     */
    renderActiveFilters() {
        if (!this.elements.activeFilters) return;

        const filters = [];
        
        // Поисковый запрос
        if (this.state.searchQuery) {
            filters.push({
                label: 'Поиск',
                value: this.state.searchQuery,
                onRemove: () => {
                    this.state.searchQuery = '';
                    if (this.elements.searchInput) {
                        this.elements.searchInput.value = '';
                    }
                    this.loadProducts();
                }
            });
        }

        // Остальные фильтры
        Object.entries(this.state.filters).forEach(([key, value]) => {
            filters.push({
                label: this.getFilterLabel(key),
                value: value,
                onRemove: () => {
                    delete this.state.filters[key];
                    this.loadProducts();
                    this.renderActiveFilters();
                }
            });
        });

        // Рендеринг
        this.elements.activeFilters.innerHTML = filters.map(filter => `
            <div class="filter-tag">
                <span>${filter.label}: ${filter.value}</span>
                <button type="button" class="filter-remove">
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                </button>
            </div>
        `).join('');

        // Привязка событий удаления
        this.elements.activeFilters.querySelectorAll('.filter-remove').forEach((btn, index) => {
            btn.addEventListener('click', filters[index].onRemove);
        });
    }

    /**
     * Обновление UI элементов
     */
    updateUI() {
        // Обновление счетчиков
        if (this.elements.totalCount) {
            this.elements.totalCount.textContent = this.state.totalProducts;
        }
        
        if (this.elements.currentPage) {
            this.elements.currentPage.textContent = this.state.currentPage;
        }
        
        if (this.elements.totalPages) {
            this.elements.totalPages.textContent = this.state.totalPages;
        }

        // Обновление пагинации
        this.updatePagination();

        // Обновление фильтров
        this.renderActiveFilters();

        // Обновление URL
        this.updateURL();
    }

    /**
     * Обновление пагинации
     */
    updatePagination() {
        // Кнопки prev/next
        if (this.elements.prevPage) {
            this.elements.prevPage.disabled = this.state.currentPage <= 1;
        }
        
        if (this.elements.nextPage) {
            this.elements.nextPage.disabled = this.state.currentPage >= this.state.totalPages;
        }

        // Отдельные кнопки для таблицы
        this.elements.prevButtons?.forEach(btn => {
            btn.disabled = this.state.currentPage <= 1;
        });
        
        this.elements.nextButtons?.forEach(btn => {
            btn.disabled = this.state.currentPage >= this.state.totalPages;
        });

        // Номера страниц
        if (this.elements.paginationNumbers) {
            this.renderPageNumbers();
        }

        // Инпуты страниц для таблицы
        this.elements.pageInputs?.forEach(input => {
            input.value = this.state.currentPage;
        });
    }

    /**
     * Привязка событий пагинации
     */
    bindPaginationEvents() {
        // Кнопки prev/next
        this.elements.prevPage?.addEventListener('click', () => {
            if (this.state.currentPage > 1) {
                this.state.currentPage--;
                this.loadProducts();
            }
        });

        this.elements.nextPage?.addEventListener('click', () => {
            if (this.state.currentPage < this.state.totalPages) {
                this.state.currentPage++;
                this.loadProducts();
            }
        });

        // Для таблицы
        this.elements.prevButtons?.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.state.currentPage > 1) {
                    this.state.currentPage--;
                    this.loadProducts();
                }
            });
        });

        this.elements.nextButtons?.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.state.currentPage < this.state.totalPages) {
                    this.state.currentPage++;
                    this.loadProducts();
                }
            });
        });

        // Инпуты страниц
        this.elements.pageInputs?.forEach(input => {
            input.addEventListener('change', (e) => {
                const page = parseInt(e.target.value) || 1;
                this.state.currentPage = Math.max(1, Math.min(page, this.state.totalPages));
                this.loadProducts();
            });
        });
    }

    /**
     * Вспомогательные методы
     */
    
    getCityId() {
        const citySelect = document.getElementById('citySelect');
        return parseInt(citySelect?.value || localStorage.getItem('selected_city_id') || '1');
    }

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

    getProductImage(product) {
        if (product.images && Array.isArray(product.images) && product.images.length > 0) {
            return product.images[0];
        }
        
        if (product.image_url) {
            return product.image_url;
        }
        
        if (product.image_urls) {
            const urls = product.image_urls.split(',').map(u => u.trim());
            if (urls.length > 0) return urls[0];
        }
        
        return '/images/placeholder.jpg';
    }

    getAvailabilityText(product) {
        if (product.stock?.quantity > 0) {
            return `В наличии: ${product.stock.quantity} шт`;
        }
        
        if (product.delivery?.text) {
            return product.delivery.text;
        }
        
        return product.available ? 'В наличии' : 'Под заказ';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    copyToClipboard(text) {
        if (!text) {
            showToast('Нечего копировать', true);
            return;
        }
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text)
                .then(() => showToast(`Скопировано: ${text}`))
                .catch(() => showToast('Не удалось скопировать', true));
        } else {
            // Fallback для старых браузеров
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            
            try {
                document.execCommand('copy');
                showToast(`Скопировано: ${text}`);
            } catch (err) {
                showToast('Не удалось скопировать', true);
            }
            
            document.body.removeChild(textarea);
        }
    }

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

    /**
     * Показ/скрытие элементов UI
     */
    
    showLoading() {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.style.display = 'flex';
        } else if (this.viewMode === 'table') {
            // Для таблицы можно добавить индикатор в саму таблицу
            if (this.elements.container) {
                this.elements.container.innerHTML = `
                    <tr>
                        <td colspan="20" style="text-align: center; padding: 2rem;">
                            <div class="spinner-border" role="status">
                                <span class="sr-only">Загрузка...</span>
                            </div>
                            <p>Загрузка товаров...</p>
                        </td>
                    </tr>
                `;
            }
        }
    }

    hideLoading() {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.style.display = 'none';
        }
    }

    showNoProducts() {
        if (this.elements.noProducts) {
            this.elements.container.innerHTML = '';
            this.elements.noProducts.style.display = 'block';
        } else if (this.viewMode === 'table' && this.elements.container) {
            this.elements.container.innerHTML = `
                <tr>
                    <td colspan="20" style="text-align: center; padding: 2rem;">
                        <h4>Товары не найдены</h4>
                        <p>Попробуйте изменить параметры поиска или фильтры</p>
                    </td>
                </tr>
            `;
        }
    }

    hideNoProducts() {
        if (this.elements.noProducts) {
            this.elements.noProducts.style.display = 'none';
        }
    }

    showError(message) {
        showToast(message, true);
        this.showNoProducts();
    }

    showQuickView(productId) {
        // TODO: Реализовать быстрый просмотр
        showToast('Функция в разработке');
    }

    /**
     * Работа с состоянием и URL
     */
    
    saveStateToStorage() {
        localStorage.setItem('itemsPerPage', this.state.itemsPerPage);
        localStorage.setItem('productSort', this.state.currentSort);
        localStorage.setItem('productView', this.state.currentView);
        
        // Сохраняем фильтры
        Object.entries(this.state.filters).forEach(([key, value]) => {
            sessionStorage.setItem(key, value);
        });
        
        // Удаляем старые фильтры из sessionStorage
        const validKeys = Object.keys(this.state.filters);
        Object.keys(sessionStorage).forEach(key => {
            if (!['itemsPerPage', 'productSort', 'productView'].includes(key) && !validKeys.includes(key)) {
                sessionStorage.removeItem(key);
            }
        });
    }

    loadFiltersFromStorage() {
        const filters = {};
        const skipKeys = ['itemsPerPage', 'productSort', 'productView'];
        
        Object.keys(sessionStorage).forEach(key => {
            if (!skipKeys.includes(key)) {
                filters[key] = sessionStorage.getItem(key);
            }
        });
        
        return filters;
    }

    restoreStateFromURL() {
        const params = new URLSearchParams(window.location.search);
        
        if (params.has('search')) {
            this.state.searchQuery = params.get('search');
            if (this.elements.searchInput) {
                this.elements.searchInput.value = this.state.searchQuery;
            }
        }
        
        if (params.has('page')) {
            this.state.currentPage = parseInt(params.get('page')) || 1;
        }
        
        if (params.has('sort')) {
            this.state.currentSort = params.get('sort');
            if (this.elements.sortSelect) {
                this.elements.sortSelect.value = this.state.currentSort;
            }
        }
    }

    updateURL() {
        const params = new URLSearchParams();
        
        if (this.state.searchQuery) {
            params.set('search', this.state.searchQuery);
        }
        
        if (this.state.currentPage > 1) {
            params.set('page', this.state.currentPage);
        }
        
        if (this.state.currentSort !== 'relevance') {
            params.set('sort', this.state.currentSort);
        }
        
        const newURL = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
        window.history.replaceState({}, '', newURL);
    }

    /**
     * Обновление заголовков таблицы
     */
    updateTableHeaders() {
        if (!this.elements.sortHeaders) return;
        
        this.elements.sortHeaders.forEach(header => {
            const column = header.dataset.column;
            header.classList.remove('sorted-asc', 'sorted-desc');
            
            if (column === this.state.currentSort || 
                (column === 'base_price' && (this.state.currentSort === 'price_asc' || this.state.currentSort === 'price_desc'))) {
                const direction = this.state.currentSort === 'price_desc' ? 'desc' : 'asc';
                header.classList.add(`sorted-${direction}`);
            }
        });
    }

    /**
     * Глобальные события
     */
    bindGlobalEvents() {
        // Изменение города
        const citySelect = document.getElementById('citySelect');
        if (citySelect) {
            citySelect.addEventListener('change', () => {
                // Сбрасываем кеш наличия при смене города
                if (window.availabilityService) {
                    window.availabilityService.clearCache();
                }
                this.loadProducts();
            });
        }

        // Select all для таблицы
        if (this.elements.selectAll) {
            this.elements.selectAll.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                document.querySelectorAll('.product-checkbox').forEach(checkbox => {
                    checkbox.checked = isChecked;
                    if (isChecked) {
                        this.state.selectedProducts.add(checkbox.dataset.productId);
                    } else {
                        this.state.selectedProducts.clear();
                    }
                });
            });
        }
    }

    /**
     * Рендеринг номеров страниц (для карточек)
     */
    renderPageNumbers() {
        const html = [];
        const maxVisible = 5;
        let start = Math.max(1, this.state.currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(this.state.totalPages, start + maxVisible - 1);
        
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
            const active = i === this.state.currentPage ? 'active' : '';
            html.push(`<button class="page-number ${active}" data-page="${i}">${i}</button>`);
        }
        
        if (end < this.state.totalPages) {
            if (end < this.state.totalPages - 1) {
                html.push('<span class="page-dots">...</span>');
            }
            html.push(`<button class="page-number" data-page="${this.state.totalPages}">${this.state.totalPages}</button>`);
        }
        
        this.elements.paginationNumbers.innerHTML = html.join('');
        
        // Привязка событий
        this.elements.paginationNumbers.querySelectorAll('.page-number').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.dataset.page);
                if (page !== this.state.currentPage) {
                    this.state.currentPage = page;
                    this.loadProducts();
                }
            });
        });
    }
}

// Экспорт для глобального доступа
window.ProductManager = ProductManager;