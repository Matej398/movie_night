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
    const modalToggleStatus = document.getElementById('modal-toggle-status');
    const modalDelete = document.getElementById('modal-delete');
    
    // Auth Elements
    const userDisplayName = document.getElementById('user-display-name');
    const logoutBtn = document.getElementById('logout-btn');

    let movies = [];
    let currentView = 'to_watch'; 
    let searchDebounceTimeout;

    // Check Authentication
    fetch('api/auth.php?action=check')
        .then(res => res.json())
        .then(data => {
            if (!data.logged_in) {
                window.location.href = 'login.html';
            } else {
                if (userDisplayName) userDisplayName.textContent = data.username;
                // Load movies only after auth check passes
                fetchMovies();
            }
        })
        .catch(() => {
            // If auth check fails entirely (network error), redirect to login
             window.location.href = 'login.html';
        });

    // Logout Handler
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await fetch('api/auth.php?action=logout', { method: 'POST' });
            localStorage.removeItem('movies_cache'); // Clear cache on logout
            window.location.href = 'login.html';
        });
    }

    // Icons
    const icons = {
        check: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
        undo: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>`,
        play: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
        star: `<svg width="14" height="14" viewBox="0 0 24 24" fill="#f5c518" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`
    };

    // Helper to get optimized image URL
    function getOptimizedImageUrl(url, width = 600) {
        if (!url || !url.includes('media-amazon.com')) return url;
        // Check if it's an IMDb/Amazon image
        if (url.includes('_V1_')) {
            // Replace the existing transformation part or the end of the file
            // Pattern: _V1_....jpg
            // We want: _V1_QL75_UX{width}_.jpg
            // If it ends with _V1_.jpg, replace it
            // If it has other params like _V1_FMjpg..., replace until the end
            return url.replace(/_V1_.*?.jpg$/, `_V1_QL75_UX${width}_.jpg`);
        }
        return url;
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
        const optimisticMovie = {
            id: tempId,
            title: title,
            year: year,
            genre: document.getElementById('genre').value,
            image_url: document.getElementById('image_url').value,
            trailer_url: document.getElementById('trailer_url').value,
            description: document.getElementById('description').value,
            rating: document.getElementById('rating').value,
            platforms: [],
            created_at: new Date().toISOString(),
            status: 'to_watch' // Default status
        };

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
                    
                    showToast('Movie saved!', 'success');
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
        
        // Run BOTH server and client checks in parallel for maximum reliability
        // We don't await the server check before starting the client check
        
        // 1. Server Check (Promise)
        const serverCheck = (async () => {
            try {
                const platformUrl = `${STREAMING_CHECK_URL}?title=${encodeURIComponent(title)}${year ? '&year=' + encodeURIComponent(year) : ''}`;
                const res = await fetch(platformUrl);
                if (res.ok) {
                    const data = await res.json();
                    console.log('Server check result:', data);
                    if (data.platforms && data.platforms.length > 0) {
                        updateMoviePlatforms(movieId, data.platforms);
                        return true;
                    }
                }
            } catch (e) {
                console.error('Server platform check failed:', e);
            }
            return false;
        })();

        // 2. Client Check (Promise)
        const clientCheck = (async () => {
            try {
                const searchQuery = encodeURIComponent(title);
                const proxyUrl = 'https://api.allorigins.win/get?url=';
                const targetUrl = encodeURIComponent(`https://www.justwatch.com/si/pretrazi?q=${searchQuery}`);
                
                console.log('Starting client-side check via proxy...');
                const res = await fetch(proxyUrl + targetUrl);
                if (res.ok) {
                    const data = await res.json();
                    const html = data.contents; 
                    
                    if (html && html.length > 100) {
                        const linkMatch = html.match(/href="(\/si\/film\/[^"]+)"/i);
                        if (linkMatch) {
                            const moviePath = linkMatch[1];
                            console.log('Client found movie page:', moviePath);
                            
                            const movieTargetUrl = encodeURIComponent(`https://www.justwatch.com${moviePath}`);
                            const movieRes = await fetch(proxyUrl + movieTargetUrl);
                            const movieData = await movieRes.json();
                            const movieHtml = movieData.contents;
                            
                            const platforms = [];
                            const has = (str) => movieHtml.toLowerCase().includes(str.toLowerCase());
                            
                            if (has('alt="Netflix"') || has('title="Netflix"')) platforms.push('netflix');
                            if (has('alt="Disney Plus"') || has('title="Disney Plus"') || has('alt="Disney+"')) platforms.push('disneyplus');
                            if (has('alt="SkyShowtime"') || has('title="SkyShowtime"')) platforms.push('skyshowtime');
                            if (has('alt="HBO Max"') || has('title="HBO Max"') || has('alt="Max"')) platforms.push('hbomax');
                            if (has('alt="Voyo"') || has('title="Voyo"')) platforms.push('voyo');
                            if (has('alt="Amazon Prime Video"')) platforms.push('amazonprime');
                            
                            console.log('Client found platforms:', platforms);
                            if (platforms.length > 0) {
                                updateMoviePlatforms(movieId, platforms.map(p => ({ name: p, url: null })));
                                return true;
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('Client-side platform check failed:', e);
            }
            return false;
        })();
        
        // We don't really need to wait for them here as they update the UI independently
        // But tracking them helps debug
        Promise.allSettled([serverCheck, clientCheck]).then(() => {
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
        if (currentView === 'to_watch') {
            navLibrary.classList.add('active');
            navWatched.classList.remove('active');
            openAddModalBtn.style.display = 'flex'; 
        } else {
            navLibrary.classList.remove('active');
            navWatched.classList.add('active');
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
            if (selectedGenre && (!movie.genre || !movie.genre.includes(selectedGenre))) return false;
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
        
        if (movie.image_url && movie.image_url.trim() !== '') {
            const img = document.createElement('img');
            img.alt = movie.title;
            img.className = 'movie-poster';
            img.loading = 'lazy'; // Native lazy loading
            img.decoding = 'async';
            // Use optimized URL for cards (width 400 is enough for 220px wide cards)
            img.src = getOptimizedImageUrl(movie.image_url, 400);
            
            img.onload = function() {
                this.classList.add('image-loaded');
                // Remove shimmer effect from parent
                if (this.parentElement) {
                    this.parentElement.classList.add('loaded');
                }
            };

            img.onerror = function() {
                if (!this.classList.contains('image-error-handled')) {
                    this.classList.add('image-error-handled');
                    if (this.parentElement) {
                        this.parentElement.classList.add('loaded'); // Stop shimmer
                        const placeholder = document.createElement('div');
                        placeholder.className = 'no-image-placeholder';
                        placeholder.textContent = movie.title;
                        this.parentElement.replaceChild(placeholder, this);
                    }
                }
            };
            
            cardImage.appendChild(img);
        } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'no-image-placeholder';
            placeholder.textContent = movie.title;
            cardImage.appendChild(placeholder);
        }

        const cardInfo = document.createElement('div');
        cardInfo.className = 'card-info';
        
        const headerRow = document.createElement('div');
        headerRow.className = 'card-header-row';
        
        const title = document.createElement('div');
        title.className = 'card-title';
        title.textContent = movie.title;
        title.title = movie.title;
        
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
            'disneyplus': 'https://www.disneyplus.com/search?q=',
            'skyshowtime': 'https://www.skyshowtime.com/search?q=',
            'hbomax': 'https://play.max.com/search?q=',
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
        modalTitle.textContent = movie.title;
        
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
                        
                        img.onerror = function() {
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
                        
                        img.onload = function() {
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
                
                platformsContainer.innerHTML = '';
                platformsContainer.appendChild(badgesContainer);
                platformsContainer.style.display = 'block';
            } else {
                // Create search link for 1337x.to with movie title
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

        const metaContainer = document.querySelector('.modal-meta');
        metaContainer.innerHTML = `
            <span id="modal-year">${movie.year || ''}</span>
            <span class="dot">•</span>
            <span id="modal-genre">${movie.genre || ''}</span>
            ${ratingHtml}
        `;

        modalDesc.textContent = movie.description || 'No description available.';
        
        if (movie.image_url) {
            // Use higher quality for modal (width 800)
            modalImg.src = getOptimizedImageUrl(movie.image_url, 800);
            modalImg.style.display = 'block';
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

        if (currentView === 'to_watch') {
            modalToggleStatus.innerHTML = icons.check + ' Mark as Watched';
            modalToggleStatus.onclick = () => toggleStatus(movie.id, 'watched');
        } else {
            modalToggleStatus.innerHTML = icons.undo + ' Move to Library';
            modalToggleStatus.onclick = () => toggleStatus(movie.id, 'to_watch');
        }
        modalDelete.onclick = () => deleteMovie(movie.id);

        detailsModal.classList.remove('hidden');
    }

    // ... (Keep update/delete functions) ...
    function updateGenreFilter() {
        const allGenres = new Set();
        movies.forEach(m => {
            if (m.genre) m.genre.split(',').forEach(g => allGenres.add(g.trim()));
        });
        const current = genreFilter.value;
        
        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'All Genres';
        fragment.appendChild(defaultOption);
        
        Array.from(allGenres).sort().forEach(g => {
            if (g) {
                const option = document.createElement('option');
                option.value = g;
                option.textContent = g;
                fragment.appendChild(option);
            }
        });
        
        genreFilter.innerHTML = '';
        genreFilter.appendChild(fragment);
        if (allGenres.has(current)) genreFilter.value = current;
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

    async function deleteMovie(id) {
        const confirmed = await showConfirm('Are you sure you want to delete this movie?', 'Delete Movie');
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
        
        showToast('Movie deleted successfully', 'success');
        
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
                showToast('Failed to delete movie', 'error');
            }
        }).catch(err => {
            console.error('Error deleting movie:', err);
            if (movieToDelete) {
                movies.push(movieToDelete);
                renderMovies(false);
                updateGenreFilter();
            }
            showToast('Failed to delete movie', 'error');
        });
    }
});
