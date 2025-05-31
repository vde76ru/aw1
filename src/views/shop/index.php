<div class="shop-container">
    <!-- Верхняя панель с фильтрами -->
    <div class="shop-header">
        <div class="shop-title">
            <h1>Каталог товаров</h1>
            <p class="shop-subtitle">Более 10 000 наименований электротехнического оборудования</p>
        </div>
        
        <!-- Панель управления -->
        <div class="shop-controls">
            <div class="shop-controls-left">
                <!-- Поиск -->
                <div class="shop-search">
                    <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                    <input type="text" id="searchInput" class="shop-search-input" placeholder="Поиск по названию, артикулу или бренду...">
                    <button class="search-clear" id="searchClear" style="display: none;">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                        </svg>
                    </button>
                </div>
                
                <!-- Активные фильтры -->
                <div id="activeFilters" class="active-filters"></div>
            </div>
            
            <div class="shop-controls-right">
                <!-- Сортировка -->
                <div class="shop-sort">
                    <label>Сортировка:</label>
                    <select id="sortSelect" class="sort-select">
                        <option value="relevance">По релевантности</option>
                        <option value="name">По названию</option>
                        <option value="price_asc">Цена: по возрастанию</option>
                        <option value="price_desc">Цена: по убыванию</option>
                        <option value="availability">По наличию</option>
                        <option value="popularity">По популярности</option>
                    </select>
                </div>
                
                <!-- Переключатель вида -->
                <div class="view-switcher">
                    <button class="view-btn active" data-view="grid" title="Сетка">
                        <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M3 3a1 1 0 011-1h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H16a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V3z" clip-rule="evenodd"></path>
                        </svg>
                    </button>
                    <button class="view-btn" data-view="list" title="Список">
                        <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path>
                        </svg>
                    </button>
                </div>
                
                <!-- Количество на странице -->
                <div class="per-page">
                    <label>Показывать:</label>
                    <select id="itemsPerPageSelect" class="per-page-select">
                        <option value="20">20</option>
                        <option value="40">40</option>
                        <option value="60">60</option>
                        <option value="100">100</option>
                    </select>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Информационная панель -->
    <div class="shop-info-bar">
        <div class="results-count">
            Найдено товаров: <span id="totalProductsCount">0</span>
        </div>
        <div class="selected-filters" id="selectedFilters"></div>
    </div>
    
    <!-- Основной контейнер с товарами -->
    <div class="shop-main">
        <!-- Боковая панель фильтров (опционально) -->
        <aside class="shop-sidebar" id="shopSidebar" style="display: none;">
            <div class="sidebar-header">
                <h3>Фильтры</h3>
                <button class="btn-text" id="clearAllFilters">Сбросить все</button>
            </div>
            
            <!-- Фильтры будут здесь -->
            <div class="filter-groups" id="filterGroups">
                <!-- Динамически загружаемые фильтры -->
            </div>
        </aside>
        
        <!-- Контейнер товаров -->
        <div class="products-container">
            <!-- Индикатор загрузки -->
            <div class="loading-overlay" id="loadingOverlay" style="display: none;">
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>Загрузка товаров...</p>
                </div>
            </div>
            
            <!-- Сетка товаров -->
            <div id="productsGrid" class="products-grid view-grid">
                <!-- Товары будут добавлены сюда динамически -->
            </div>
            
            <!-- Сообщение об отсутствии товаров -->
            <div class="no-products" id="noProducts" style="display: none;">
                <svg width="64" height="64" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <h3>Товары не найдены</h3>
                <p>Попробуйте изменить параметры поиска или фильтры</p>
                <button class="btn btn-primary" onclick="window.productManager?.clearAllFilters()">Сбросить фильтры</button>
            </div>
        </div>
    </div>
    
    <!-- Пагинация -->
    <div class="shop-pagination" id="shopPagination">
        <div class="pagination-info">
            Страница <span id="currentPage">1</span> из <span id="totalPages">1</span>
        </div>
        <div class="pagination-controls">
            <button class="pagination-btn" id="prevPage" disabled>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
                Предыдущая
            </button>
            
            <div class="pagination-numbers" id="paginationNumbers">
                <!-- Номера страниц -->
            </div>
            
            <button class="pagination-btn" id="nextPage">
                Следующая
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
            </button>
        </div>
    </div>
</div>

<!-- Модальное окно быстрого просмотра -->
<div class="modal" id="quickViewModal" style="display: none;">
    <div class="modal-content">
        <button class="modal-close" id="closeQuickView">&times;</button>
        <div class="modal-body" id="quickViewContent">
            <!-- Содержимое быстрого просмотра -->
        </div>
    </div>
</div>
