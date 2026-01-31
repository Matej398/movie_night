// ... (Keep constants)
const API_URL = 'api/movies.php';
const IMDB_SEARCH_URL = 'api/imdb_search.php';
const IMDB_DETAILS_URL = 'api/imdb_details.php';
const STREAMING_CHECK_URL = 'api/streaming_check.php';

// Custom Toast Notification
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        error: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
        success: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
        warning: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
        info: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
    };

    toast.innerHTML = `
        ${icons[type] || icons.info}
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    `;

    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, duration);
}

// Custom Confirm Dialog
function showConfirm(message, title = 'Confirm') {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal');
        const titleEl = document.getElementById('confirm-title');
        const messageEl = document.getElementById('confirm-message');
        const okBtn = document.getElementById('confirm-ok');
        const cancelBtn = document.getElementById('confirm-cancel');

        if (!modal) {
            resolve(false);
            return;
        }

        titleEl.textContent = title;
        messageEl.textContent = message;
        modal.classList.remove('hidden');

        const cleanup = () => {
            // Defer DOM updates to avoid blocking
            requestAnimationFrame(() => {
                modal.classList.add('hidden');
                okBtn.onclick = null;
                cancelBtn.onclick = null;
                modal.onclick = null;
            });
        };

        okBtn.onclick = () => {
            // Resolve immediately for instant response
            resolve(true);
            // Cleanup in next frame (non-blocking)
            cleanup();
        };

        cancelBtn.onclick = () => {
            // Resolve immediately for instant response
            resolve(false);
            // Cleanup in next frame (non-blocking)
            cleanup();
        };

        modal.onclick = (e) => {
            if (e.target === modal) {
                // Resolve immediately for instant response
                resolve(false);
                // Cleanup in next frame (non-blocking)
                cleanup();
            }
        };
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // ... (Keep refs)
    const grid = document.getElementById('movies-grid');
    const addForm = document.getElementById('add-movie-form');
    const openAddModalBtn = document.getElementById('open-add-modal');
    const closeAddModalBtn = document.getElementById('close-add-modal');
    const cancelAddBtn = document.getElementById('cancel-add');
    const addModal = document.getElementById('add-movie-modal');
    const manualEntryToggle = document.getElementById('manual-entry-toggle'); // New

    const searchInput = document.getElementById('search-input');
    const genreFilter = document.getElementById('genre-filter');
    const navLibrary = document.getElementById('nav-library');
    const navWatched = document.getElementById('nav-watched');
    const navLibraryMobile = document.getElementById('nav-library-mobile');
    const navWatchedMobile = document.getElementById('nav-watched-mobile');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mainNav = document.getElementById('main-nav');
    const logoutBtnMobile = document.getElementById('logout-btn-mobile');
    const changePasswordBtnMobile = document.getElementById('change-password-btn-mobile');
    const imdbSearchInput = document.getElementById('imdb-search');
    const imdbResults = document.getElementById('imdb-results');

    const detailsModal = document.getElementById('movie-modal');
    const closeDetailsModalBtn = document.getElementById('close-details-modal');

    // Trailer Modal Refs
    const trailerModal = document.getElementById('trailer-modal');
    const closeTrailerModalBtn = document.getElementById('close-trailer-modal');
    const trailerIframe = document.getElementById('trailer-iframe');

    // Modal Fields
    const modalTitle = document.getElementById('modal-title');
    const modalImg = document.getElementById('modal-img');
    const modalYear = document.getElementById('modal-year');
    const modalGenre = document.getElementById('modal-genre');
    const modalDesc = document.getElementById('modal-desc');
    const modalTrailer = document.getElementById('modal-trailer');
    // const modalJustWatch = document.getElementById('modal-justwatch'); // Removed
    const modalToggleStatus = document.getElementById('modal-toggle-status');
    const modalDelete = document.getElementById('modal-delete');

    // Auth Elements
    const userDisplayNameText = document.getElementById('user-display-name-text');
    const userDisplayName = document.getElementById('user-display-name');
    const logoutBtn = document.getElementById('logout-btn');
    const logoutBtnDesktop = document.getElementById('logout-btn-desktop');
    const mobileMenuClose = document.getElementById('mobile-menu-close');

    // User Dropdown Elements
    const userDropdown = document.querySelector('.user-dropdown');
    const userDropdownMenu = document.getElementById('user-dropdown-menu');
    const changePasswordBtn = document.getElementById('change-password-btn');

    // Change Password Elements
    const changePasswordModal = document.getElementById('change-password-modal');
    const closeChangePasswordModalBtn = document.getElementById('close-change-password-modal');
    const cancelChangePasswordBtn = document.getElementById('cancel-change-password');
    const changePasswordForm = document.getElementById('change-password-form');
    const changePasswordError = document.getElementById('change-password-error');
    const submitChangePasswordBtn = document.getElementById('submit-change-password');

    let movies = [];
    let currentView = 'to_watch';
    let searchDebounceTimeout;

    // Helper function to decode HTML entities
    function decodeHtmlEntities(text) {
        if (!text) return text;
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    }

    // Helper function to truncate description to max lines, ending at sentence boundaries
    function truncateDescription(text, maxLines = 5) {
        if (!text) return text;

        // Approximate chars per line (based on modal width and font size)
        const charsPerLine = 85;
        const maxChars = charsPerLine * maxLines;

        // If text is short enough, return as-is
        if (text.length <= maxChars) return text;

        // Find sentence boundaries (., !, ?)
        const sentenceEndRegex = /[.!?]\s+/g;
        let lastSentenceEnd = 0;
        let match;

        while ((match = sentenceEndRegex.exec(text)) !== null) {
            const endPos = match.index + 1; // Include the punctuation
            if (endPos <= maxChars) {
                lastSentenceEnd = endPos;
            } else {
                break;
            }
        }

        // If we found a sentence boundary, use it
        if (lastSentenceEnd > 0) {
            return text.substring(0, lastSentenceEnd).trim();
        }

        // No sentence boundary found within limit, try to end at a word boundary
        const truncated = text.substring(0, maxChars);
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > maxChars * 0.7) {
            return truncated.substring(0, lastSpace).trim() + '...';
        }

        // Fallback: hard truncate
        return truncated.trim() + '...';
    }

    // Helper function to determine availability status
    function getAvailabilityStatus(movie) {
        const currentYear = new Date().getFullYear();
        const movieYear = parseInt(movie.year) || 0;

        // Future release
        if (movieYear > currentYear) {
            return { text: 'Coming Soon', class: 'coming-soon' };
        }

        // Current year release with no streaming platforms
        if (movieYear === currentYear && (!movie.platforms || movie.platforms.length === 0)) {
            return { text: 'Coming Soon', class: 'coming-soon' };
        }

        return null; // Available
    }

    // Helper function to get rating badge icon SVG
    function getRatingBadgeIcon(rating) {
        const icons = {
            loved: '<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
            liked: '<svg viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>',
            disliked: '<svg viewBox="0 0 24 24"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>'
        };
        return icons[rating] || '';
    }

    // Helper to get item type label (movie or show)
    function getTypeLabel(movie) {
        return movie.type === 'series' ? 'show' : 'movie';
    }

    // Check Authentication
    fetch('api/auth.php?action=check')
        .then(res => res.json())
        .then(data => {
            if (!data.logged_in) {
                window.location.href = 'login.html';
            } else {
                if (userDisplayNameText) userDisplayNameText.textContent = data.username;
                // Load movies only after auth check passes
                fetchMovies();
            }
        })
        .catch(() => {
            // If auth check fails entirely (network error), redirect to login
            window.location.href = 'login.html';
        });

    // Logout Handler
    const handleLogout = async () => {
        closeUserDropdown(); // Close dropdown if open
        await fetch('api/auth.php?action=logout', { method: 'POST' });
        localStorage.removeItem('movies_cache'); // Clear cache on logout
        window.location.href = 'login.html';
    };

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    if (logoutBtnDesktop) {
        logoutBtnDesktop.addEventListener('click', handleLogout);
    }

    // User Dropdown Handlers - Add delay for better UX
    let dropdownHideTimeout;
    let isDropdownVisible = false;

    const showDropdown = (e) => {
        // Clear any pending hide timeout
        if (dropdownHideTimeout) {
            clearTimeout(dropdownHideTimeout);
            dropdownHideTimeout = null;
        }
        if (userDropdown && userDropdownMenu && !isDropdownVisible) {
            isDropdownVisible = true;
            userDropdownMenu.style.opacity = '1';
            userDropdownMenu.style.visibility = 'visible';
            userDropdownMenu.style.transform = 'translateY(0)';
            userDropdownMenu.style.pointerEvents = 'auto';
            userDropdownMenu.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
        }
    };

    const hideDropdown = (e) => {
        // Don't hide if mouse is moving to dropdown
        if (e && e.relatedTarget && userDropdownMenu && userDropdownMenu.contains(e.relatedTarget)) {
            return;
        }

        // Add delay before hiding to allow user to move mouse to dropdown
        dropdownHideTimeout = setTimeout(() => {
            if (userDropdown && userDropdownMenu && isDropdownVisible) {
                isDropdownVisible = false;
                userDropdownMenu.style.opacity = '0';
                userDropdownMenu.style.visibility = 'hidden';
                userDropdownMenu.style.transform = 'translateY(-10px)';
                userDropdownMenu.style.pointerEvents = 'none';
            }
        }, 200); // 200ms delay - gives user time to move mouse
    };

    const closeUserDropdown = () => {
        if (dropdownHideTimeout) {
            clearTimeout(dropdownHideTimeout);
            dropdownHideTimeout = null;
        }
        if (userDropdown && userDropdownMenu) {
            isDropdownVisible = false;
            userDropdownMenu.style.opacity = '0';
            userDropdownMenu.style.visibility = 'hidden';
            userDropdownMenu.style.transform = 'translateY(-10px)';
            userDropdownMenu.style.pointerEvents = 'none';
        }
    };

    // Add hover event listeners for better control with delay
    if (userDropdown) {
        userDropdown.addEventListener('mouseenter', showDropdown);
        userDropdown.addEventListener('mouseleave', hideDropdown);
    }

    if (userDropdownMenu) {
        userDropdownMenu.addEventListener('mouseenter', showDropdown);
        userDropdownMenu.addEventListener('mouseleave', hideDropdown);
    }

    // Change Password Modal Handlers
    const openChangePasswordModal = () => {
        closeUserDropdown(); // Close dropdown when opening modal
        if (changePasswordModal) {
            changePasswordModal.classList.remove('hidden');
            changePasswordForm.reset();
            changePasswordError.style.display = 'none';
            changePasswordError.textContent = '';
        }
    };

    const closeChangePasswordModal = () => {
        if (changePasswordModal) {
            changePasswordModal.classList.add('hidden');
            changePasswordForm.reset();
            changePasswordError.style.display = 'none';
            changePasswordError.textContent = '';
        }
    };

    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', openChangePasswordModal);
    }
    if (closeChangePasswordModalBtn) {
        closeChangePasswordModalBtn.addEventListener('click', closeChangePasswordModal);
    }
    if (cancelChangePasswordBtn) {
        cancelChangePasswordBtn.addEventListener('click', closeChangePasswordModal);
    }
    if (changePasswordModal) {
        changePasswordModal.addEventListener('click', (e) => {
            if (e.target === changePasswordModal) {
                closeChangePasswordModal();
            }
        });
    }

    // Change Password Form Handler
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            // Clear previous errors
            changePasswordError.style.display = 'none';
            changePasswordError.textContent = '';

            // Client-side validation
            if (!currentPassword || !newPassword || !confirmPassword) {
                changePasswordError.textContent = 'All fields are required';
                changePasswordError.style.display = 'block';
                return;
            }

            if (newPassword !== confirmPassword) {
                changePasswordError.textContent = 'New passwords do not match';
                changePasswordError.style.display = 'block';
                return;
            }

            if (newPassword.length < 6) {
                changePasswordError.textContent = 'New password must be at least 6 characters';
                changePasswordError.style.display = 'block';
                return;
            }

            // Disable submit button
            submitChangePasswordBtn.disabled = true;
            submitChangePasswordBtn.textContent = 'Changing...';

            try {
                const res = await fetch('api/auth.php?action=change-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        current_password: currentPassword,
                        new_password: newPassword,
                        confirm_password: confirmPassword
                    })
                });

                const data = await res.json();

                if (res.ok && data.success) {
                    showToast('Password changed successfully', 'success');
                    closeChangePasswordModal();
                } else {
                    changePasswordError.textContent = data.error || 'Failed to change password';
                    changePasswordError.style.display = 'block';
                }
            } catch (err) {
                changePasswordError.textContent = 'Connection error. Please try again.';
                changePasswordError.style.display = 'block';
            } finally {
                submitChangePasswordBtn.disabled = false;
                submitChangePasswordBtn.textContent = 'Change Password';
            }
        });
    }

    // Icons
    const icons = {
        check: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
        undo: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>`,
        play: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
        star: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
        trash: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`
    };

    // Helper to get optimized image URL and force English locale
    function getOptimizedImageUrl(url, width = 600) {
        if (!url) return url;

        // If it's not an Amazon/IMDb image, return as-is
        if (!url.includes('media-amazon.com')) return url;

        try {
            // Force US CDN first
            url = url.replace(/https?:\/\/[^\/]+\.media-amazon\.com/i, 'https://m.media-amazon.com');

            // Parse URL
            const urlObj = new URL(url);
            let pathname = urlObj.pathname;

            // Remove any existing query parameters
            url = url.split('?')[0];

            // Extract base path - IMDb URLs have pattern: /images/M/[path]/_V1_[params].jpg
            // We need everything before _V1_
            let basePath = '';

            // Try multiple patterns to extract base path
            if (pathname.includes('_V1_')) {
                // Split at _V1_ and take everything before it
                const parts = pathname.split('_V1_');
                basePath = parts[0];
            } else if (pathname.match(/\/images\/M\/.+/i)) {
                // Extract /images/M/... path
                const match = pathname.match(/^(\/images\/M\/[^\/]+(?:\/[^\/]+)*)/i);
                if (match) {
                    basePath = match[1];
                } else {
                    // Fallback: remove filename
                    basePath = pathname.replace(/\/[^\/]*\.jpg$/i, '');
                }
            } else {
                // Last resort: remove filename
                basePath = pathname.replace(/\/[^\/]*\.jpg$/i, '');
            }

            // Ensure basePath starts with /
            if (!basePath.startsWith('/')) {
                basePath = '/' + basePath;
            }

            // Calculate height for poster aspect ratio (2:3)
            const height = Math.round(width * 1.5);

            // Force US CDN and rebuild URL with English locale parameters
            // AL_ = English locale (American), QL75 = quality 75%, UX = width, CR = crop
            // Using AL_ ensures we get English/American posters, not German ones
            const englishUrl = `https://m.media-amazon.com${basePath}/_V1_QL75_UX${width}_CR0,0,${width},${height}_AL_.jpg`;

            return englishUrl;
        } catch (e) {
            // If URL parsing fails, try aggressive replacement
            console.warn('Image URL transformation failed:', e);
            // Force US CDN and add English locale parameter
            let fixed = url.replace(/https?:\/\/[^\/]+\.media-amazon\.com/i, 'https://m.media-amazon.com');
            // Remove any existing _V1_ params and add English one
            fixed = fixed.replace(/_V1_.*?\.jpg$/i, '_V1_QL75_AL_.jpg');
            // If no _V1_ found, try to add it before .jpg
            if (!fixed.includes('_V1_')) {
                fixed = fixed.replace(/\.jpg$/i, '_V1_QL75_AL_.jpg');
            }
            return fixed;
        }
    }

    // --- Add Movie Modal ---
    function openAddModal() {
        addModal.classList.remove('hidden');
        // Reset view: hide form, show toggle, clear search
        addForm.classList.add('hidden');
        manualEntryToggle.classList.remove('hidden');
        imdbSearchInput.value = '';
        imdbSearchInput.focus();
    }

    function closeAddModal() {
        addModal.classList.add('hidden');
        addForm.reset();
        imdbSearchInput.value = '';
        document.getElementById('rating').value = '';
        imdbResults.classList.add('hidden');
    }

    // Manual Entry Toggle
    manualEntryToggle.addEventListener('click', () => {
        addForm.classList.remove('hidden');
        manualEntryToggle.classList.add('hidden');
    });

    openAddModalBtn.addEventListener('click', openAddModal);
    closeAddModalBtn.addEventListener('click', closeAddModal);
    cancelAddBtn.addEventListener('click', closeAddModal);
    addModal.addEventListener('click', (e) => {
        if (e.target === addModal) closeAddModal();
    });

    // --- Trailer Modal ---
    function openTrailerModal(title) {
        // YouTube doesn't allow embedding search results directly
        // Automatically open YouTube search in a new tab
        const query = encodeURIComponent(title + ' trailer');
        const youtubeUrl = `https://www.youtube.com/results?search_query=${query}`;

        // Open directly in new tab
        window.open(youtubeUrl, '_blank');
    }

    function closeTrailerModal() {
        trailerModal.classList.add('hidden');
        // Reset container for next time (iframe will be recreated when modal opens)
        const container = document.querySelector('.video-container');
        if (container) {
            container.innerHTML = '<iframe id="trailer-iframe" src="" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
        }
    }

    closeTrailerModalBtn.addEventListener('click', closeTrailerModal);
    trailerModal.addEventListener('click', (e) => {
        if (e.target === trailerModal) closeTrailerModal();
    });


    // --- Details Modal ---
    function closeDetailsModal() {
        detailsModal.classList.add('hidden');
    }
    closeDetailsModalBtn.addEventListener('click', closeDetailsModal);
    detailsModal.addEventListener('click', (e) => {
        if (e.target === detailsModal) closeDetailsModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const confirmModal = document.getElementById('confirm-modal');
            if (confirmModal && !confirmModal.classList.contains('hidden')) {
                confirmModal.classList.add('hidden');
                return; // Prioritize confirm modal
            }
            if (!trailerModal.classList.contains('hidden')) {
                closeTrailerModal();
                return; // Prioritize top modal
            }
            if (!addModal.classList.contains('hidden')) {
                if (!imdbResults.classList.contains('hidden')) {
                    imdbResults.classList.add('hidden');
                } else {
                    closeAddModal();
                }
            }
            if (!detailsModal.classList.contains('hidden')) {
                closeDetailsModal();
            }
        }
    });

    // ... (Keep AddForm Submit, Search/Filter, Fetch logic same as before) ...
    addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('title').value.trim();
        const year = document.getElementById('year').value.trim();

        // Check for duplicates
        const isDuplicate = movies.some(movie => {
            const titleMatch = movie.title.toLowerCase() === title.toLowerCase();
            if (year) return titleMatch && movie.year === year;
            return titleMatch;
        });

        if (isDuplicate) {
            showToast('This movie is already in your library!', 'warning');
            return;
        }

        // Create temporary movie object for optimistic UI
        const tempId = 'temp-' + Date.now();
        const mediaType = addForm.dataset.mediaType || 'movie';
        const totalSeasons = addForm.dataset.totalSeasons || null;

        const optimisticMovie = {
            id: tempId,
            title: title,
            year: year,
            genre: document.getElementById('genre').value,
            image_url: document.getElementById('image_url').value,
            trailer_url: document.getElementById('trailer_url').value,
            description: document.getElementById('description').value,
            rating: document.getElementById('rating').value,
            type: mediaType,
            totalSeasons: totalSeasons,
            platforms: [],
            created_at: new Date().toISOString(),
            status: 'to_watch' // Default status
        };

        // Reset form dataset for next use
        delete addForm.dataset.mediaType;
        delete addForm.dataset.totalSeasons;

        // --- Optimistic UI Update START ---
        // 1. Close modal immediately
        closeAddModal();
        showToast('Adding movie...', 'info', 2000);

        // 2. Add to local list immediately
        movies.unshift(optimisticMovie);

        // 3. Render immediately
        // Use View Transition if available for smooth insertion
        if (document.startViewTransition) {
            document.startViewTransition(() => {
                renderMovies(false);
                updateGenreFilter();
            });
        } else {
            renderMovies(false);
            updateGenreFilter();
        }
        // --- Optimistic UI Update END ---

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(optimisticMovie) // Send data (server will ignore temp ID)
            });

            if (res.ok) {
                const savedMovie = await res.json();

                // Replace temp movie with real one
                const index = movies.findIndex(m => m.id === tempId);
                if (index !== -1) {
                    movies[index] = savedMovie;
                    // Update cache
                    localStorage.setItem('movies_cache', JSON.stringify(movies));

                    // Update the DOM element with the real ID so it becomes clickable
                    const tempCard = document.querySelector(`.movie-card[data-movie-id="${tempId}"]`);
                    if (tempCard) {
                        tempCard.dataset.movieId = savedMovie.id;
                        // Update any specific visual state if needed, but the ID is key for the delegate listener
                    } else {
                        // Fallback: just re-render if card not found for some reason
                        renderMovies(false);
                    }

                    // Check streaming platforms in background
                    console.log('Checking platforms for:', savedMovie.title);
                    checkStreamingPlatforms(savedMovie.title, savedMovie.year, savedMovie.id);

                    showToast(`${movie.type === 'series' ? 'Show' : 'Movie'} saved!`, 'success');
                }
            } else {
                throw new Error('Server error');
            }
        } catch (err) {
            console.error('Error adding movie:', err);
            // Revert UI
            movies = movies.filter(m => m.id !== tempId);
            renderMovies(false);
            showToast('Failed to add movie. Please try again.', 'error');
            // Re-open modal with data? Maybe too intrusive.
        }
    });

    async function checkStreamingPlatforms(title, year, movieId) {
        console.log(`Starting platform check for ${title} (${year}) ID: ${movieId}`);

        // 1. Server Check (Promise) - IMPROVED to check multiple regions
        const serverCheck = (async () => {
            try {
                const platformUrl = `${STREAMING_CHECK_URL}?title=${encodeURIComponent(title)}${year ? '&year=' + encodeURIComponent(year) : ''}&debug=1`;
                const res = await fetch(platformUrl);
                if (res.ok) {
                    const text = await res.text();
                    let data;
                    try {
                        data = JSON.parse(text);
                    } catch (parseError) {
                        console.error('Failed to parse JSON response:', parseError);
                        console.error('Response text:', text.substring(0, 500));
                        return false;
                    }

                    console.log('Server check result:', data);

                    // Show debug info
                    if (data.debug) {
                        console.log('Debug info:', data.debug);
                        if (data.debug.error) {
                            console.warn('Error:', data.debug.error);
                        }
                        if (data.debug.platforms_found) {
                            console.log('Platforms found in HTML:', data.debug.platforms_found);
                        }
                    }

                    if (data.platforms && data.platforms.length > 0) {
                        console.log('Found platforms:', data.platforms);
                        updateMoviePlatforms(movieId, data.platforms);
                        return true;
                    } else {
                        console.warn('No platforms found. Check debug data above for what JustWatch returned.');
                    }
                } else {
                    const errorText = await res.text();
                    console.error('Server check failed with status:', res.status);
                    console.error('Response:', errorText.substring(0, 500));
                }
            } catch (e) {
                console.error('Server platform check failed:', e);
            }
            return false;
        })();

        // Client check removed due to CORS/Proxy issues. Relying on improved server-side check.

        Promise.allSettled([serverCheck]).then(() => {
            console.log('All platform checks finished');
        });
    }

    function updateMoviePlatforms(movieId, platforms) {
        // Normalize platforms input to array of objects
        // platforms can be strings or objects
        const platformData = platforms.map(p => {
            if (typeof p === 'string') return { name: p, url: null };
            return p;
        });

        const movie = movies.find(m => String(m.id) === String(movieId));
        if (movie) {
            // Merge with existing if any? Or overwrite?
            // Usually overwrite is safer to avoid duplicates, but merging allows accumulating from different sources
            // Let's overwrite for now to keep it clean
            movie.platforms = platformData;
            localStorage.setItem('movies_cache', JSON.stringify(movies));

            // Silently update server
            fetch(API_URL, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: movieId, platforms: platformData })
            });

            // Force re-render
            renderMovies(false);

            // Show toast only if we actually found something
            if (platformData.length > 0) {
                // showToast(`Found streaming on: ${platformData.length} platforms`, 'success');
            }
        }
    }

    // ... (Keep Search Input listeners) ...
    let renderDebounceTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(renderDebounceTimeout);
        renderDebounceTimeout = setTimeout(() => {
            renderMovies(false); // Search/filter - render all at once
        }, 150); // Debounce search input
    });
    genreFilter.addEventListener('change', () => renderMovies(false));

    // Mobile menu toggle
    if (mobileMenuToggle && mainNav) {
        mobileMenuToggle.addEventListener('click', () => {
            mainNav.classList.toggle('mobile-open');
        });

        // Close mobile menu when clicking nav buttons or logout
        const closeMobileMenu = () => {
            if (window.innerWidth <= 850) {
                mainNav.classList.remove('mobile-open');
            }
        };

        if (navLibraryMobile) {
            navLibraryMobile.addEventListener('click', () => {
                if (navLibrary) navLibrary.click();
                closeMobileMenu();
            });
        }
        if (navWatchedMobile) {
            navWatchedMobile.addEventListener('click', () => {
                if (navWatched) navWatched.click();
                closeMobileMenu();
            });
        }
        if (changePasswordBtnMobile) {
            changePasswordBtnMobile.addEventListener('click', () => {
                openChangePasswordModal();
                closeMobileMenu();
            });
        }
        if (logoutBtnMobile) {
            logoutBtnMobile.addEventListener('click', () => {
                handleLogout();
                closeMobileMenu();
            });
        }

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 850 &&
                !mainNav.contains(e.target) &&
                !mobileMenuToggle.contains(e.target) &&
                mainNav.classList.contains('mobile-open')) {
                mainNav.classList.remove('mobile-open');
            }
        });
    }

    navLibrary.addEventListener('click', () => {
        currentView = 'to_watch';
        updateNavState();
        renderMovies(false); // View change - render all at once
    });
    navWatched.addEventListener('click', () => {
        currentView = 'watched';
        updateNavState();
        renderMovies(false); // View change - render all at once
    });

    function updateNavState() {
        const setActive = (active, inactive) => {
            if (active) active.classList.add('active');
            if (inactive) inactive.classList.remove('active');
        };

        if (currentView === 'to_watch') {
            setActive(navLibrary, navWatched);
            setActive(navLibraryMobile, navWatchedMobile);
            openAddModalBtn.style.display = 'flex';
        } else {
            setActive(navWatched, navLibrary);
            setActive(navWatchedMobile, navLibraryMobile);
            openAddModalBtn.style.display = 'none';
        }
    }

    // ... (Keep IMDb Search & Suggestion Logic) ...
    imdbSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        clearTimeout(searchDebounceTimeout);
        if (query.length < 2) {
            imdbResults.classList.add('hidden');
            return;
        }
        // Reduced debounce for faster response
        searchDebounceTimeout = setTimeout(() => fetchImdbSuggestions(query), 150);
    });

    document.addEventListener('click', (e) => {
        if (!imdbSearchInput.contains(e.target) && !imdbResults.contains(e.target)) {
            imdbResults.classList.add('hidden');
        }
    });

    // Event Delegation for Movie Cards
    grid.addEventListener('click', (e) => {
        const card = e.target.closest('.movie-card');
        if (card) {
            const movieId = card.dataset.movieId;
            const movie = movies.find(m => String(m.id) === String(movieId));
            if (movie) {
                openDetailsModal(movie);
            }
        }
    });

    async function fetchImdbSuggestions(query) {
        try {
            // Abort previous request if still pending
            if (window.currentImdbRequest) {
                window.currentImdbRequest.abort();
            }

            const controller = new AbortController();
            window.currentImdbRequest = controller;

            const res = await fetch(`${IMDB_SEARCH_URL}?q=${encodeURIComponent(query)}`, {
                signal: controller.signal
            });

            // Check if this request was aborted
            if (controller.signal.aborted) return;

            const results = await res.json();
            renderImdbResults(results);
            window.currentImdbRequest = null;
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error searching IMDb:', err);
            }
            window.currentImdbRequest = null;
        }
    }

    function renderImdbResults(results) {
        if (!results || results.length === 0) {
            imdbResults.innerHTML = '';
            imdbResults.classList.add('hidden');
            return;
        }

        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        results.forEach(item => {
            const div = document.createElement('div');
            div.className = 'imdb-result-item';
            const imgSrc = item.image ? item.image : '';
            const imgHtml = imgSrc
                ? `<img src="${imgSrc}" class="imdb-result-img" alt="" loading="lazy">`
                : `<div class="imdb-result-img" style="display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:#aaa;">No Img</div>`;
            div.innerHTML = `${imgHtml}<div class="imdb-result-info"><div class="imdb-result-title">${item.title}</div><div class="imdb-result-year">${item.year || ''}</div></div>`;

            div.addEventListener('click', () => {
                // Optimistic UI
                document.getElementById('title').value = item.title || '';
                document.getElementById('year').value = item.year || '';
                let img = item.image || '';
                if (img.includes('_V1_')) img = img.replace(/_V1_.*?.jpg$/, '_V1_.jpg');
                document.getElementById('image_url').value = img;

                imdbResults.classList.add('hidden');
                imdbSearchInput.value = '';

                // Reveal form and hide toggle
                addForm.classList.remove('hidden');
                manualEntryToggle.classList.add('hidden');

                // Fetch details
                fetchImdbDetails(item.id);
            });
            fragment.appendChild(div);
        });

        imdbResults.innerHTML = '';
        imdbResults.appendChild(fragment);
        imdbResults.classList.remove('hidden');
    }

    async function fetchImdbDetails(id) {
        // ... (Keep details fetch logic) ...
        const submitBtn = addForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Loading data...';
        document.body.style.cursor = 'wait';

        try {
            const res = await fetch(`${IMDB_DETAILS_URL}?id=${id}`);
            const details = await res.json();

            if (details.error) {
                console.error('Server Error:', details.error);
                // Don't alert, just log, let user fill manual
                return;
            }

            document.getElementById('title').value = details.title || '';
            document.getElementById('year').value = details.year || '';
            document.getElementById('genre').value = details.genre || '';
            document.getElementById('image_url').value = details.image_url || '';
            document.getElementById('trailer_url').value = details.trailer_url || '';
            document.getElementById('description').value = details.description || '';
            document.getElementById('rating').value = details.rating || '';

            // Store type and totalSeasons for TV show handling
            if (details.type) {
                addForm.dataset.mediaType = details.type;
            }
            if (details.totalSeasons) {
                addForm.dataset.totalSeasons = details.totalSeasons;
            }

        } catch (err) {
            console.error('Error fetching details:', err);
        } finally {
            submitBtn.textContent = originalText;
            document.body.style.cursor = 'default';
        }
    }

    // ... (Keep Fetch Movies & Render Logic) ...
    async function fetchMovies() {
        // Try to load from local storage first for instant render
        const cachedMovies = localStorage.getItem('movies_cache');
        if (cachedMovies) {
            try {
                const parsed = JSON.parse(cachedMovies);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    movies = parsed;
                    renderMovies(false);
                    updateGenreFilter();
                }
            } catch (e) {
                console.error('Error parsing cached movies:', e);
            }
        }

        try {
            const res = await fetch(API_URL);
            const newMovies = await res.json();

            // Sort movies by created_at (newest first) or by id (newest first)
            // This ensures newly added movies always appear at the top
            newMovies.sort((a, b) => {
                // First try to sort by created_at if available (most reliable)
                if (a.created_at && b.created_at) {
                    return new Date(b.created_at) - new Date(a.created_at);
                }
                // If only one has created_at, prioritize it
                if (a.created_at && !b.created_at) return -1;
                if (!a.created_at && b.created_at) return 1;
                // Fallback: sort by id
                // uniqid() generates strings, so compare as strings
                // Newer uniqid() strings are typically longer or lexicographically greater
                const idA = String(a.id || '');
                const idB = String(b.id || '');
                return idB.localeCompare(idA);
            });

            // Only update if different
            if (JSON.stringify(newMovies) !== JSON.stringify(movies)) {
                movies = newMovies;
                // Update cache
                localStorage.setItem('movies_cache', JSON.stringify(movies));

                // Add delay before rendering to reduce initial CPU spike
                requestAnimationFrame(() => {
                    renderMovies(true);

                    // Defer genre filter update significantly to avoid blocking
                    if (window.requestIdleCallback) {
                        requestIdleCallback(() => updateGenreFilter(), { timeout: 3000 });
                    } else {
                        setTimeout(() => updateGenreFilter(), 1000);
                    }
                });
            }
        } catch (err) {
            console.error('Error fetching movies:', err);
            if (movies.length === 0) {
                grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Failed to load movies.</p>';
            }
        }
    }

    function renderMovies(incremental = false) {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedGenre = genreFilter.value;

        // Cache filtered results to avoid re-filtering
        let filtered = movies.filter(movie => {
            if (movie.status !== currentView) return false;
            const matchesSearch = movie.title.toLowerCase().includes(searchTerm) ||
                (movie.genre && movie.genre.toLowerCase().includes(searchTerm));
            if (!matchesSearch) return false;

            // Handle special type filters
            if (selectedGenre === '__tv_shows__') {
                if (movie.type !== 'series') return false;
            } else if (selectedGenre === '__movies__') {
                if (movie.type === 'series') return false;
            } else if (selectedGenre && (!movie.genre || !movie.genre.includes(selectedGenre))) {
                return false;
            }
            return true;
        });

        // Ensure filtered results are sorted by newest first
        filtered.sort((a, b) => {
            if (a.created_at && b.created_at) {
                return new Date(b.created_at) - new Date(a.created_at);
            }
            const idA = parseInt(a.id) || a.id;
            const idB = parseInt(b.id) || b.id;
            if (typeof idA === 'number' && typeof idB === 'number') {
                return idB - idA;
            }
            // For uniqid() strings, compare as strings
            return String(idB).localeCompare(String(idA));
        });

        if (filtered.length === 0) {
            const msg = currentView === 'to_watch' ? 'Your library is empty.' : 'No watched movies yet.';
            grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); margin-top: 40px;">${msg}</p>`;
            return;
        }

        // For large lists, render incrementally
        if (incremental && filtered.length > 20) {
            // Recycle existing cards
            const existingCards = Array.from(grid.children);
            const existingCardMap = new Map();
            existingCards.forEach(card => {
                if (card.dataset.movieId) {
                    existingCardMap.set(card.dataset.movieId, card);
                }
            });

            // Remove cards that are no longer needed
            existingCards.forEach(card => {
                const movieId = card.dataset.movieId;
                if (movieId && !filtered.some(m => m.id == movieId)) {
                    card.remove();
                }
            });

            let index = 0;
            const batchSize = 8; // Increased batch size

            const renderBatch = () => {
                const startTime = performance.now();
                const end = Math.min(index + batchSize, filtered.length);
                const fragment = document.createDocumentFragment();

                for (let i = index; i < end; i++) {
                    const movie = filtered[i];
                    let card = existingCardMap.get(movie.id);

                    if (!card) {
                        card = createMovieCard(movie);
                        fragment.appendChild(card);
                    } else {
                        // If card exists, just re-append to ensure order (or check if it needs moving)
                        // For simplicity in batching, we just ensure it's in the map to be appended later or
                        // we can append it to fragment if we want to strictly reorder.
                        // But moving elements can be expensive.
                        // Simpler approach: if incremental, assume order is mostly mostly correct or just append new ones.
                        // But sorting matters.

                        // To guarantee order, we must append to fragment or grid in order.
                        // If it's already in grid, we can move it.
                        existingCardMap.delete(movie.id);
                        fragment.appendChild(card);
                    }

                    // Yield if taking too long
                    if (performance.now() - startTime > 10) {
                        if (fragment.children.length > 0) grid.appendChild(fragment);
                        index = i + 1;
                        requestAnimationFrame(renderBatch);
                        return;
                    }
                }

                if (fragment.children.length > 0) grid.appendChild(fragment);

                index = end;
                if (index < filtered.length) {
                    requestAnimationFrame(renderBatch);
                } else {
                    // Cleanup any remaining
                    existingCardMap.forEach(card => card.remove());
                }
            };

            requestAnimationFrame(renderBatch);
        } else {
            // Small lists or non-incremental - render all at once
            // Reuse elements to avoid image reload
            const existingCardMap = new Map();
            Array.from(grid.children).forEach(card => {
                if (card.dataset.movieId) {
                    existingCardMap.set(card.dataset.movieId, card);
                }
            });

            grid.innerHTML = '';
            const fragment = document.createDocumentFragment();

            filtered.forEach(movie => {
                let card = existingCardMap.get(movie.id);
                if (!card) {
                    card = createMovieCard(movie);
                }
                fragment.appendChild(card);
            });
            grid.appendChild(fragment);
        }
    }

    function createMovieCard(movie) {
        const div = document.createElement('div');
        div.className = 'movie-card';
        div.dataset.movieId = movie.id; // Store ID for efficient lookups

        const cardImage = document.createElement('div');
        cardImage.className = 'card-image';

        // Add TV badge for series
        if (movie.type === 'series') {
            const typeBadge = document.createElement('span');
            typeBadge.className = 'type-badge tv-show';
            typeBadge.textContent = 'TV Show';
            cardImage.appendChild(typeBadge);
        }

        // Add availability badge (Coming Soon / Not Streaming)
        const availabilityStatus = getAvailabilityStatus(movie);
        if (availabilityStatus) {
            const availBadge = document.createElement('span');
            availBadge.className = `availability-badge ${availabilityStatus.class}`;
            availBadge.textContent = availabilityStatus.text;
            cardImage.appendChild(availBadge);
        }

        // Add rating badge for watched movies (only in watched view)
        if (currentView === 'watched' && movie.user_rating) {
            const ratingBadge = document.createElement('span');
            ratingBadge.className = `rating-badge ${movie.user_rating}`;
            ratingBadge.innerHTML = getRatingBadgeIcon(movie.user_rating);
            cardImage.appendChild(ratingBadge);
        }

        if (movie.image_url && movie.image_url.trim() !== '') {
            const img = document.createElement('img');
            img.alt = decodeHtmlEntities(movie.title);
            img.className = 'movie-poster';
            img.loading = 'lazy'; // Native lazy loading
            img.decoding = 'async';

            // Set immediate src with English locale to avoid showing German images
            // This ensures we get English/American posters immediately
            const isImdbImage = movie.image_url.includes('media-amazon.com');

            if (isImdbImage) {
                // Set optimized English URL immediately (no delay)
                img.src = getOptimizedImageUrl(movie.image_url, 400);

                // Then try to upgrade to TMDB English poster in background (better quality)
                fetch(`api/get_english_poster.php?title=${encodeURIComponent(movie.title)}${movie.year ? '&year=' + encodeURIComponent(movie.year) : ''}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.success && data.image_url) {
                            // TMDB always returns English posters - upgrade if available
                            img.src = data.image_url;
                        }
                    })
                    .catch(() => {
                        // Keep the optimized IMDb URL if TMDB fails
                    });
            } else {
                // Not an IMDb image, set it immediately
                img.src = movie.image_url;

                // Try TMDB in background for consistency
                fetch(`api/get_english_poster.php?title=${encodeURIComponent(movie.title)}${movie.year ? '&year=' + encodeURIComponent(movie.year) : ''}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.success && data.image_url) {
                            img.src = data.image_url;
                        }
                    })
                    .catch(() => {
                        // Keep original URL if TMDB fails
                    });
            }

            img.onerror = function () {
                if (!this.classList.contains('image-error-handled')) {
                    this.classList.add('image-error-handled');
                    if (this.parentElement) {
                        this.parentElement.classList.add('loaded'); // Stop shimmer
                        const placeholder = document.createElement('div');
                        placeholder.className = 'no-image-placeholder';
                        placeholder.textContent = decodeHtmlEntities(movie.title);
                        this.parentElement.replaceChild(placeholder, this);
                    }
                }
            };

            img.onload = function () {
                this.classList.add('image-loaded');
                // Remove shimmer effect from parent
                if (this.parentElement) {
                    this.parentElement.classList.add('loaded');
                }
            };

            cardImage.appendChild(img);
        } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'no-image-placeholder';
            placeholder.textContent = decodeHtmlEntities(movie.title);
            cardImage.appendChild(placeholder);
        }

        const cardInfo = document.createElement('div');
        cardInfo.className = 'card-info';

        const headerRow = document.createElement('div');
        headerRow.className = 'card-header-row';

        const title = document.createElement('div');
        title.className = 'card-title';
        const decodedTitle = decodeHtmlEntities(movie.title);
        title.textContent = decodedTitle;
        title.title = decodedTitle;

        const year = document.createElement('div');
        year.className = 'card-year';
        year.textContent = movie.year || '';

        headerRow.appendChild(title);
        headerRow.appendChild(year);

        const genres = document.createElement('div');
        genres.className = 'card-genres';
        genres.textContent = movie.genre || '';

        cardInfo.appendChild(headerRow);
        cardInfo.appendChild(genres);

        div.appendChild(cardImage);
        div.appendChild(cardInfo);

        return div;
    }

    function getPlatformInfo(platform) {
        // Normalize platform name
        const p = platform.toLowerCase().replace(/\s+/g, '');

        // Map platform names to local file names (check .avif, .jpg, and .png)
        const localFileMap = {
            'netflix': ['netflix.avif', 'netflix.jpg', 'netflix.png'],
            'disneyplus': ['disneyplus.avif', 'disneyplus.jpg', 'disneyplus.png'],
            'skyshowtime': ['skyshowtime.avif', 'skyshowtime.jpg', 'skyshowtime.png'],
            'hbomax': ['max.avif', 'max.jpg', 'max.png', 'hbomax.avif', 'hbomax.jpg', 'hbomax.png'], // File is named max.avif
            'voyo': ['voyo.avif', 'voyo.jpg', 'voyo.png']
        };

        // Search URLs
        const searchUrls = {
            'netflix': 'https://www.netflix.com/search?q=',
            'disneyplus': 'https://www.disneyplus.com/en-gb/browse/search?q=',
            'skyshowtime': 'https://www.skyshowtime.com/watch/search?q=',
            'hbomax': 'https://play.hbomax.com/search?q=',
            'voyo': 'https://voyo.nova.cz/hledani?q=' // Assuming CZ, adjust if needed
        };

        // Fallback to external URLs if local files don't exist
        const fallbackLogos = {
            'netflix': 'https://m.media-amazon.com/images/I/31JfJ6dXD9L.png',
            'disneyplus': 'https://m.media-amazon.com/images/I/719t3jd2NeL.png',
            'skyshowtime': 'https://upload.wikimedia.org/wikipedia/commons/5/55/SkyShowtime_Logo.svg',
            'hbomax': 'https://upload.wikimedia.org/wikipedia/commons/1/17/HBO_Max_Logo.svg',
            'voyo': 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Voyo_Logo.svg'
        };

        let logoUrl = null;

        // Try local files first
        const fileOptions = localFileMap[p];
        if (fileOptions) {
            logoUrl = `images/${fileOptions[0]}`;
        } else {
            logoUrl = fallbackLogos[p];
        }

        return {
            logo: logoUrl,
            searchUrl: searchUrls[p] || null
        };
    }

    function openDetailsModal(movie) {
        // Set title with optional TV badge
        const titleText = decodeHtmlEntities(movie.title);
        if (movie.type === 'series') {
            modalTitle.innerHTML = `${titleText} <span class="modal-type-badge">TV Show</span>`;
        } else {
            modalTitle.textContent = titleText;
        }

        // Force refresh platforms if empty
        if (!movie.platforms || movie.platforms.length === 0) {
            console.log('Refreshing platforms for', movie.title);
            checkStreamingPlatforms(movie.title, movie.year, movie.id);
        }

        let ratingHtml = '';
        if (movie.rating) {
            ratingHtml = `<span class="star-rating" style="margin-left: 12px; display: flex; align-items: center; gap: 4px;">${icons.star} ${movie.rating}/10</span>`;
        }

        // Platform badges for modal (in separate row)
        const platformsContainer = document.getElementById('modal-platforms');
        const platforms = movie.platforms;
        if (Array.isArray(platforms)) {
            if (platforms.length > 0) {
                const badgesContainer = document.createElement('div');
                badgesContainer.className = 'modal-platform-badges';
                badgesContainer.style.display = 'inline-flex';
                badgesContainer.style.alignItems = 'center';
                badgesContainer.style.gap = '8px';

                platforms.forEach(platformData => {
                    let platformName = '';
                    let directUrl = null;

                    if (typeof platformData === 'string') {
                        platformName = platformData;
                    } else if (typeof platformData === 'object' && platformData !== null) {
                        platformName = platformData.name;
                        directUrl = platformData.url;
                    }

                    if (!platformName) return;

                    const platformInfo = getPlatformInfo(platformName);
                    const logoUrl = platformInfo.logo;

                    // Create link or span depending on whether we have a search URL or direct URL
                    let badge;
                    if (directUrl) {
                        badge = document.createElement('a');
                        badge.href = directUrl;
                        badge.target = '_blank';
                        badge.rel = 'noopener noreferrer';
                        badge.style.cursor = 'pointer';
                    } else if (platformInfo.searchUrl) {
                        badge = document.createElement('a');
                        badge.href = platformInfo.searchUrl + encodeURIComponent(movie.title);
                        badge.target = '_blank';
                        badge.rel = 'noopener noreferrer';
                        badge.style.cursor = 'pointer';
                    } else {
                        badge = document.createElement('span');
                    }

                    badge.className = `platform-badge platform-${platformName}`;
                    badge.title = `Watch on ${platformName}`;

                    if (logoUrl) {
                        const img = document.createElement('img');
                        img.alt = platformName;
                        img.loading = 'eager'; // Load immediately for badges
                        img.style.display = 'block';

                        // Try .avif first, fallback to .jpg if it fails
                        const tryLoadImage = (url) => {
                            img.src = url;
                        };

                        img.onerror = function () {
                            // Try different formats in order: .avif -> .jpg -> .png -> external URL
                            if (this.src.includes('.avif')) {
                                // Try .jpg next
                                const jpgUrl = this.src.replace('.avif', '.jpg');
                                this.src = jpgUrl;
                            } else if (this.src.includes('.jpg')) {
                                // Try .png next
                                const pngUrl = this.src.replace('.jpg', '.png');
                                this.src = pngUrl;
                            } else if (this.src.includes('.png') && this.src.includes('images/')) {
                                // If local .png fails, try external URL
                                const fallbackMap = {
                                    'netflix': 'https://m.media-amazon.com/images/I/31JfJ6dXD9L.png',
                                    'disneyplus': 'https://m.media-amazon.com/images/I/719t3jd2NeL.png',
                                    'skyshowtime': 'https://upload.wikimedia.org/wikipedia/commons/5/55/SkyShowtime_Logo.svg',
                                    'hbomax': 'https://upload.wikimedia.org/wikipedia/commons/1/17/HBO_Max_Logo.svg',
                                    'voyo': 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Voyo_Logo.svg'
                                };
                                const fallback = fallbackMap[platformName];
                                if (fallback) {
                                    this.src = fallback;
                                    return;
                                }
                            } else if (this.src.includes('images/')) {
                                // If we're here and it's a local file, try external URL
                                const fallbackMap = {
                                    'netflix': 'https://m.media-amazon.com/images/I/31JfJ6dXD9L.png',
                                    'disneyplus': 'https://m.media-amazon.com/images/I/719t3jd2NeL.png',
                                    'skyshowtime': 'https://upload.wikimedia.org/wikipedia/commons/5/55/SkyShowtime_Logo.svg',
                                    'hbomax': 'https://upload.wikimedia.org/wikipedia/commons/1/17/HBO_Max_Logo.svg',
                                    'voyo': 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Voyo_Logo.svg'
                                };
                                const fallback = fallbackMap[platformName];
                                if (fallback) {
                                    this.src = fallback;
                                    return;
                                }
                            }
                            // Final fallback to text
                            console.warn('Failed to load logo for', platformName, this.src);
                            this.style.display = 'none';
                            badge.textContent = platformName.charAt(0).toUpperCase();
                        };

                        img.onload = function () {
                            // Ensure image is visible when loaded
                            this.style.display = 'block';
                            this.style.opacity = '1';
                        };

                        tryLoadImage(logoUrl);
                        badge.appendChild(img);
                    } else {
                        badge.textContent = platformName.charAt(0).toUpperCase();
                    }

                    badgesContainer.appendChild(badge);
                });

                // Always add 1337x.to link after badges (inline)
                const separator = document.createElement('span');
                separator.textContent = ' | ';
                separator.style.margin = '0 8px';
                separator.style.color = 'var(--text-secondary, #999)';
                badgesContainer.appendChild(separator);

                const unavailableLink = document.createElement('a');
                const searchQuery = encodeURIComponent(movie.title);
                unavailableLink.href = `https://1337x.to/search/${searchQuery}/1/`;
                unavailableLink.target = '_blank';
                unavailableLink.rel = 'noopener noreferrer';
                unavailableLink.textContent = '1337x.to';
                unavailableLink.style.color = 'var(--accent-color, #007AFF)';
                unavailableLink.style.textDecoration = 'underline';
                unavailableLink.style.cursor = 'pointer';
                unavailableLink.title = `Search "${movie.title}" on 1337x.to`;
                badgesContainer.appendChild(unavailableLink);

                platformsContainer.innerHTML = '';
                platformsContainer.appendChild(badgesContainer);
                platformsContainer.style.display = 'block';
            } else {
                // Create search link for 1337x.to with movie title (when no badges)
                const unavailableLink = document.createElement('a');
                const searchQuery = encodeURIComponent(movie.title);
                unavailableLink.href = `https://1337x.to/search/${searchQuery}/1/`;
                unavailableLink.target = '_blank';
                unavailableLink.rel = 'noopener noreferrer';
                unavailableLink.textContent = '1337x.to';
                unavailableLink.style.color = 'var(--accent-color, #007AFF)';
                unavailableLink.style.textDecoration = 'underline';
                unavailableLink.style.cursor = 'pointer';
                unavailableLink.title = `Search "${movie.title}" on 1337x.to`;
                platformsContainer.innerHTML = '';
                platformsContainer.appendChild(unavailableLink);
                platformsContainer.style.display = 'block';
            }
        } else {
            platformsContainer.style.display = 'none';
        }

        // Build meta content with seasons for TV shows
        let seasonsHtml = '';
        if (movie.type === 'series' && movie.totalSeasons) {
            seasonsHtml = `
                <span class="dot">•</span>
                <span class="seasons-info">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
                        <polyline points="17 2 12 7 7 2"></polyline>
                    </svg>
                    ${movie.totalSeasons} Season${movie.totalSeasons > 1 ? 's' : ''}
                </span>
            `;
        }

        const metaContainer = document.querySelector('.modal-meta');
        metaContainer.innerHTML = `
            <span id="modal-year">${movie.year || ''}</span>
            <span class="dot">•</span>
            <span id="modal-genre">${decodeHtmlEntities(movie.genre) || ''}</span>
            ${seasonsHtml}
            ${ratingHtml}
        `;

        // Decode and truncate description
        const decodedDescription = decodeHtmlEntities(movie.description || 'No description available.');
        const truncatedDescription = truncateDescription(decodedDescription, 5);
        modalDesc.textContent = truncatedDescription;

        if (movie.image_url) {
            // Set immediate src with English locale to avoid showing German images
            const isImdbImage = movie.image_url.includes('media-amazon.com');
            if (isImdbImage) {
                // Set optimized English URL immediately (no delay)
                modalImg.src = getOptimizedImageUrl(movie.image_url, 800);
                modalImg.style.display = 'block';

                // Then try to upgrade to TMDB English poster in background (better quality)
                fetch(`api/get_english_poster.php?title=${encodeURIComponent(movie.title)}${movie.year ? '&year=' + encodeURIComponent(movie.year) : ''}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.success && data.image_url) {
                            // TMDB always returns English posters - upgrade if available
                            modalImg.src = data.image_url;
                        }
                    })
                    .catch(() => {
                        // Keep the optimized IMDb URL if TMDB fails
                    });
            } else {
                // Not an IMDb image, set it immediately
                modalImg.src = movie.image_url;
                modalImg.style.display = 'block';

                // Try TMDB in background for consistency
                fetch(`api/get_english_poster.php?title=${encodeURIComponent(movie.title)}${movie.year ? '&year=' + encodeURIComponent(movie.year) : ''}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.success && data.image_url) {
                            modalImg.src = data.image_url;
                        }
                    })
                    .catch(() => {
                        // Keep original URL if TMDB fails
                    });
            }
        } else {
            modalImg.style.display = 'none';
        }

        // Trailer Button
        // Just check if title exists, we will search by title
        if (movie.title) {
            modalTrailer.style.display = 'inline-flex';
            modalTrailer.innerHTML = icons.play + ' Watch Trailer';
            // Remove href, add click handler
            modalTrailer.removeAttribute('href');
            modalTrailer.removeAttribute('target');
            modalTrailer.onclick = (e) => {
                e.preventDefault();
                openTrailerModal(movie.title);
            };
        } else {
            modalTrailer.style.display = 'none';
        }

        // JustWatch Button logic removed

        // Icon-only action buttons with tooltips
        if (currentView === 'to_watch') {
            modalToggleStatus.innerHTML = icons.check;
            modalToggleStatus.title = 'Mark as Watched';
            modalToggleStatus.onclick = () => toggleStatus(movie.id, 'watched');
        } else {
            modalToggleStatus.innerHTML = icons.undo;
            modalToggleStatus.title = 'Move to Library';
            modalToggleStatus.onclick = () => toggleStatus(movie.id, 'to_watch');
        }

        // Delete button (icon only)
        modalDelete.innerHTML = icons.trash;
        modalDelete.title = `Delete ${movie.type === 'series' ? 'Show' : 'Movie'}`;
        modalDelete.onclick = () => deleteMovie(movie.id, movie.type);

        // Rating container - only show for watched items
        const ratingContainer = document.getElementById('modal-rating-container');
        const ratingTrigger = document.getElementById('rating-trigger');
        const ratingButtonsContainer = document.getElementById('modal-rating-buttons');

        if (ratingContainer) {
            // Remove previous event listeners by cloning
            const newContainer = ratingContainer.cloneNode(true);
            ratingContainer.parentNode.replaceChild(newContainer, ratingContainer);

            const freshTrigger = newContainer.querySelector('.rating-trigger');
            const freshButtons = newContainer.querySelector('.rating-buttons');

            if (currentView === 'watched') {
                newContainer.style.display = 'inline-flex';
                newContainer.classList.remove('expanded');

                // Update trigger button to show current rating state
                if (freshTrigger) {
                    freshTrigger.classList.remove('has-rating', 'rating-loved', 'rating-liked', 'rating-disliked');
                    if (movie.user_rating) {
                        freshTrigger.classList.add('has-rating', `rating-${movie.user_rating}`);

                        // Update trigger icon based on rating
                        if (movie.user_rating === 'loved') {
                            freshTrigger.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
                        } else if (movie.user_rating === 'disliked') {
                            freshTrigger.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>`;
                        } else {
                            freshTrigger.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>`;
                        }
                    } else {
                        // Default thumbs up icon (outline)
                        freshTrigger.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>`;
                    }

                    // Expand on trigger click
                    freshTrigger.onclick = (e) => {
                        e.stopPropagation();
                        newContainer.classList.add('expanded');
                    };
                }

                // Collapse when leaving the expanded area
                newContainer.onmouseleave = () => {
                    newContainer.classList.remove('expanded');
                };

                // Update selected state in expanded buttons
                if (freshButtons) {
                    const ratingBtns = freshButtons.querySelectorAll('.rating-btn');
                    ratingBtns.forEach(btn => {
                        const rating = btn.dataset.rating;
                        btn.classList.toggle('selected', movie.user_rating === rating);

                        // Set click handler with immediate feedback
                        btn.onclick = (e) => {
                            e.stopPropagation();
                            updateUserRating(movie.id, rating);
                            // Collapse after selection
                            newContainer.classList.remove('expanded');
                        };
                    });
                }
            } else {
                newContainer.style.display = 'none';
            }
        }

        detailsModal.classList.remove('hidden');
    }

    // ... (Keep update/delete functions) ...
    function updateGenreFilter() {
        const allGenres = new Map(); // Use Map to store genre:count
        let tvShowCount = 0;
        let movieCount = 0;

        movies.forEach(m => {
            // Count TV shows vs movies
            if (m.type === 'series') {
                tvShowCount++;
            } else {
                movieCount++;
            }

            // Count by genre
            if (m.genre) {
                m.genre.split(',').forEach(g => {
                    const genre = g.trim();
                    if (genre) {
                        allGenres.set(genre, (allGenres.get(genre) || 0) + 1);
                    }
                });
            }
        });

        const current = genreFilter.value;

        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();

        // All items option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = `All (${movies.length})`;
        fragment.appendChild(defaultOption);

        // Add TV Shows filter option
        if (tvShowCount > 0) {
            const tvShowOption = document.createElement('option');
            tvShowOption.value = '__tv_shows__';
            tvShowOption.textContent = `📺 TV Shows (${tvShowCount})`;
            fragment.appendChild(tvShowOption);
        }

        // Add Movies filter option
        if (movieCount > 0) {
            const movieOption = document.createElement('option');
            movieOption.value = '__movies__';
            movieOption.textContent = `🎬 Movies (${movieCount})`;
            fragment.appendChild(movieOption);
        }

        // Sort genres alphabetically and add with counts
        const sortedGenres = Array.from(allGenres.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        sortedGenres.forEach(([genre, count]) => {
            const option = document.createElement('option');
            option.value = genre;
            option.textContent = `${genre} (${count})`;
            fragment.appendChild(option);
        });

        genreFilter.innerHTML = '';
        genreFilter.appendChild(fragment);

        // Restore selection if still valid
        if (current === '__tv_shows__' || current === '__movies__' || allGenres.has(current) || current === '') {
            genreFilter.value = current;
        }
    }

    function toggleStatus(id, newStatus) {
        // Optimistic UI update
        const movie = movies.find(m => m.id === id);
        if (!movie) return;

        const oldStatus = movie.status;
        movie.status = newStatus;

        // Update cache
        localStorage.setItem('movies_cache', JSON.stringify(movies));

        // Close modal immediately
        detailsModal.classList.add('hidden');

        // Fluid remove using View Transitions
        if (document.startViewTransition) {
            if (currentView !== newStatus) {
                // Mark card as exiting
                const card = document.querySelector(`.movie-card[data-movie-id="${id}"]`);
                if (card) card.style.viewTransitionName = 'exiting-card';

                document.startViewTransition(() => {
                    if (card) card.remove();
                    if (grid.children.length === 0) renderMovies(false);
                });
            }
        } else {
            // Direct DOM update fallback
            const card = document.querySelector(`.movie-card[data-movie-id="${id}"]`);
            if (card) {
                // If moving to a different view, remove card immediately
                if (currentView !== newStatus) {
                    // Animate out
                    card.style.transform = 'scale(0.9)';
                    card.style.opacity = '0';
                    setTimeout(() => card.remove(), 300);
                }
            }
        }

        const message = newStatus === 'watched' ? 'Marked as watched!' : 'Moved to library!';
        showToast(message, 'success');

        // Update server in background
        fetch(API_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: newStatus })
        }).then(res => {
            if (!res.ok) {
                // Revert on error
                movie.status = oldStatus;
                // We removed the card, so we must re-add it or re-render
                // Simplest is to re-render if error occurs
                renderMovies(false);
                showToast('Failed to update status', 'error');
            }
        }).catch(err => {
            console.error('Error updating status:', err);
            movie.status = oldStatus;
            renderMovies(false);
            showToast('Failed to update status', 'error');
        });
    }

    async function deleteMovie(id, type = 'movie') {
        const typeLabel = type === 'series' ? 'show' : 'movie';
        const confirmed = await showConfirm(`Are you sure you want to delete this ${typeLabel}?`, `Delete ${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)}`);
        if (!confirmed) return;

        // Optimistic UI update
        const movieToDelete = movies.find(m => m.id === id);
        movies = movies.filter(m => m.id !== id);

        // Update cache
        localStorage.setItem('movies_cache', JSON.stringify(movies));

        // Close modal immediately
        detailsModal.classList.add('hidden');

        // Use View Transitions if available for fluid reordering
        if (document.startViewTransition) {
            // Set transition name for the deleted card to make it fade out nicely?
            // Actually, simple removal inside view transition creates the "soft" reorder effect automatically for *remaining* items
            const card = document.querySelector(`.movie-card[data-movie-id="${id}"]`);
            if (card) {
                // Mark this card as separate from others to avoid it flying around?
                // Just setting display:none within startViewTransition works well for reordering.
                card.style.viewTransitionName = 'deleting-card';
            }

            document.startViewTransition(() => {
                if (card) card.remove();
                // Force layout calc? usually not needed if we remove it.
                // But we also need to handle "empty grid" message if needed.
                if (movies.length === 0 && grid.children.length <= 1) { // <=1 because we just removed one
                    renderMovies(false);
                }
            });
        } else {
            // Fallback to CSS animation
            const card = document.querySelector(`.movie-card[data-movie-id="${id}"]`);
            if (card) {
                card.style.transform = 'scale(0.9)';
                card.style.opacity = '0';
                setTimeout(() => {
                    card.remove();
                    if (grid.children.length === 0) renderMovies(false);
                }, 300);
            }
        }

        showToast(`${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} deleted successfully`, 'success');

        // Defer genre filter update
        if (window.requestIdleCallback) {
            requestIdleCallback(() => updateGenreFilter(), { timeout: 1000 });
        } else {
            setTimeout(() => updateGenreFilter(), 200);
        }

        // Update server in background
        fetch(API_URL, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        }).then(res => {
            if (!res.ok) {
                // Revert
                if (movieToDelete) {
                    movies.push(movieToDelete);
                    renderMovies(false);
                    updateGenreFilter();
                }
                showToast(`Failed to delete ${typeLabel}`, 'error');
            }
        }).catch(err => {
            console.error('Error deleting:', err);
            if (movieToDelete) {
                movies.push(movieToDelete);
                renderMovies(false);
                updateGenreFilter();
            }
            showToast(`Failed to delete ${typeLabel}`, 'error');
        });
    }

    // Update user rating for a movie/show
    async function updateUserRating(id, rating) {
        const movie = movies.find(m => m.id === id);
        if (!movie) return;

        const oldRating = movie.user_rating;

        // Toggle off if clicking same rating
        const newRating = oldRating === rating ? null : rating;

        // Optimistic update
        movie.user_rating = newRating;

        // Update rating buttons UI (expanded buttons)
        const ratingBtns = document.querySelectorAll('.rating-buttons .rating-btn');
        ratingBtns.forEach(btn => {
            const btnRating = btn.dataset.rating;
            btn.classList.toggle('selected', newRating === btnRating);
        });

        // Update trigger button immediately
        const freshTrigger = document.querySelector('.rating-trigger');
        if (freshTrigger) {
            freshTrigger.classList.remove('has-rating', 'rating-loved', 'rating-liked', 'rating-disliked');
            if (newRating) {
                freshTrigger.classList.add('has-rating', `rating-${newRating}`);

                // Update trigger icon based on rating
                if (newRating === 'loved') {
                    freshTrigger.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
                } else if (newRating === 'disliked') {
                    freshTrigger.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>`;
                } else {
                    freshTrigger.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>`;
                }
            } else {
                // Reset to outline icon
                freshTrigger.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>`;
            }
        }

        // Update cache
        localStorage.setItem('movies_cache', JSON.stringify(movies));

        // Re-render cards to update rating badges
        renderMovies(false);

        // Persist to server
        try {
            const res = await fetch(API_URL, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, user_rating: newRating })
            });

            if (!res.ok) {
                throw new Error('Failed to update rating');
            }

            const ratingLabels = { loved: 'Loved it!', liked: 'Liked it', disliked: 'Not for me' };
            if (newRating) {
                showToast(`Rated: ${ratingLabels[newRating]}`, 'success');
            }
        } catch (err) {
            console.error('Error updating rating:', err);
            movie.user_rating = oldRating;
            renderMovies(false);
            showToast('Failed to save rating', 'error');
        }
    }
});
