import { db, isFirebaseConfigured } from './firebase-config.js';

async function logEvent(type, data = {}) {
  try {
    if (!isFirebaseConfigured || !db) return;
    const { collection, addDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
    await addDoc(collection(db, 'analytics_events'), {
      type,
      timestamp: serverTimestamp(),
      ...data
    });
  } catch (_) { /* fail silently */ }
}

(function () {
  'use strict';

  /* ---------- DOM Ready ---------- */
  document.addEventListener('DOMContentLoaded', init);

  // Global State
  let allProducts = [];
  let wishlist = JSON.parse(localStorage.getItem('riya_wishlist')) || [];
  let cart = JSON.parse(localStorage.getItem('riya_cart')) || [];
  // Use a persisted target date so the countdown doesn't reset on every page load.
  // If Firebase provides a date, it will override this. Otherwise, we create one
  // and store it in localStorage so it survives reloads.
  let exhibitionDate = (function() {
    const stored = localStorage.getItem('riya_countdown_target');
    if (stored) {
      const d = new Date(stored);
      if (!isNaN(d.getTime()) && d.getTime() > Date.now()) return d;
    }
    // No valid stored date — create one 15 days from now and persist it
    const fallback = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    localStorage.setItem('riya_countdown_target', fallback.toISOString());
    return fallback;
  })();
  let countdownInterval = null;

  async function init() {
    // Parse static products immediately so search works on load
    parseStaticProducts();

    initCountdown();
    initMobileDrawer();
    initHeaderScroll();
    initScrollReveal();
    initInteractiveFeatures();
    initInstagramReels();

    if (isFirebaseConfigured) {
      try {
        await loadDynamicContent();
      } catch (error) {
        console.error("Failed to load Firebase content, falling back to static:", error);
        initStaticFallbacks();
      }
    } else {
      initStaticFallbacks();
    }
  }

  function parseStaticProducts() {
    const staticCards = document.querySelectorAll('#products-grid .product-card');
    allProducts = [];
    staticCards.forEach((card, index) => {
      const id = card.id || `static-${index}`;
      card.setAttribute('data-id', id);

      const name = card.querySelector('.product-card__name')?.textContent || 'Showcase Dress';
      const price = card.querySelector('.product-card__price')?.textContent || 'Price upon request';
      const displayCategory = card.querySelector('.product-card__category')?.textContent || '';
      const category = card.getAttribute('data-category') || 'dress';
      const isNewArrival = card.getAttribute('data-new-arrival') === 'true';
      const imageUrl = card.querySelector('.product-card__image')?.getAttribute('src') || '';

      const stockAttr = card.getAttribute('data-stock-count');
      const stockCount = stockAttr !== null ? parseInt(stockAttr, 10) : undefined;

      const prod = { id, name, price, displayCategory, category, isNewArrival, imageUrl, stockCount };
      allProducts.push(prod);
    });
  }

  function initStaticFallbacks() {
    // Ensure static products are parsed
    parseStaticProducts();
    const staticCards = document.querySelectorAll('#products-grid .product-card');
    staticCards.forEach((card) => {
      const id = card.getAttribute('data-id');
      const prod = allProducts.find(p => p.id === id);
      if (!prod) return;

      // Add out-of-stock class
      if (prod.stockCount !== undefined && prod.stockCount <= 0) {
        card.classList.add('product-card--out-of-stock');
      }

      // Inject stock badges into image wrapper
      const imgWrapper = card.querySelector('.product-card__image-wrapper');
      if (imgWrapper && prod.stockCount !== undefined) {
        if (prod.stockCount <= 0) {
          const badge = document.createElement('span');
          badge.className = 'product-card__badge product-card__badge--stock-out';
          badge.textContent = 'Sold Out';
          imgWrapper.appendChild(badge);
        } else if (prod.stockCount <= 3) {
          const badge = document.createElement('span');
          badge.className = 'product-card__badge product-card__badge--stock-low';
          badge.textContent = `Only ${prod.stockCount} left!`;
          imgWrapper.appendChild(badge);
        }
      }

      // Prepend wishlist heart icon overlay into static card
      if (imgWrapper) {
        const wishlistBtn = document.createElement('button');
        wishlistBtn.className = `product-card__wishlist-btn ${wishlist.includes(id) ? 'is-active' : ''}`;
        wishlistBtn.setAttribute('data-id', id);
        wishlistBtn.setAttribute('aria-label', 'Add to wishlist');
        wishlistBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
          </svg>
        `;
        imgWrapper.appendChild(wishlistBtn);
      }

      // Attach events to static card
      attachProductCardEvents(card, prod);
    });

    initWhatsAppCTAs(null);
    initCategoryFilter();
    updateBadges();
    initReviewsCarousel([]);
  }

  /* ==========================================================
     COUNTDOWN TIMER
     ========================================================== */
  function initCountdown() {
    const daysEl = document.getElementById('countdown-days');
    const hoursEl = document.getElementById('countdown-hours');
    const minsEl = document.getElementById('countdown-mins');
    const secsEl = document.getElementById('countdown-secs');

    if (!daysEl || !hoursEl || !minsEl || !secsEl) return;

    function update() {
      const now = new Date();
      const diff = exhibitionDate - now;

      if (diff <= 0) {
        daysEl.textContent = '00';
        hoursEl.textContent = '00';
        minsEl.textContent = '00';
        secsEl.textContent = '00';
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      daysEl.textContent = String(days).padStart(2, '0');
      hoursEl.textContent = String(hours).padStart(2, '0');
      minsEl.textContent = String(mins).padStart(2, '0');
      secsEl.textContent = String(secs).padStart(2, '0');
    }

    update();
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(update, 1000);
  }

  /* ==========================================================
     MOBILE DRAWER
     ========================================================== */
  function initMobileDrawer() {
    const hamburger = document.getElementById('hamburger-btn');
    const drawer = document.getElementById('mobile-drawer');
    const overlay = document.getElementById('drawer-overlay');
    const closeBtn = document.getElementById('drawer-close');

    if (!hamburger || !drawer) return;

    function openDrawer() {
      drawer.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
      drawer.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    hamburger.addEventListener('click', openDrawer);
    hamburger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDrawer();
      }
    });

    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (overlay) overlay.addEventListener('click', closeDrawer);

    // Close drawer when a nav link is clicked
    document.querySelectorAll('.mobile-drawer__link').forEach(link => {
      link.addEventListener('click', closeDrawer);
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
        closeDrawer();
      }
    });
  }

  /* ==========================================================
     HEADER SCROLL EFFECT
     ========================================================== */
  function initHeaderScroll() {
    const header = document.getElementById('header');
    if (!header) return;

    let ticking = false;

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          header.classList.toggle('header--scrolled', window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /* ==========================================================
     SCROLL REVEAL ANIMATIONS
     ========================================================== */
  function initScrollReveal() {
    // Add js-loaded so CSS reveal animations activate (safe fallback: content visible without JS)
    document.body.classList.add('js-loaded');

    const revealElements = document.querySelectorAll('.reveal, .reveal-stagger');
    if (revealElements.length === 0) return;

    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -20px 0px', // Trigger earlier — important for small phone screens
      threshold: 0.05
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    revealElements.forEach(el => observer.observe(el));
  }

  /* ==========================================================
     WHATSAPP CTA INTEGRATION
     ========================================================== */
  function initWhatsAppCTAs(whatsappNumber) {
    const WHATSAPP_NUMBER = whatsappNumber || '';

    document.querySelectorAll('.whatsapp-cta').forEach(cta => {
      const newCta = cta.cloneNode(true);
      cta.parentNode.replaceChild(newCta, cta);

      newCta.addEventListener('click', (e) => {
        e.preventDefault();

        const productName = newCta.getAttribute('data-product') || 'a product';
        const cardEl = newCta.closest('.product-card');
        const prodId = cardEl ? cardEl.getAttribute('data-id') : null;
        let imgUrlStr = '';

        if (prodId) {
          const prod = allProducts.find(p => p.id === prodId);
          if (prod && prod.imageUrl) {
            let imgUrl = prod.imageUrl;
            if (!imgUrl.startsWith('http://') && !imgUrl.startsWith('https://')) {
              const cleanPath = imgUrl.startsWith('/') ? imgUrl.substring(1) : imgUrl;
              imgUrl = window.location.origin + '/' + cleanPath;
            }
            imgUrlStr = `\nProduct Image: ${imgUrl}`;
          }
        }

        const message = encodeURIComponent(
          `Hello! I'm interested in "${productName}" from Riya Dresses.${imgUrlStr}\n\nCould you please share more details, availability, and pricing?`
        );

        if (!WHATSAPP_NUMBER) {
          alert('WhatsApp number not configured. Please contact the store owner.');
          return;
        }
        const whatsappURL = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
        window.open(whatsappURL, '_blank', 'noopener,noreferrer');
      });
    });
  }

  /* ==========================================================
     FIREBASE DYNAMIC CONTENT LOADER
     ========================================================== */
  let activeWhatsappNumber = '';

  async function loadDynamicContent() {
    // Dynamically load Firestore SDK to avoid blocking page load
    const { 
      collection, 
      doc, 
      getDocs, 
      getDoc, 
      setDoc,
      query, 
      orderBy 
    } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");

    // 1. Fetch settings (WhatsApp & Google Reviews)
    try {
      const genSnap = await getDoc(doc(db, 'settings', 'general'));
      if (genSnap.exists()) {
        const data = genSnap.data();
        if (data.whatsapp) activeWhatsappNumber = data.whatsapp;
        if (data.googleReviewUrl) {
          const btn = document.getElementById('google-review-btn');
          if (btn) btn.href = data.googleReviewUrl;
        }
      }
    } catch (e) {
      console.warn("Error loading general settings:", e);
    }

    // 1a. Fetch countdown timer settings
    try {
      const timerSnap = await getDoc(doc(db, 'settings', 'timer'));
      if (timerSnap.exists()) {
        const data = timerSnap.data();
        
        // Show/hide top banner
        const topBanner = document.getElementById('top-banner');
        if (topBanner) {
          topBanner.style.display = data.show ? 'block' : 'none';
        }
        
        // Update label
        const labelEl = document.getElementById('top-banner-label');
        if (labelEl && data.label) {
          labelEl.textContent = data.label;
        }
        
        // Update headline
        const headlineEl = document.getElementById('top-banner-headline');
        if (headlineEl && data.headline) {
          headlineEl.textContent = data.headline;
        }
        
        // Update target date & restart timer
        if (data.targetDate) {
          exhibitionDate = new Date(data.targetDate);
          // Persist the Firebase-provided date so it survives reloads
          localStorage.setItem('riya_countdown_target', exhibitionDate.toISOString());
          initCountdown();
        }
      }
    } catch (e) {
      console.warn("Error loading timer settings:", e);
    }

    // 1b. Fetch Categories from Firestore
    try {
      const qCats = query(collection(db, 'categories'));
      const catsSnap = await getDocs(qCats);
      const categoriesList = [];
      catsSnap.forEach(snap => {
        categoriesList.push(snap.data());
      });

      if (categoriesList.length > 0) {
        categoriesList.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

        const filterContainer = document.getElementById('category-filters');
        if (filterContainer) {
          filterContainer.innerHTML = `
            <button class="products__filter-btn is-active" data-filter="all" id="filter-all">All</button>
            <button class="products__filter-btn" data-filter="new-arrivals" id="filter-new-arrivals">New Arrivals</button>
          `;
          categoriesList.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'products__filter-btn';
            btn.setAttribute('data-filter', cat.slug);
            btn.setAttribute('id', `filter-${cat.slug}`);
            btn.textContent = cat.name;
            filterContainer.appendChild(btn);
          });
        }

        // Also sync footer Collections column with Firestore categories
        const footerCol = document.getElementById('footer-collections-col');
        if (footerCol) {
          // Remove any previously injected dynamic links
          footerCol.querySelectorAll('.footer__link--dynamic').forEach(el => el.remove());
          categoriesList.forEach(cat => {
            const link = document.createElement('a');
            link.href = '#products';
            link.className = 'footer__link footer__link--dynamic';
            link.id = `footer-cat-${cat.slug}`;
            link.textContent = cat.name;
            link.addEventListener('click', (e) => {
              e.preventDefault();
              document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
              // Small delay to let scroll happen, then trigger the filter
              setTimeout(() => {
                const filterBtn = document.getElementById(`filter-${cat.slug}`);
                if (filterBtn) filterBtn.click();
              }, 400);
            });
            footerCol.appendChild(link);
          });
        }
      }
    } catch (e) {
      console.warn("Error loading categories from Firestore:", e);
    }

    // 2. Fetch About content
    try {
      const aboutSnap = await getDoc(doc(db, 'settings', 'about'));
      if (aboutSnap.exists()) {
        const data = aboutSnap.data();
        const titleEl = document.getElementById('about-title-display');
        const p1El = document.getElementById('about-p1-display');
        const p2El = document.getElementById('about-p2-display');
        const p3El = document.getElementById('about-p3-display');
        
        const s1Num = document.getElementById('about-stat1-num-display');
        const s1Lbl = document.getElementById('about-stat1-lbl-display');
        const s2Num = document.getElementById('about-stat2-num-display');
        const s2Lbl = document.getElementById('about-stat2-lbl-display');

        if (titleEl && data.title) titleEl.textContent = data.title;
        if (p1El && data.p1) p1El.textContent = data.p1;
        if (p2El && data.p2) p2El.textContent = data.p2;
        if (p3El && data.p3) p3El.textContent = data.p3;
        
        if (s1Num && data.stat1_num) s1Num.textContent = data.stat1_num;
        if (s1Lbl && data.stat1_lbl) s1Lbl.textContent = data.stat1_lbl;
        if (s2Num && data.stat2_num) s2Num.textContent = data.stat2_num;
        if (s2Lbl && data.stat2_lbl) s2Lbl.textContent = data.stat2_lbl;
      }
    } catch (e) {
      console.warn("Error loading About section:", e);
    }

    // 3. Fetch Brand Story (Atelier)
    const atelierDefaults = {
      title: "Hand-Selected Elegance,\nCurated with Vision.",
      p1: "At Riya Dresses, we believe that true style lies in the art of selection. We travel, discover, and partner with premium brands and trusted heritage resellers across the region to bring you a deeply personal, elite collection under one roof. Every single piece is individually vetted for its fabric quality, tailoring precision, and distinct silhouette.",
      p2: "We save our clients the endless search by doing the curation for you\u2014sourcing exceptional festive sets, timeless sarees, and modern dresses that balance high-fashion trends with premium comfort. You aren\u2019t just buying a dress; you are experiencing a collection edited to perfection."
    };
    try {
      const titleEl = document.getElementById('atelier-title-display');
      const p1El = document.getElementById('atelier-p1-display');
      const p2El = document.getElementById('atelier-p2-display');

      // One-time migration: update Firebase with the new Atelier text
      const migrationKey = 'riya_atelier_v2_synced';
      if (!localStorage.getItem(migrationKey)) {
        await setDoc(doc(db, 'settings', 'brand-story'), atelierDefaults, { merge: true });
        localStorage.setItem(migrationKey, 'true');
      }

      // Fetch from Firebase (now guaranteed to have correct text)
      const brandSnap = await getDoc(doc(db, 'settings', 'brand-story'));
      const data = brandSnap.exists() ? brandSnap.data() : atelierDefaults;

      if (titleEl) titleEl.innerHTML = (data.title || atelierDefaults.title).replace(/\n/g, '<br>');
      if (p1El) p1El.textContent = data.p1 || atelierDefaults.p1;
      if (p2El) p2El.textContent = data.p2 || atelierDefaults.p2;
    } catch (e) {
      console.warn("Error loading Brand Story:", e);
    }

    // 4. Fetch Hero Slides
    try {
      const qSlides = query(collection(db, 'hero_slides'), orderBy('order', 'asc'));
      const slidesSnap = await getDocs(qSlides);
      const activeSlides = [];
      slidesSnap.forEach(snap => {
        const slide = snap.data();
        activeSlides.push(slide);
      });

      if (activeSlides.length > 0) {
        const heroEl = document.getElementById('category-tiles-container');
        if (heroEl) {
          heroEl.innerHTML = ''; // clear static fallbacks

          activeSlides.forEach((slide, index) => {
            const linkUrl = slide.linkUrl || '#products';
            const slideTitle = slide.title || 'Collection';
            
            const tile = document.createElement('a');
            tile.href = linkUrl;
            tile.className = `cat-tile ${index === 0 ? 'cat-large' : ''}`;
            
            tile.innerHTML = `
              <img src="${slide.imageUrl}" alt="${slide.alt || slideTitle}" loading="${index === 0 ? 'eager' : 'lazy'}">
              <div class="cat-tile-overlay"></div>
            `;
            heroEl.appendChild(tile);
          });
        }
      }
    } catch (e) {
      console.warn("Error loading hero slides:", e);
    }

    // 5. Fetch Products
    try {
      const qProducts = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
      const productsSnap = await getDocs(qProducts);
      const activeProducts = [];
      productsSnap.forEach(snap => {
        const prod = snap.data();
        prod.id = snap.id;
        if (prod.active) activeProducts.push(prod);
      });

      if (activeProducts.length > 0) {
        allProducts = activeProducts;
        
        const gridEl = document.getElementById('products-grid');
        if (gridEl) {
          gridEl.innerHTML = '';
          activeProducts.forEach((prod) => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.setAttribute('data-id', prod.id);
            card.setAttribute('data-category', prod.category || 'dress');
            card.setAttribute('data-new-arrival', prod.isNewArrival ? 'true' : 'false');
            
            // Handle out-of-stock class
            if (prod.stockCount !== undefined && prod.stockCount <= 0) {
              card.classList.add('product-card--out-of-stock');
            }

            const availableSizes = prod.sizes || ["XS", "S", "M", "L", "XL"];

            // Render badges
            let badgesHtml = '';
            let leftOffset = 10;
            if (prod.isNewArrival) {
              badgesHtml += `<span class="product-card__badge product-card__badge--new" style="left: ${leftOffset}px;">New</span>`;
              leftOffset += 45;
            }
            if (prod.salePrice) {
              badgesHtml += `<span class="product-card__badge product-card__badge--sale" style="left: ${leftOffset}px;">Sale</span>`;
            }
            if (prod.stockCount !== undefined) {
              if (prod.stockCount <= 0) {
                badgesHtml += `<span class="product-card__badge product-card__badge--stock-out">Sold Out</span>`;
              } else if (prod.stockCount <= 3) {
                badgesHtml += `<span class="product-card__badge product-card__badge--stock-low">Only ${prod.stockCount} left!</span>`;
              }
            }

            // Render pricing layout
            let priceHtml = '';
            if (prod.salePrice) {
              priceHtml = `
                <div class="product-card__price-container">
                  <span class="product-card__price-original">${prod.price}</span>
                  <span class="product-card__price-sale">${prod.salePrice}</span>
                </div>
              `;
            } else {
              priceHtml = `<span class="product-card__price">${prod.price}</span>`;
            }

            const displayPrice = prod.salePrice || prod.price;

            card.innerHTML = `
              <div class="product-card__image-wrapper">
                <img class="product-card__image" src="${prod.imageUrl}" alt="${prod.name}" loading="lazy">
                <button class="product-card__wishlist-btn ${wishlist.includes(prod.id) ? 'is-active' : ''}" data-id="${prod.id}" aria-label="Add to wishlist">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                  </svg>
                </button>
                ${badgesHtml}
                <div class="product-card__overlay">
                  <a href="#" class="product-card__quick-action whatsapp-cta" data-product="${prod.name} — ${displayPrice}">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"/>
                    </svg>
                    Inquire via WhatsApp
                  </a>
                </div>
              </div>
              <div class="product-card__info">
                <span class="product-card__name">${prod.name}</span>
                ${priceHtml}
                <span class="product-card__category">${prod.displayCategory || ''}</span>
                <span class="product-card__sizes">Sizes: ${availableSizes.join(', ')}</span>
              </div>
            `;
            attachProductCardEvents(card, prod);
            gridEl.appendChild(card);
          });
        }
      }
    } catch (e) {
      console.warn("Error loading products:", e);
    }

    // 6. Fetch Reviews
    try {
      const qReviews = query(collection(db, 'reviews'));
      const reviewsSnap = await getDocs(qReviews);
      const activeReviews = [];
      reviewsSnap.forEach(snap => {
        const rev = snap.data();
        if (rev.active) activeReviews.push(rev);
      });
      initReviewsCarousel(activeReviews);
    } catch (e) {
      console.warn("Error loading reviews from Firestore:", e);
      initReviewsCarousel([]);
    }

    // 7. Fetch Instagram Reels
    try {
      const qReels = query(collection(db, 'reels'), orderBy('order', 'asc'));
      const reelsSnap = await getDocs(qReels);
      const activeReels = [];
      reelsSnap.forEach(snap => {
        const reel = snap.data();
        reel.id = snap.id;
        if (reel.active) activeReels.push(reel);
      });

      if (activeReels.length > 0) {
        const reelsGrid = document.querySelector('.reels__grid');
        if (reelsGrid) {
          reelsGrid.innerHTML = '';
          activeReels.forEach(reel => {
            // Extract embed URL from Instagram reel/post URL
            let embedUrl = reel.videoUrl;
            if (embedUrl) {
              try {
                const cleanUrl = new URL(embedUrl);
                let path = cleanUrl.pathname;
                if (path.startsWith('/')) path = path.substring(1);
                if (path.endsWith('/')) path = path.substring(0, path.length - 1);

                const segments = path.split('/');
                if (segments[0] === 'reel' || segments[0] === 'p') {
                  embedUrl = `https://www.instagram.com/${segments[0]}/${segments[1]}/embed/`;
                } else if (cleanUrl.hostname.includes('instagram.com')) {
                  embedUrl = `https://www.instagram.com/${path}/embed/`;
                }
              } catch (e) {
                console.warn("Invalid Instagram URL, using fallback:", embedUrl, e);
                if (!embedUrl.endsWith('/embed/') && !embedUrl.endsWith('/embed')) {
                  embedUrl = embedUrl.replace(/\/$/, '') + '/embed/';
                }
              }
            }

            // Click-to-load: show a styled placeholder first.
            // The iframe is only injected when the user clicks, preventing
            // all Instagram network requests on page load.
            const card = document.createElement('div');
            card.className = 'reel-card reel-card--lazy';
            card.setAttribute('data-embed-url', embedUrl);
            card.setAttribute('role', 'button');
            card.setAttribute('aria-label', 'Play Instagram reel');
            card.setAttribute('tabindex', '0');

            card.innerHTML = `
              <div class="reel-card__placeholder">
                <div class="reel-card__placeholder-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                </div>
                <div class="reel-card__placeholder-play">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="white">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
                <span class="reel-card__placeholder-label">Tap to play</span>
              </div>
            `;

            // Load the iframe only on click (or Enter key)
            const loadEmbed = () => {
              if (card.classList.contains('reel-card--loaded')) return;
              card.classList.add('reel-card--loaded');
              card.classList.remove('reel-card--lazy');
              card.classList.add('reel-card--embed');
              card.innerHTML = `
                <div class="reel-card__embed-wrapper">
                  <iframe
                    src="${embedUrl}"
                    class="reel-card__iframe"
                    frameborder="0"
                    scrolling="no"
                    allowtransparency="true"
                    allowfullscreen="true"
                  ></iframe>
                </div>
              `;
            };

            card.addEventListener('click', loadEmbed);
            card.addEventListener('keydown', (e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); loadEmbed(); }
            });

            reelsGrid.appendChild(card);
          });
        }
      }
    } catch (e) {
      console.warn("Error loading reels from Firestore:", e);
    }

    // Initialize interactive components
    initCarousel();
    initWhatsAppCTAs(activeWhatsappNumber);
    initCategoryFilter();
    updateBadges();

    // Trigger scroll reveal again since we inserted elements dynamically
    initScrollReveal();
  }


  /* ==========================================================
     CATEGORY FILTER
     ========================================================== */
  function initCategoryFilter() {
    const filterBtns = document.querySelectorAll('.products__filter-btn');
    const productCards = document.querySelectorAll('.product-card');

    if (filterBtns.length === 0 || productCards.length === 0) return;

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.getAttribute('data-filter');

        if (filter !== 'all') logEvent('filter_used', { filter });

        // Update active state on buttons
        filterBtns.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');

        // Show/hide product cards with a smooth transition
        productCards.forEach(card => {
          const category = card.getAttribute('data-category');
          const isNewArrival = card.getAttribute('data-new-arrival') === 'true';

          if (filter === 'all') {
            card.classList.remove('is-hidden');
          } else if (filter === 'new-arrivals') {
            if (isNewArrival) {
              card.classList.remove('is-hidden');
            } else {
              card.classList.add('is-hidden');
            }
          } else if (category === filter) {
            card.classList.remove('is-hidden');
          } else {
            card.classList.add('is-hidden');
          }
        });
      });
    });
  }

  /* ==========================================================
     INTERACTIVE FEATURES INITIALIZATION
     ========================================================== */
  function initInteractiveFeatures() {
    // 1. Search Overlay Toggles
    const searchBtn = document.getElementById('search-btn');
    const searchOverlay = document.getElementById('search-overlay');
    const searchCloseBtn = document.getElementById('search-close-btn');
    const searchInput = document.getElementById('search-input');
    
    if (searchBtn && searchOverlay) {
      searchBtn.addEventListener('click', () => {
        searchOverlay.classList.add('is-open');
        if (searchInput) setTimeout(() => searchInput.focus(), 200);
      });
    }
    
    if (searchCloseBtn && searchOverlay) {
      searchCloseBtn.addEventListener('click', () => {
        searchOverlay.classList.remove('is-open');
        if (searchInput) searchInput.value = '';
        triggerSearch('');
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        triggerSearch(e.target.value.trim());
      });
    }

    // 2. Wishlist Drawer Toggles
    const wishlistBtn = document.getElementById('wishlist-btn');
    const wishlistDrawer = document.getElementById('wishlist-drawer');
    const wishlistDrawerClose = document.getElementById('wishlist-drawer-close');
    const wishlistDrawerOverlay = document.getElementById('wishlist-drawer-overlay');

    if (wishlistBtn && wishlistDrawer) {
      wishlistBtn.addEventListener('click', () => {
        renderWishlistDrawer();
        wishlistDrawer.classList.add('is-open');
      });
    }

    const closeWishlist = () => wishlistDrawer && wishlistDrawer.classList.remove('is-open');
    if (wishlistDrawerClose) wishlistDrawerClose.addEventListener('click', closeWishlist);
    if (wishlistDrawerOverlay) wishlistDrawerOverlay.addEventListener('click', closeWishlist);

    // 3. Cart Drawer Toggles
    const bagBtn = document.getElementById('bag-btn');
    const bagDrawer = document.getElementById('bag-drawer');
    const bagDrawerClose = document.getElementById('bag-drawer-close');
    const bagDrawerOverlay = document.getElementById('bag-drawer-overlay');
    const checkoutBtn = document.getElementById('checkout-btn');

    if (bagBtn && bagDrawer) {
      bagBtn.addEventListener('click', () => {
        renderBagDrawer();
        bagDrawer.classList.add('is-open');
      });
    }

    const closeBag = () => bagDrawer && bagDrawer.classList.remove('is-open');
    if (bagDrawerClose) bagDrawerClose.addEventListener('click', closeBag);
    if (bagDrawerOverlay) bagDrawerOverlay.addEventListener('click', closeBag);
    
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', checkoutWhatsApp);
    }

    // 4. Quick View Modal Close
    const qvModal = document.getElementById('quick-view-modal');
    const qvCloseBtn = document.getElementById('quick-view-close-btn');
    
    const closeQV = () => {
      if (qvModal) qvModal.classList.remove('is-active');
      document.body.style.overflow = '';
    };
    if (qvCloseBtn) qvCloseBtn.addEventListener('click', closeQV);
    if (qvModal) {
      qvModal.addEventListener('click', (e) => {
        if (e.target === qvModal) closeQV();
      });
    }

    // 5. Size Selection Buttons
    const sizeBtns = document.querySelectorAll('.qv-size-btn');
    sizeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        sizeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const err = document.getElementById('qv-size-error-msg');
        if (err) err.style.display = 'none';
      });
    });

    // 6. Exhibition Lightbox Modal
    const lightboxModal = document.getElementById('lightbox-modal');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxLoc = document.getElementById('lightbox-loc');
    const lightboxTitle = document.getElementById('lightbox-title');
    const lightboxClose = document.getElementById('lightbox-close');

    if (lightboxModal && lightboxImg) {
      document.addEventListener('click', (e) => {
        const card = e.target.closest('.exhibition-card');
        if (card) {
          e.preventDefault();
          const imgUrl = card.getAttribute('data-img');
          const loc = card.getAttribute('data-loc');
          const title = card.getAttribute('data-title');
          const year = card.getAttribute('data-year');

          lightboxImg.src = imgUrl;
          lightboxImg.alt = card.querySelector('img')?.alt || title;
          if (lightboxLoc) lightboxLoc.textContent = loc;
          if (lightboxTitle) lightboxTitle.textContent = `${title} (${year})`;

          lightboxModal.classList.add('is-open');
          lightboxModal.setAttribute('aria-hidden', 'false');
          document.body.style.overflow = 'hidden';
        }
      });

      const closeLightbox = () => {
        lightboxModal.classList.remove('is-open');
        lightboxModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        setTimeout(() => {
          lightboxImg.src = '';
        }, 350);
      };

      if (lightboxClose) {
        lightboxClose.addEventListener('click', closeLightbox);
      }

      lightboxModal.addEventListener('click', (e) => {
        if (e.target === lightboxModal) {
          closeLightbox();
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightboxModal.classList.contains('is-open')) {
          closeLightbox();
        }
      });
    }

    // 7. Click events on New Arrival links to trigger the filter tab
    const navNewArrivals = document.getElementById('nav-new-arrivals');
    const footerNewArrivals = document.getElementById('footer-new-arrivals');
    const triggerNewArrivalsFilter = () => {
      const btn = document.getElementById('filter-new-arrivals');
      if (btn) {
        btn.click();
      }
    };
    if (navNewArrivals) navNewArrivals.addEventListener('click', triggerNewArrivalsFilter);
    if (footerNewArrivals) footerNewArrivals.addEventListener('click', triggerNewArrivalsFilter);

    // Sync Badges Initially
    updateBadges();
  }

  /* ==========================================================
     REAL-TIME PRODUCT SEARCH
     ========================================================== */
  function triggerSearch(queryText) {
    const grid = document.getElementById('search-results-grid');
    const placeholder = document.getElementById('search-placeholder-msg');

    if (!queryText) {
      if (grid) grid.style.display = 'none';
      if (placeholder) {
        placeholder.style.display = 'block';
        placeholder.textContent = 'Start typing to search products...';
      }
      return;
    }

    const matched = allProducts.filter(prod => {
      const q = queryText.toLowerCase();
      return (prod.name && prod.name.toLowerCase().includes(q)) ||
             (prod.category && prod.category.toLowerCase().includes(q)) ||
             (prod.displayCategory && prod.displayCategory.toLowerCase().includes(q));
    });

    if (matched.length === 0) {
      if (grid) grid.style.display = 'none';
      if (placeholder) {
        placeholder.style.display = 'block';
        placeholder.textContent = `No results found for "${queryText}".`;
      }
      return;
    }

    logEvent('search', { query: queryText, resultCount: matched.length });
    if (placeholder) placeholder.style.display = 'none';
    if (grid) {
      grid.style.display = 'grid';
      grid.innerHTML = '';
      
      matched.forEach(prod => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.style.opacity = '1';
        card.style.transform = 'none';

        // Handle out-of-stock class
        if (prod.stockCount !== undefined && prod.stockCount <= 0) {
          card.classList.add('product-card--out-of-stock');
        }

        const availableSizes = prod.sizes || ["XS", "S", "M", "L", "XL"];

        // Render badges
        let badgesHtml = '';
        let leftOffset = 10;
        if (prod.isNewArrival) {
          badgesHtml += `<span class="product-card__badge product-card__badge--new" style="left: ${leftOffset}px;">New</span>`;
          leftOffset += 45;
        }
        if (prod.salePrice) {
          badgesHtml += `<span class="product-card__badge product-card__badge--sale" style="left: ${leftOffset}px;">Sale</span>`;
        }
        if (prod.stockCount !== undefined) {
          if (prod.stockCount <= 0) {
            badgesHtml += `<span class="product-card__badge product-card__badge--stock-out">Out of Stock</span>`;
          } else if (prod.stockCount <= 3) {
            badgesHtml += `<span class="product-card__badge product-card__badge--stock-low">Only ${prod.stockCount} left!</span>`;
          }
        }

        // Render pricing layout
        let priceHtml = '';
        if (prod.salePrice) {
          priceHtml = `
            <div class="product-card__price-container">
              <span class="product-card__price-original">${prod.price}</span>
              <span class="product-card__price-sale">${prod.salePrice}</span>
            </div>
          `;
        } else {
          priceHtml = `<span class="product-card__price">${prod.price}</span>`;
        }

        card.innerHTML = `
          <div class="product-card__image-wrapper" style="cursor: pointer;">
            <img class="product-card__image" src="${prod.imageUrl}" alt="${prod.name}">
            ${badgesHtml}
          </div>
          <div class="product-card__info" style="cursor: pointer;">
            <span class="product-card__name">${prod.name}</span>
            ${priceHtml}
            <span class="product-card__category">${prod.displayCategory || ''}</span>
            <span class="product-card__sizes">Sizes: ${availableSizes.join(', ')}</span>
          </div>
        `;

        card.addEventListener('click', () => {
          document.getElementById('search-overlay').classList.remove('is-open');
          openProductQuickView(prod.id);
        });

        grid.appendChild(card);
      });

      if (typeof initScrollReveal === 'function') {
        initScrollReveal();
      }
    }
  }

  /* ==========================================================
     PRODUCT CARD EVENT ATTACHER
     ========================================================== */
  function attachProductCardEvents(cardEl, prod) {
    // 1. Wishlist button toggle
    const wishlistBtn = cardEl.querySelector('.product-card__wishlist-btn');
    if (wishlistBtn) {
      wishlistBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleWishlist(prod.id);
      });
    }

    // 2. Open quick view popup on card click
    cardEl.addEventListener('click', (e) => {
      // Don't open popup if clicking the heart button or the whatsapp quick action
      if (e.target.closest('.product-card__wishlist-btn') || e.target.closest('.whatsapp-cta')) {
        return;
      }
      openProductQuickView(prod.id);
    });
  }

  /* ==========================================================
     BADGE COUNTERS SYNCER
     ========================================================== */
  function updateBadges() {
    const wlBadge = document.getElementById('wishlist-count');
    const bagBadge = document.getElementById('bag-count');

    if (wlBadge) {
      wlBadge.textContent = wishlist.length;
      wlBadge.style.display = wishlist.length > 0 ? 'flex' : 'none';
    }

    if (bagBadge) {
      const totalQty = cart.reduce((total, item) => total + item.qty, 0);
      bagBadge.textContent = totalQty;
      bagBadge.style.display = totalQty > 0 ? 'flex' : 'none';
    }
  }

  /* ==========================================================
     WISHLIST TOGGLE LOGIC
     ========================================================== */
  function toggleWishlist(productId) {
    const index = wishlist.indexOf(productId);
    if (index === -1) {
      wishlist.push(productId);
      logEvent('wishlist_add', { productId });
    } else {
      wishlist.splice(index, 1);
    }
    localStorage.setItem('riya_wishlist', JSON.stringify(wishlist));
    updateBadges();
    
    // Toggle active state on all wishlist buttons matching this productId
    document.querySelectorAll(`.product-card__wishlist-btn[data-id="${productId}"]`).forEach(btn => {
      btn.classList.toggle('is-active', wishlist.includes(productId));
    });

    // If wishlist drawer is open, re-render it
    const wlDrawer = document.getElementById('wishlist-drawer');
    if (wlDrawer && wlDrawer.classList.contains('is-open')) {
      renderWishlistDrawer();
    }
  }

  /* ==========================================================
     CART MANAGEMENT LOGIC
     ========================================================== */
  function addToCart(productId, size, qty = 1) {
    const prod = allProducts.find(p => p.id === productId);
    if (!prod) return;

    const finalPrice = prod.salePrice || prod.price;

    const existingIndex = cart.findIndex(item => item.id === productId && item.size === size);
    if (existingIndex > -1) {
      cart[existingIndex].qty += qty;
    } else {
      cart.push({
        id: productId,
        name: prod.name,
        price: finalPrice,
        imageUrl: prod.imageUrl,
        size: size,
        qty: qty
      });
    }

    localStorage.setItem('riya_cart', JSON.stringify(cart));
    updateBadges();

    // Rerender and show the cart drawer
    renderBagDrawer();
    const bagDrawer = document.getElementById('bag-drawer');
    if (bagDrawer) bagDrawer.classList.add('is-open');
  }

  function updateCartQty(productId, size, change) {
    const idx = cart.findIndex(item => item.id === productId && item.size === size);
    if (idx === -1) return;

    cart[idx].qty += change;
    if (cart[idx].qty <= 0) {
      cart.splice(idx, 1);
    }

    localStorage.setItem('riya_cart', JSON.stringify(cart));
    updateBadges();
    renderBagDrawer();
  }

  function removeFromCart(productId, size) {
    const idx = cart.findIndex(item => item.id === productId && item.size === size);
    if (idx !== -1) {
      cart.splice(idx, 1);
    }
    localStorage.setItem('riya_cart', JSON.stringify(cart));
    updateBadges();
    renderBagDrawer();
  }

  /* ==========================================================
     DRAWER RENDERING LOGIC
     ========================================================== */
  function renderWishlistDrawer() {
    const body = document.getElementById('wishlist-drawer-body');
    if (!body) return;

    if (wishlist.length === 0) {
      body.innerHTML = '<p class="drawer-empty-msg">Your wishlist is empty.</p>';
      return;
    }

    body.innerHTML = '';
    wishlist.forEach(id => {
      const prod = allProducts.find(p => p.id === id);
      if (!prod) return;

      const itemEl = document.createElement('div');
      itemEl.className = 'drawer-item';
      itemEl.innerHTML = `
        <img class="drawer-item__img" src="${prod.imageUrl}" alt="${prod.name}">
        <div class="drawer-item__info">
          <div>
            <h4 class="drawer-item__title">${prod.name}</h4>
            <span class="drawer-item__meta">${prod.displayCategory || ''}</span>
          </div>
          <span class="drawer-item__price">
            ${prod.salePrice 
              ? `<span style="text-decoration: line-through; color: var(--color-neutral-450); font-size: 11px; margin-right: 6px;">${prod.price}</span><span style="color: #dc2626; font-weight: 500;">${prod.salePrice}</span>`
              : prod.price
            }
          </span>
          <button class="admin-btn admin-btn--primary" style="padding: 6px 12px; font-size: 10px; margin-top: 4px;" data-action="add-bag" data-id="${prod.id}">
            Select &amp; Add
          </button>
          <button class="drawer-item__remove" data-action="remove-wl" data-id="${prod.id}">Remove</button>
        </div>
      `;

      itemEl.querySelector('[data-action="add-bag"]').addEventListener('click', () => {
        document.getElementById('wishlist-drawer').classList.remove('is-open');
        openProductQuickView(prod.id);
      });

      itemEl.querySelector('[data-action="remove-wl"]').addEventListener('click', () => {
        toggleWishlist(prod.id);
      });

      body.appendChild(itemEl);
    });
  }

  function renderBagDrawer() {
    const body = document.getElementById('bag-drawer-body');
    const footer = document.getElementById('bag-drawer-footer');
    const subtotalEl = document.getElementById('bag-subtotal');
    if (!body) return;

    if (cart.length === 0) {
      body.innerHTML = '<p class="drawer-empty-msg">Your shopping bag is empty.</p>';
      if (footer) footer.style.display = 'none';
      return;
    }

    body.innerHTML = '';
    if (footer) footer.style.display = 'block';

    let total = 0;
    let hasUponRequest = false;
    cart.forEach(item => {
      const isUponRequest = !/\d/.test(item.price);
      if (isUponRequest) {
        hasUponRequest = true;
      } else {
        const numericPrice = parseInt(item.price.replace(/[^\d]/g, ''), 10) || 0;
        total += numericPrice * item.qty;
      }

      const itemEl = document.createElement('div');
      itemEl.className = 'drawer-item';
      itemEl.innerHTML = `
        <img class="drawer-item__img" src="${item.imageUrl}" alt="${item.name}">
        <div class="drawer-item__info">
          <div>
            <h4 class="drawer-item__title">${item.name}</h4>
            <span class="drawer-item__meta">Size: ${item.size}</span>
          </div>
          <span class="drawer-item__price">${item.price}</span>
          <div class="drawer-item__qty">
            <button class="qty-btn" data-action="dec" data-id="${item.id}" data-size="${item.size}">-</button>
            <span class="qty-value">${item.qty}</span>
            <button class="qty-btn" data-action="inc" data-id="${item.id}" data-size="${item.size}">+</button>
          </div>
          <button class="drawer-item__remove" data-action="remove-item" data-id="${item.id}" data-size="${item.size}">Remove</button>
        </div>
      `;

      itemEl.querySelector('[data-action="dec"]').addEventListener('click', () => {
        updateCartQty(item.id, item.size, -1);
      });

      itemEl.querySelector('[data-action="inc"]').addEventListener('click', () => {
        updateCartQty(item.id, item.size, 1);
      });

      itemEl.querySelector('[data-action="remove-item"]').addEventListener('click', () => {
        removeFromCart(item.id, item.size);
      });

      body.appendChild(itemEl);
    });

    if (subtotalEl) {
      subtotalEl.textContent = `₹${total.toLocaleString('en-IN')}${hasUponRequest ? ' + Price upon request' : ''}`;
    }
  }

  /* ==========================================================
     PRODUCT DETAILS QUICK VIEW LOAD & OPEN
     ========================================================== */
  function openProductQuickView(productId) {
    const prod = allProducts.find(p => p.id === productId);
    if (!prod) return;

    logEvent('product_view', { productId: prod.id, productName: prod.name, category: prod.category });

    const modal = document.getElementById('quick-view-modal');
    const imgEl = document.getElementById('qv-image');
    const titleEl = document.getElementById('qv-title');
    const priceEl = document.getElementById('qv-price');
    const categoryEl = document.getElementById('qv-category');
    
    const sizeBtns = document.querySelectorAll('.qv-size-btn');
    const errorEl = document.getElementById('qv-size-error-msg');
    
    if (imgEl) imgEl.src = prod.imageUrl;
    if (titleEl) titleEl.textContent = prod.name;
    
    // Render modal price with sale price support
    if (priceEl) {
      if (prod.salePrice) {
        priceEl.innerHTML = `<span style="text-decoration: line-through; color: var(--color-neutral-400); font-size: 14px; margin-right: 8px;">${prod.price}</span><span style="color: #dc2626; font-weight: 500; font-size: 18px;">${prod.salePrice}</span>`;
      } else {
        priceEl.textContent = prod.price;
      }
    }
    
    if (categoryEl) categoryEl.textContent = prod.displayCategory || 'Designer Boutique';
    
    const descEl = document.getElementById('qv-desc');
    if (descEl) {
      descEl.textContent = prod.description || 'Exquisitely tailored designer piece featuring hand-selected premium fabrics and artisanal craftsmanship. Made with intention to embody slow luxury and modern elegance.';
    }

    if (errorEl) errorEl.style.display = 'none';

    sizeBtns.forEach(btn => btn.classList.remove('active'));

    // Disable sizes that are not available in prod.sizes
    const availableSizes = prod.sizes || ["XS", "S", "M", "L", "XL"];
    sizeBtns.forEach(btn => {
      const sizeVal = btn.getAttribute('data-size');
      if (availableSizes.includes(sizeVal)) {
        btn.classList.remove('is-disabled');
        btn.disabled = false;
      } else {
        btn.classList.add('is-disabled');
        btn.disabled = true;
      }
    });

    const addToBagBtn = document.getElementById('qv-add-to-bag-btn');
    const whatsappInquiryBtn = document.getElementById('qv-whatsapp-inquiry-btn');

    // Remove old event listeners by cloning
    if (!addToBagBtn || !whatsappInquiryBtn) return;
    const newAddToBagBtn = addToBagBtn.cloneNode(true);
    addToBagBtn.parentNode.replaceChild(newAddToBagBtn, addToBagBtn);

    const newWhatsappInquiryBtn = whatsappInquiryBtn.cloneNode(true);
    whatsappInquiryBtn.parentNode.replaceChild(newWhatsappInquiryBtn, whatsappInquiryBtn);

    // Disable Add to Bag if out of stock
    const isOutOfStock = prod.stockCount !== undefined && prod.stockCount <= 0;
    if (isOutOfStock) {
      newAddToBagBtn.textContent = 'Out of Stock';
      newAddToBagBtn.disabled = true;
      newAddToBagBtn.style.opacity = '0.5';
      newAddToBagBtn.style.pointerEvents = 'none';
    } else {
      newAddToBagBtn.textContent = 'Add to Bag';
      newAddToBagBtn.disabled = false;
      newAddToBagBtn.style.opacity = '';
      newAddToBagBtn.style.pointerEvents = '';
    }

    newAddToBagBtn.addEventListener('click', () => {
      const activeSizeBtn = document.querySelector('.qv-size-btn.active');
      if (!activeSizeBtn) {
        if (errorEl) errorEl.style.display = 'block';
        return;
      }
      const size = activeSizeBtn.getAttribute('data-size');
      addToCart(prod.id, size, 1);
      modal.classList.remove('is-active');
    });

    newWhatsappInquiryBtn.addEventListener('click', () => {
      const activeSizeBtn = document.querySelector('.qv-size-btn.active');
      const sizeStr = activeSizeBtn ? ` (Size: ${activeSizeBtn.getAttribute('data-size')})` : '';
      const displayPrice = prod.salePrice || prod.price;
      const text = `${prod.name}${sizeStr} — ${displayPrice}`;
      
      let imgUrl = prod.imageUrl || '';
      if (imgUrl && !imgUrl.startsWith('http://') && !imgUrl.startsWith('https://')) {
        const cleanPath = imgUrl.startsWith('/') ? imgUrl.substring(1) : imgUrl;
        imgUrl = window.location.origin + '/' + cleanPath;
      }
      const imgUrlStr = imgUrl ? `\nProduct Image: ${imgUrl}` : '';

      const message = encodeURIComponent(
        `Hello! I'm interested in "${text}" from Riya Dresses.${imgUrlStr}\n\nCould you please share more details, availability, and pricing?`
      );

      if (!activeWhatsappNumber) {
        alert('WhatsApp number not configured. Please contact the store owner.');
        return;
      }
      const whatsappURL = `https://wa.me/${activeWhatsappNumber}?text=${message}`;
      window.open(whatsappURL, '_blank', 'noopener,noreferrer');
    });

    if (modal) {
      modal.classList.add('is-active');
      document.body.style.overflow = 'hidden';
    }
  }

  /* ==========================================================
     CUSTOM CONFIRM MODAL
     ========================================================== */
  function showCustomConfirm({ title, message, confirmText, cancelText, onConfirm, onCancel }) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay is-active';
    overlay.style.zIndex = '2000';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';

    const card = document.createElement('div');
    card.className = 'quick-view-card';
    card.style.maxWidth = '400px';
    card.style.padding = 'var(--space-xl)';
    card.style.textAlign = 'center';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.gap = 'var(--space-md)';
    card.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)';

    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    titleEl.className = 'qv-title';
    titleEl.style.fontSize = '20px';
    titleEl.style.margin = '0';

    const msgEl = document.createElement('p');
    msgEl.textContent = message;
    msgEl.style.fontSize = '14px';
    msgEl.style.margin = '0';
    msgEl.style.lineHeight = '1.6';
    msgEl.style.color = 'var(--color-neutral-600)';

    const btnContainer = document.createElement('div');
    btnContainer.style.display = 'flex';
    btnContainer.style.gap = 'var(--space-sm)';
    btnContainer.style.marginTop = 'var(--space-sm)';

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'admin-btn admin-btn--primary';
    confirmBtn.textContent = confirmText;
    confirmBtn.style.flex = '1';
    confirmBtn.style.padding = '12px';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'admin-btn admin-btn--outline';
    cancelBtn.textContent = cancelText;
    cancelBtn.style.flex = '1';
    cancelBtn.style.padding = '12px';

    btnContainer.appendChild(confirmBtn);
    btnContainer.appendChild(cancelBtn);
    card.appendChild(titleEl);
    card.appendChild(msgEl);
    card.appendChild(btnContainer);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const close = () => {
      document.body.removeChild(overlay);
      document.body.style.overflow = prevOverflow;
    };

    confirmBtn.addEventListener('click', () => {
      close();
      if (onConfirm) onConfirm();
    });

    cancelBtn.addEventListener('click', () => {
      close();
      if (onCancel) onCancel();
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        close();
        if (onCancel) onCancel();
      }
    });
  }

  /* ==========================================================
     WHATSAPP CHECKOUT COMPILER
     ========================================================== */
  function checkoutWhatsApp() {
    if (cart.length === 0) return;

    let subtotal = 0;
    let hasUponRequest = false;
    let messageText = "Hello Riya Dresses! I would like to place an order for the following items:\n\n";

    cart.forEach((item, index) => {
      const isUponRequest = !/\d/.test(item.price);
      let itemTotalStr = '';
      if (isUponRequest) {
        hasUponRequest = true;
        itemTotalStr = 'Price upon request';
      } else {
        const numericPrice = parseInt(item.price.replace(/[^\d]/g, ''), 10) || 0;
        const totalItemPrice = numericPrice * item.qty;
        subtotal += totalItemPrice;
        itemTotalStr = `₹${totalItemPrice.toLocaleString('en-IN')}`;
      }
      
      let imgUrl = item.imageUrl || '';
      if (imgUrl && !imgUrl.startsWith('http://') && !imgUrl.startsWith('https://')) {
        const cleanPath = imgUrl.startsWith('/') ? imgUrl.substring(1) : imgUrl;
        imgUrl = window.location.origin + '/' + cleanPath;
      }
      const imgUrlStr = imgUrl ? `\n   - Image Link: ${imgUrl}` : '';

      messageText += `${index + 1}. ${item.name}\n   - Size: ${item.size}\n   - Qty: ${item.qty} x ${item.price}\n   - Total: ${itemTotalStr}${imgUrlStr}\n\n`;
    });

    messageText += `Subtotal: ₹${subtotal.toLocaleString('en-IN')}${hasUponRequest ? ' + Price upon request' : ''}\n\n`;
    messageText += "Please confirm order availability and payment details. Thank you!";

    if (!activeWhatsappNumber) {
      alert('WhatsApp number not configured. Please contact the store owner.');
      return;
    }
    const encodedMsg = encodeURIComponent(messageText);
    const whatsappURL = `https://wa.me/${activeWhatsappNumber}?text=${encodedMsg}`;
    logEvent('whatsapp_inquiry', { itemCount: cart.length, total: subtotal });
    window.open(whatsappURL, '_blank', 'noopener,noreferrer');

    // Use custom in-page confirmation modal instead of blocking confirm()
    setTimeout(() => {
      showCustomConfirm({
        title: 'Clear Shopping Bag?',
        message: 'Would you like to clear the items from your shopping bag now that you have proceeded to WhatsApp?',
        confirmText: 'Yes, Clear Bag',
        cancelText: 'Keep Items',
        onConfirm: () => {
          cart = [];
          localStorage.setItem('riya_cart', JSON.stringify(cart));
          updateBadges();
          renderBagDrawer();
          const bagDrawerEl = document.getElementById('bag-drawer');
          if (bagDrawerEl) bagDrawerEl.classList.remove('is-open');
        }
      });
    }, 600);
  }

  /* ==========================================================
     TESTIMONIALS REVIEWS CAROUSEL
     ========================================================== */
  function initReviewsCarousel(reviews) {
    const track = document.getElementById('testimonials-track');
    if (!track) return;

    // Render reviews dynamically
    track.innerHTML = '';
    
    // Fallback if reviews list is empty
    const listToRender = reviews && reviews.length > 0 ? reviews : [
      { author: "Ananya Iyer", rating: 5, text: "Absolutely stunning lehenga! The fit was perfect and the hand embroidery is extremely intricate. Highly recommend Riya Dresses for wedding shopping." },
      { author: "Kriti Sharma", rating: 5, text: "I bought a sapphire saree for Diwali and received so many compliments. The customer support over WhatsApp was so helpful in choosing the design." },
      { author: "Sneha Reddy", rating: 5, text: "The evening gown is pure elegance. Zara-like minimalist vibes with rich Indian fabrics. Will definitely be a returning customer!" }
    ];

    listToRender.forEach((rev, index) => {
      const stars = '★'.repeat(rev.rating) + '☆'.repeat(5 - rev.rating);
      const slide = document.createElement('div');
      slide.className = `testimonial-slide ${index === 0 ? 'active' : ''}`;
      slide.innerHTML = `
        <div class="testimonial-stars">${stars}</div>
        <p class="testimonial-text">"${rev.text}"</p>
        <span class="testimonial-author">— ${rev.author}</span>
      `;
      track.appendChild(slide);
    });

    const slides = track.querySelectorAll('.testimonial-slide');
    const totalSlides = slides.length;
    if (totalSlides <= 1) {
      // Hide nav if only one slide
      const nav = document.querySelector('.testimonials-nav');
      if (nav) nav.style.display = 'none';
      return;
    }

    let currentIndex = 0;
    let autoPlayTimer = null;

    function showSlide(index) {
      if (index < 0) index = totalSlides - 1;
      if (index >= totalSlides) index = 0;

      slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
      });
      currentIndex = index;
    }

    function nextSlide() {
      showSlide(currentIndex + 1);
    }

    function prevSlide() {
      showSlide(currentIndex - 1);
    }

    // Attach listeners
    const prevBtn = document.getElementById('testimonial-prev');
    const nextBtn = document.getElementById('testimonial-next');

    // Remove any old event listeners (cloning is safe)
    if (prevBtn) {
      const newPrevBtn = prevBtn.cloneNode(true);
      prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
      newPrevBtn.addEventListener('click', () => {
        prevSlide();
        resetAutoPlay();
      });
    }

    if (nextBtn) {
      const newNextBtn = nextBtn.cloneNode(true);
      nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
      newNextBtn.addEventListener('click', () => {
        nextSlide();
        resetAutoPlay();
      });
    }

    function startAutoPlay() {
      autoPlayTimer = setInterval(nextSlide, 5000);
    }

    function resetAutoPlay() {
      clearInterval(autoPlayTimer);
      startAutoPlay();
    }

    startAutoPlay();
  }

  /* ==========================================================
     INSTAGRAM REELS PLAYER & SOUND CONTROL
     ========================================================== */
  function initInstagramReels() {
    const videos = document.querySelectorAll('.reel-card__video');
    const muteToggleBtn = document.getElementById('reels-mute-toggle');

    if (videos.length === 0) return;

    // Reset mute toggle button to remove duplicate event listeners
    let activeMuteBtn = muteToggleBtn;
    if (muteToggleBtn) {
      const newMuteBtn = muteToggleBtn.cloneNode(true);
      muteToggleBtn.parentNode.replaceChild(newMuteBtn, muteToggleBtn);
      activeMuteBtn = newMuteBtn;
    }

    const iconMuted = document.getElementById('mute-icon-muted');
    const iconUnmuted = document.getElementById('mute-icon-unmuted');
    const muteText = document.querySelector('.reels__mute-text');

    let isMuted = true;

    // 1. Intersection Observer for Auto-Play on Scroll
    const observerOptions = {
      root: null,
      threshold: 0.5 // Play when 50% or more of the card is visible
    };

    const reelsObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const video = entry.target;
        if (entry.isIntersecting) {
          video.play().catch(() => {
            // Autoplay might be blocked if unmuted before user interaction
            video.muted = true;
            video.play().catch(err => console.log("Video play failed:", err));
          });
        } else {
          video.pause();
        }
      });
    }, observerOptions);

    videos.forEach(video => {
      reelsObserver.observe(video);
      
      // Let users click the video itself to toggle play/pause
      const wrapper = video.closest('.reel-card__video-wrapper');
      if (wrapper) {
        wrapper.addEventListener('click', (e) => {
          // If clicked the whatsapp button or stats, do not toggle playback
          if (e.target.closest('.reel-card__actions') || e.target.closest('.reels-whatsapp-cta')) {
            return;
          }
          if (video.paused) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      }
    });

    // 2. Global Mute/Unmute toggle
    if (activeMuteBtn) {
      activeMuteBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        
        videos.forEach(video => {
          video.muted = isMuted;
        });

        // Update UI
        if (isMuted) {
          if (iconMuted) iconMuted.style.display = 'block';
          if (iconUnmuted) iconUnmuted.style.display = 'none';
          if (muteText) muteText.textContent = 'Unmute';
        } else {
          if (iconMuted) iconMuted.style.display = 'none';
          if (iconUnmuted) iconUnmuted.style.display = 'block';
          if (muteText) muteText.textContent = 'Mute';
          
          // Ensure visible videos are currently playing if sound is unmuted
          videos.forEach(video => {
            if (!video.paused) {
              video.play().catch(() => {});
            }
          });
        }
      });
    }

    // 3. Reels WhatsApp Inquiries (disabled)
  }

})();
