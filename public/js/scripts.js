// Merged scripts.js - Consolidated from current file + extracted inline scripts (1-5)
// Priorities: Bakery theme compatibility; deduped duplicates (e.g., quantity stepper, Swiper, tabs).
// All under single DOMContentLoaded for efficiency; page-specific checks via if (element) {}.
// No conflicts; current functionality preserved (e.g., sidebar, Swipers, admin).
// FIXED: Sidebar toggle ensured for all pages (about/contact via partial IDs); added overlay for category sidebar to allow close on click outside.
// FIXED: Search icon now toggles visibility with class + inline styles (max-height/opacity) for smooth collapse/expand
// FIXED: Header scroll effect - Consolidated duplicate listeners into single debounced one using class selector; added passive: true for perf.

document.addEventListener('DOMContentLoaded', () => {

    // Single Debounced Header Scroll Effect (Consolidated - Removes duplicate)
    // Single Debounced Header Scroll Effect (with body padding toggle)
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const header = document.querySelector('.site-header');
            const body = document.body;
            if (header && window.scrollY > 50) {
                header.classList.add('scrolled');
                body.classList.add('scrolled'); /* FIXED: Reduce body padding */
            } else if (header) {
                header.classList.remove('scrolled');
                body.classList.remove('scrolled'); /* FIXED: Restore padding */
            }
        }, 100);
    }, { passive: true });
    // --- Swiper Initializations (Merged from current + 2,5) ---
    // Hero Swiper
    const mySwiperElement = document.querySelector('.mySwiper');
    if (mySwiperElement) {
        new Swiper('.mySwiper', {
            loop: true,
            autoplay: { delay: 4000 },
            pagination: { el: '.swiper-pagination', clickable: true },
        });
    }

    // Best Selling Swiper (homepage only)
    const bestSwiperElement = document.querySelector('.bestSwiper');
    if (bestSwiperElement) {
        new Swiper('.bestSwiper', {
            loop: false,
            slidesPerView: 'auto',
            spaceBetween: 16,
            autoplay: { delay: 5000 },
            breakpoints: {
                768: { slidesPerView: 4 },
                0: { slidesPerView: 2 }
            }
        });
    }

    // Product Gallery Swiper (detail page)
    const productSwiperElement = document.querySelector('.productSwiper');
    let productSwiperInstance;
    if (productSwiperElement) {
        productSwiperInstance = new Swiper('.productSwiper', {
            loop: true,
            pagination: { el: '.swiper-pagination', clickable: true },
        });
    }

    // Thumbnails for gallery (from current + 2)
    const thumbs = document.querySelectorAll('.thumb');
    thumbs.forEach((thumb, index) => {
        thumb.addEventListener('click', () => {
            if (productSwiperInstance) {
                productSwiperInstance.slideTo(index);
            }
        });
    });

    // Related Products Swiper (detail/listing)
    const relatedSwiperElement = document.querySelector('.relatedSwiper');
    if (relatedSwiperElement) {
        new Swiper('.relatedSwiper', {
            slidesPerView: 'auto',
            spaceBetween: 16,
            breakpoints: { 768: { slidesPerView: 4 }, 0: { slidesPerView: 2 } }
        });
    }

    // --- Sidebar Toggles (Current preserved - FIXED: Added overlay for category sidebar to allow close on click outside) ---
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const globalSidebar = document.getElementById('global-sidebar');
    if (globalSidebar && sidebarOverlay) {
        const openMenu = document.getElementById('openMenu');
        if (openMenu) {
            openMenu.onclick = () => {
                globalSidebar.classList.add('open');
                sidebarOverlay.classList.add('active');
            };
        }

        const closeSidebar = document.getElementById('close-sidebar-btn');
        if (closeSidebar) {
            closeSidebar.onclick = () => {
                globalSidebar.classList.remove('open');
                sidebarOverlay.classList.remove('active');
            };
        }

        sidebarOverlay.onclick = () => {
            globalSidebar.classList.remove('open');
            sidebarOverlay.classList.remove('active');
        };
    }

    // Category sidebar (fixed: added overlay close functionality using the same sidebar-overlay)
    const categorySidebar = document.getElementById('categorySidebar');
    if (categorySidebar) {
        const openCategories = document.getElementById('openCategories');
        if (openCategories) {
            openCategories.onclick = () => {
                // Open category sidebar only; do not activate the global overlay so the page
                // doesn't get dimmed when categories are opened from the header search row.
                categorySidebar.classList.add('open');
            };
        }

        const closeCategorySidebar = document.getElementById('closeCategorySidebar');
        if (closeCategorySidebar) {
            closeCategorySidebar.onclick = () => {
                categorySidebar.classList.remove('open');
                if (sidebarOverlay) sidebarOverlay.classList.remove('active');
            };
        }

        // Overlay close for category sidebar
        if (sidebarOverlay) {
            sidebarOverlay.onclick = () => { // Extend to close category sidebar as well
                categorySidebar.classList.remove('open');
                globalSidebar.classList.remove('open');
                sidebarOverlay.classList.remove('active');
            };
        }
    }

    // --- Tab Switching (Merged current + 4; homepage + detail + admin + profile) ---
    // Homepage tabs
    const tabs = document.querySelectorAll('.tab');
    if (tabs.length > 0) {
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.products-grid').forEach(grid => grid.classList.remove('active'));
                document.querySelector(`.${tab.dataset.tab}-grid`).classList.add('active');
            });
        });
    }

    // Detail tabs
    const detailTabs = document.querySelectorAll('.detail-tabs .tab');
    detailTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            detailTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            document.querySelector(`.${tab.dataset.tab}-tab`).classList.add('active');
        });
    });

    // Admin tabs
    const adminTabs = document.querySelectorAll('.admin-tabs .tab');
    adminTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            adminTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.admin-content').forEach(content => content.classList.remove('active'));
            document.querySelector(`.${tab.dataset.tab}-content`).classList.add('active');
        });
    });

    // Profile tabs (from 4)
    const navLinks = document.querySelectorAll('.nav-link');
    const contentPanes = document.querySelectorAll('.profile-content');
    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('data-target');
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            this.classList.add('active');
            contentPanes.forEach(pane => {
                if (pane.id === targetId) {
                    pane.classList.add('active');
                } else {
                    pane.classList.remove('active');
                }
            });
        });
    });

    // Handle ?tab query param for profile (from 4)
    const urlParams = new URLSearchParams(window.location.search);
    const activeTab = urlParams.get('tab');
    if (activeTab) {
        const targetSelector = `.nav-link[data-target="${activeTab}-content"]`;
        const targetLink = document.querySelector(targetSelector);
        if (targetLink) {
            targetLink.click();
        }
    }

    // --- Search Functionality (Current preserved + merged from 3,5) ---
    // FIXED: Toggle visibility with class + inline styles (max-height/opacity) for smooth collapse/expand
    const searchIcon = document.getElementById('searchIcon');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');

    if (searchIcon && searchInput) {
        const searchContainer = document.getElementById('searchRow'); // Direct target for precision

        searchIcon.onclick = () => {
            const isHidden = searchContainer.classList.contains('hidden') ||
                window.getComputedStyle(searchContainer).maxHeight === '0px';

            if (isHidden) {
                // Expand: Remove hidden class, set dynamic height & opacity
                searchContainer.classList.remove('hidden');
                searchContainer.style.display = 'block'; // Ensure visible if .hidden sets display:none
                const expandedHeight = searchContainer.scrollHeight + 'px'; // Auto-fit content
                searchContainer.style.maxHeight = expandedHeight;
                searchContainer.style.opacity = '1';
                searchInput.focus(); // Cursor ready
            } else {
                // Collapse: Add hidden class, reset to 0
                searchContainer.classList.add('hidden');
                searchContainer.style.maxHeight = '0';
                searchContainer.style.opacity = '0';
                searchInput.blur(); // Dismiss keyboard on mobile
                // Optional: Reset display after transition (for full hide)
                setTimeout(() => {
                    if (searchContainer.style.maxHeight === '0px') {
                        searchContainer.style.display = 'none';
                    }
                }, 300); // Matches transition duration
            }
        };

        // Close on Escape key (global, only if open)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !searchContainer.classList.contains('hidden')) {
                searchContainer.classList.add('hidden');
                searchContainer.style.maxHeight = '0';
                searchContainer.style.opacity = '0';
                searchInput.blur();
                setTimeout(() => {
                    if (searchContainer.style.maxHeight === '0px') {
                        searchContainer.style.display = 'none';
                    }
                }, 300);
            }
        });
    }

    // Search submit - hide after action
    if (searchInput && searchBtn) {
        searchBtn.onclick = () => {
            const query = searchInput.value.toLowerCase().trim();
            const searchContainer = document.getElementById('searchRow');

            // Always hide after click
            searchContainer.classList.add('hidden');
            searchContainer.style.maxHeight = '0';
            searchContainer.style.opacity = '0';
            searchInput.value = ''; // Clear input
            searchInput.blur();
            setTimeout(() => {
                if (searchContainer.style.maxHeight === '0px') {
                    searchContainer.style.display = 'none';
                }
            }, 300);

            if (query) {
                window.location.href = `/search?q=${encodeURIComponent(query)}`;
            }
            // If empty, just hide (no redirect)
        };

        // Bonus: Submit on Enter key in input
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchBtn.click();
            }
        });
    }

    // Listing search/sort/pagination (merged 3 & 5; identical, used once)
    const productGrid = document.getElementById('product-grid');
    const listingSearchInput = document.getElementById('search-input'); // ID from 3,5
    const sortBy = document.getElementById('sort-by');
    const gridViewBtn = document.getElementById('grid-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');
    const pagination = document.getElementById('pagination-controls');

    if (productGrid && listingSearchInput && sortBy && gridViewBtn && listViewBtn && pagination) {
        let productCards = Array.from(productGrid.querySelectorAll('.product-card'));
        let sortValue = 'featured';
        let currentPage = 1;
        const perPage = 12;

        function updateGrid() {
            productCards.sort((a, b) => {
                const priceA = parseFloat(a.querySelector('.product-price').textContent.slice(1));
                const priceB = parseFloat(b.querySelector('.product-price').textContent.slice(1));
                if (sortValue === 'price-asc') return priceA - priceB;
                if (sortValue === 'price-desc') return priceB - priceA;
                return 0;
            });

            const term = listingSearchInput.value.toLowerCase();
            const filtered = productCards.filter(card =>
                card.querySelector('.product-title').textContent.toLowerCase().includes(term)
            );

            productGrid.innerHTML = '';
            filtered.forEach(card => productGrid.appendChild(card));

            renderPagination(filtered.length);
            showPage(1);
        }

        function showPage(page) {
            const visibleCards = Array.from(productGrid.querySelectorAll('.product-card'));
            const start = (page - 1) * perPage;
            visibleCards.forEach((card, i) => {
                card.style.display = (i >= start && i < start + perPage) ? '' : 'none';
            });
        }

        function renderPagination(total) {
            pagination.innerHTML = '';
            const pages = Math.ceil(total / perPage);
            for (let i = 1; i <= pages; i++) {
                const btn = document.createElement('button');
                btn.classList.add('page-btn');
                if (i === currentPage) btn.classList.add('active');
                btn.textContent = i;
                btn.addEventListener('click', () => {
                    currentPage = i;
                    showPage(i);
                    document.querySelectorAll('.page-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
                pagination.appendChild(btn);
            }
        }

        renderPagination(productCards.length);
        showPage(1);

        listingSearchInput.addEventListener('input', updateGrid);
        sortBy.addEventListener('change', () => {
            sortValue = sortBy.value;
            updateGrid();
        });

        gridViewBtn.addEventListener('click', () => {
            productGrid.classList.remove('list-view');
            gridViewBtn.classList.add('active');
            listViewBtn.classList.remove('active');
        });

        listViewBtn.addEventListener('click', () => {
            productGrid.classList.add('list-view');
            listViewBtn.classList.add('active');
            gridViewBtn.classList.remove('active');
        });
    }

    // --- Quantity Stepper (Merged current + 2; updated version from current) ---
    const minusBtns = document.querySelectorAll('.minus, .qty-minus, .qty-btn-minus');
    const plusBtns = document.querySelectorAll('.plus, .qty-plus, .qty-btn-plus');
    minusBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.nextElementSibling || btn.parentElement.querySelector('.qty-input');
            if (input) {
                let currentValue = parseInt(input.value);
                if (currentValue > 1) {
                    currentValue--;
                    input.value = currentValue;
                }
                if (currentValue <= 1) btn.disabled = true;
            }
        });
    });
    plusBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.previousElementSibling || btn.parentElement.querySelector('.qty-input');
            if (input) {
                let currentValue = parseInt(input.value);
                currentValue++;
                input.value = currentValue;
                const minusBtn = btn.parentElement.querySelector('.qty-minus, .minus');
                if (minusBtn) minusBtn.disabled = false;
            }
        });
    });

    // Detailed quantity selector (from 2, if .quantity-selector exists)
    document.querySelectorAll('.quantity-selector').forEach(stepper => {
        const input = stepper.querySelector('#quantity, .qty-input');
        const increaseBtn = stepper.querySelector('.qty-plus');
        const decreaseBtn = stepper.querySelector('.qty-minus');

        if (increaseBtn) {
            increaseBtn.addEventListener('click', () => {
                let currentValue = parseInt(input.value);
                input.value = currentValue + 1;
            });
        }

        if (decreaseBtn) {
            decreaseBtn.addEventListener('click', () => {
                let currentValue = parseInt(input.value);
                if (currentValue > 1) {
                    input.value = currentValue - 1;
                }
            });
        }
    });

    // --- Product Card Favorite (Current preserved) ---
    document.querySelectorAll('.btn-favorite').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            button.classList.toggle('active');
            const icon = button.querySelector('i');
            if (button.classList.contains('active')) {
                icon.classList.remove('far');
                icon.classList.add('fas');
            } else {
                icon.classList.remove('fas');
                icon.classList.add('far');
            }
        });
    });

    // --- Add to Cart (Current preserved + merged from 2) ---
    document.querySelectorAll('.btn-add-cart').forEach(button => {
        button.addEventListener('click', (e) => {
            const form = button.closest('form');
            const card = button.closest('.product-card');
            const qtyInput = card ? card.querySelector('#quantity, .qty-input') : document.querySelector('#quantity');
            if (qtyInput) {
                const hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.name = 'quantity';
                hiddenInput.value = qtyInput.value;
                form.appendChild(hiddenInput);
            }
            form.submit();
        });
    });

    // --- Image Gallery (From 2) ---
    const mainImage = document.getElementById('main-product-image');
    const thumbnails = document.querySelectorAll('.thumbnail');
    thumbnails.forEach(thumbnail => {
        thumbnail.addEventListener('click', function () {
            if (mainImage) {
                mainImage.src = this.dataset.image;
            }
            thumbnails.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // --- Fade-in (From 1) ---
    const fadeElems = document.querySelectorAll('.fade-in');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });
    fadeElems.forEach(elem => observer.observe(elem));

    // --- Image Preview (Current preserved) ---
    function previewImages(input) {
        const preview = input.nextElementSibling;
        preview.innerHTML = '';
        const urls = input.value.split(',').map(u => u.trim());
        urls.forEach(url => {
            const img = document.createElement('img');
            img.src = url;
            preview.appendChild(img);
        });
    }

    // --- Admin Table Search & Sort (Current preserved) ---
    const productSearch = document.getElementById('productSearch');
    if (productSearch) {
        productSearch.addEventListener('input', () => {
            const query = productSearch.value.toLowerCase();
            document.querySelectorAll('#productTable tbody tr').forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(query) ? '' : 'none';
            });
        });
    }

    const tableHeaders = document.querySelectorAll('.admin-table th[data-sort]');
    tableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const table = header.closest('table');
            const tbody = table.tBodies[0];
            const rows = Array.from(tbody.rows);
            const index = Array.from(header.parentNode.children).indexOf(header);
            const dir = header.dataset.dir = header.dataset.dir === 'asc' ? 'desc' : 'asc';
            rows.sort((a, b) => {
                let valA = a.cells[index].textContent.trim();
                let valB = b.cells[index].textContent.trim();
                if (header.dataset.sort === 'price' || header.dataset.sort === 'ratings') {
                    valA = parseFloat(valA.replace('$', ''));
                    valB = parseFloat(valB.replace('$', ''));
                }
                return dir === 'asc' ? valA > valB ? 1 : -1 : valA < valB ? 1 : -1;
            });
            rows.forEach(row => tbody.appendChild(row));
        });
    });
});