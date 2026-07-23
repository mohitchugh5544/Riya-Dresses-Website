/* ============================================================
   RIYA DRESSES — Admin Portal Logic
   Firebase Auth, Firestore CRUD, Storage Uploads
   ============================================================ */

import { auth, db, isFirebaseConfigured } from './firebase-config.js';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  where,
  Timestamp,
  limit 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// State
let productsList = [];
let slidesList = [];
let categoriesList = [];
let reviewsList = [];
let reelsList = [];
let selectedProductImageFile = null;
let selectedSlideImageFile = null;

// DOM Cache
const dom = {
  loginContainer: document.getElementById('login-container'),
  dashboardContainer: document.getElementById('dashboard-container'),
  loginForm: document.getElementById('login-form'),
  loginEmail: document.getElementById('login-email'),
  loginPassword: document.getElementById('login-password'),
  loginError: document.getElementById('login-error'),
  configWarning: document.getElementById('config-warning'),
  adminUserEmail: document.getElementById('admin-user-email'),
  logoutBtn: document.getElementById('logout-btn'),
  sidebarLinks: document.querySelectorAll('.sidebar-link'),
  tabContents: document.querySelectorAll('.tab-content'),
  currentTabTitle: document.getElementById('current-tab-title'),
  addProductBtn: document.getElementById('add-product-btn'),
  statusMessage: document.getElementById('status-message'),
  workspaceLoading: document.getElementById('workspace-loading'),
  
  // Products Tab
  productsTableBody: document.getElementById('products-table-body'),
  productModal: document.getElementById('product-modal'),
  productForm: document.getElementById('product-form'),
  productId: document.getElementById('product-id'),
  productName: document.getElementById('product-name'),
  productPrice: document.getElementById('product-price'),
  productSalePrice: document.getElementById('product-sale-price'),
  productStock: document.getElementById('product-stock'),
  productCategory: document.getElementById('product-category'),
  productActive: document.getElementById('product-active'),
  productNewArrival: document.getElementById('product-new-arrival'),
  productImageUrl: document.getElementById('product-image-url'),
  productImageFile: document.getElementById('product-image-file'),
  productImagePreview: document.getElementById('product-image-preview'),
  productUploadZone: document.getElementById('product-upload-zone'),
  closeModalBtn: document.getElementById('close-modal-btn'),
  cancelProductBtn: document.getElementById('cancel-product-btn'),
  modalTitle: document.getElementById('modal-title'),

  // Hero Tab
  slidesContainer: document.getElementById('slides-container'),
  slideForm: document.getElementById('slide-form'),
  slideFormTitle: document.getElementById('slide-form-title'),
  slideId: document.getElementById('slide-id'),
  slideImageFile: document.getElementById('slide-image-file'),
  cancelSlideEdit: document.getElementById('cancel-slide-edit'),
  slideImagePreview: document.getElementById('slide-image-preview'),
  slideUploadZone: document.getElementById('slide-upload-zone'),

  // Settings Forms
  generalSettingsForm: document.getElementById('general-settings-form'),
  settingWhatsapp: document.getElementById('setting-whatsapp'),
  settingGoogleReview: document.getElementById('setting-google-review'),
  settingImgbbKey: document.getElementById('setting-imgbb-key'),

  // Timer settings form
  timerSettingsForm: document.getElementById('timer-settings-form'),
  settingTimerShow: document.getElementById('setting-timer-show'),
  settingTimerLabel: document.getElementById('setting-timer-label'),
  settingTimerHeadline: document.getElementById('setting-timer-headline'),
  settingTimerEnd: document.getElementById('setting-timer-end'),
  settingTimerPostText: document.getElementById('setting-timer-post-text'),

  aboutContentForm: document.getElementById('about-content-form'),
  aboutTitle: document.getElementById('about-title'),
  aboutP1: document.getElementById('about-p1'),
  aboutP2: document.getElementById('about-p2'),
  aboutP3: document.getElementById('about-p3'),
  aboutStat1Num: document.getElementById('about-stat1-num'),
  aboutStat1Lbl: document.getElementById('about-stat1-lbl'),
  aboutStat2Num: document.getElementById('about-stat2-num'),
  aboutStat2Lbl: document.getElementById('about-stat2-lbl'),

  brandStoryForm: document.getElementById('brand-story-form'),
  atelierTitle: document.getElementById('atelier-title'),
  atelierP1: document.getElementById('atelier-p1'),
  atelierP2: document.getElementById('atelier-p2'),

  // Reels management
  adminReelsList: document.getElementById('admin-reels-list'),
  addReelForm: document.getElementById('add-reel-form'),
  reelFormTitle: document.getElementById('reel-form-title'),
  reelId: document.getElementById('reel-id'),
  reelVideoUrl: document.getElementById('reel-video-url'),
  reelCaption: document.getElementById('reel-caption'),
  reelWhatsappTag: document.getElementById('reel-whatsapp-tag'),
  reelActive: document.getElementById('reel-active'),
  cancelReelEdit: document.getElementById('cancel-reel-edit'),

  // Categories cache
  adminCategoriesList: document.getElementById('admin-categories-list'),
  addCategoryForm: document.getElementById('add-category-form'),
  newCategoryName: document.getElementById('new-category-name'),

  // Reviews cache
  adminReviewsList: document.getElementById('admin-reviews-list'),
  addReviewForm: document.getElementById('add-review-form'),
  newReviewAuthor: document.getElementById('new-review-author'),
  newReviewRating: document.getElementById('new-review-rating'),
  newReviewText: document.getElementById('new-review-text'),
};

// Start initialization
initAdmin();

function initAdmin() {
  if (!isFirebaseConfigured) {
    dom.configWarning.style.display = 'block';
    console.warn("Firebase not configured in firebase-config.js");
    return;
  }

  // Auth Listener
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // User is signed in
      dom.loginContainer.style.display = 'none';
      dom.dashboardContainer.style.display = 'flex';
      dom.adminUserEmail.textContent = user.email;
      showTab('products');
      loadAllDashboardData();
    } else {
      // User is signed out
      dom.loginContainer.style.display = 'flex';
      dom.dashboardContainer.style.display = 'none';
      hideLoading();
    }
  });

  // Login handler
  dom.loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    showLoading();
    const email = dom.loginEmail.value.trim();
    const password = dom.loginPassword.value;

    signInWithEmailAndPassword(auth, email, password)
      .then(() => {
        dom.loginError.style.display = 'none';
        dom.loginForm.reset();
      })
      .catch((error) => {
        console.error("Login failed:", error);
        dom.loginError.textContent = `Authentication failed: ${error.message}`;
        dom.loginError.style.display = 'block';
        hideLoading();
      });
  });

  // Logout handler
  dom.logoutBtn.addEventListener('click', () => {
    showLoading();
    signOut(auth).catch((error) => {
      console.error("Sign-out failed:", error);
      hideLoading();
    });
  });

  // Tab switching
  dom.sidebarLinks.forEach(link => {
    link.addEventListener('click', () => {
      const tabId = link.getAttribute('data-tab');
      showTab(tabId);
    });
  });

  // Setup Modals & Image Upload triggers
  setupImageUploads();
  setupProductModal();
  setupHeroSlideForm();
  setupSettingsHandlers();
  setupCategoryForm();
  setupReviewsForm();
  setupReelsForm();
  setupAnalytics();
}

/* ============================================================
   LOADING & ALERT HELPERS
   ============================================================ */
function showLoading() {
  dom.workspaceLoading.classList.add('is-active');
}

function hideLoading() {
  dom.workspaceLoading.classList.remove('is-active');
}

function showAlert(text, type = 'success') {
  dom.statusMessage.className = `admin-alert admin-alert--${type}`;
  dom.statusMessage.textContent = text;
  dom.statusMessage.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  setTimeout(() => {
    dom.statusMessage.style.display = 'none';
  }, 4000);
}

/* ============================================================
   TAB NAVIGATION
   ============================================================ */
function showTab(tabId) {
  dom.sidebarLinks.forEach(link => {
    link.classList.toggle('active', link.getAttribute('data-tab') === tabId);
  });

  dom.tabContents.forEach(tab => {
    tab.classList.toggle('active', tab.id === `tab-${tabId}`);
  });

  // Header settings based on tab
  const titles = {
    products: 'Manage Products',
    hero: 'Featured Tiles Manager',
    content: 'Editorial & Site Settings',
    analytics: 'Analytics Dashboard'
  };

  dom.currentTabTitle.textContent = titles[tabId] || 'Dashboard';
  
  // Show "Add Product" button only on products tab
  if (tabId === 'products') {
    dom.addProductBtn.style.display = 'inline-flex';
  } else {
    dom.addProductBtn.style.display = 'none';
  }

  // Load analytics when tab is first opened
  if (tabId === 'analytics') {
    loadAnalytics();
  }
}

/* ============================================================
   DATA LOADING
   ============================================================ */
async function loadAllDashboardData() {
  showLoading();
  try {
    // Check if Firestore has data, if not populate with defaults
    await checkAndPopulateDefaults();

    // Fetch collections
    await Promise.all([
      fetchProducts(),
      fetchHeroSlides(),
      fetchSiteContent(),
      fetchCategories(),
      fetchReviews(),
      fetchReels()
    ]);
  } catch (error) {
    console.error("Error loading dashboard data:", error);
    showAlert("Failed to sync database. Please check Firestore permissions.", "danger");
  } finally {
    hideLoading();
  }
}

/* ============================================================
   1. PRODUCTS MANAGEMENT
   ============================================================ */
async function fetchProducts() {
  const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  productsList = [];
  querySnapshot.forEach((docSnap) => {
    productsList.push({ id: docSnap.id, ...docSnap.data() });
  });
  renderProductsTable();
}

function renderProductsTable() {
  dom.productsTableBody.innerHTML = '';
  
  if (productsList.length === 0) {
    dom.productsTableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--color-neutral-500); padding: var(--space-xl) 0;">
          No products found. Click "+ Add Product" to create one.
        </td>
      </tr>
    `;
    return;
  }

  productsList.forEach((prod) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <img class="table-thumbnail" src="${prod.imageUrl || 'assets/product-placeholder.png'}" alt="${prod.name}">
      </td>
      <td>
        <strong>${prod.name}</strong>
      </td>
      <td style="text-transform: capitalize;">${prod.category}</td>
      <td>
        ${prod.salePrice ? `<span style="text-decoration: line-through; color: var(--color-neutral-450); font-size: 11px;">${formatPriceWithCurrency(prod.price)}</span><br><strong style="color: #dc2626;">${formatPriceWithCurrency(prod.salePrice)}</strong>` : formatPriceWithCurrency(prod.price)}
      </td>
      <td>
        <span class="status-badge status-badge--${prod.active ? 'active' : 'hidden'}">
          ${prod.active ? 'Active' : 'Hidden'}
        </span>
        <br>
        ${prod.stockCount !== undefined ? (
          prod.stockCount <= 0 
            ? '<span class="status-badge" style="background-color:#fee2e2; color:#991b1b; font-size:10px; margin-top:4px;">Out of Stock</span>'
            : prod.stockCount <= 3
              ? `<span class="status-badge" style="background-color:#fef3c7; color:#92400e; font-size:10px; margin-top:4px;">Low Stock (${prod.stockCount})</span>`
              : `<span class="status-badge" style="background-color:#e0f2fe; color:#075985; font-size:10px; margin-top:4px;">Stock: ${prod.stockCount}</span>`
        ) : '<span class="status-badge" style="background-color:#e0f2fe; color:#075985; font-size:10px; margin-top:4px;">Stock: 10</span>'}
      </td>
      <td>
        <div class="table-actions">
          <button class="action-btn edit-prod-btn" data-id="${prod.id}">Edit</button>
          <button class="action-btn action-btn--delete delete-prod-btn" data-id="${prod.id}">Delete</button>
        </div>
      </td>
    `;
    dom.productsTableBody.appendChild(tr);
  });

  // Attach table event listeners
  document.querySelectorAll('.edit-prod-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const prodId = e.target.getAttribute('data-id');
      openProductModal(prodId);
    });
  });

  document.querySelectorAll('.delete-prod-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const prodId = e.target.getAttribute('data-id');
      deleteProductHandler(prodId);
    });
  });
}

// Upload Image to ImgBB
async function uploadImageToImgBB(file) {
  const apiKey = dom.settingImgbbKey.value.trim();
  if (!apiKey) {
    throw new Error("ImgBB API Key is missing. Please add it in the Site Settings tab first.");
  }
  
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errData = await response.json();
    throw new Error(errData.error?.message || "Failed to upload image to ImgBB.");
  }

  const resData = await response.json();
  return resData.data.url;
}

// Auto-format price with default currency symbol (e.g., 42000 or 42,000 -> RS 42,000)
function formatPriceWithCurrency(priceStr) {
  if (!priceStr) return '';
  let val = String(priceStr).trim();
  if (!val) return '';

  // If text without digits (e.g. "Price upon request")
  if (!/\d/.test(val)) return val;

  // Extract digits
  const num = parseInt(val.replace(/[^\d]/g, ''), 10);
  if (!isNaN(num) && num > 0) {
    return `RS ${num.toLocaleString('en-IN')}`;
  }

  return val;
}

function setupProductModal() {
  dom.addProductBtn.addEventListener('click', () => openProductModal());
  
  const closeModal = () => {
    dom.productModal.classList.remove('is-active');
    dom.productForm.reset();
    selectedProductImageFile = null;
    dom.productImagePreview.style.display = 'none';
    dom.productUploadZone.querySelector('.upload-placeholder').style.display = 'block';
  };

  dom.closeModalBtn.addEventListener('click', closeModal);
  dom.cancelProductBtn.addEventListener('click', closeModal);

  // Auto-format prices on input blur
  dom.productPrice.addEventListener('blur', () => {
    if (dom.productPrice.value.trim()) {
      dom.productPrice.value = formatPriceWithCurrency(dom.productPrice.value);
    }
  });
  dom.productSalePrice.addEventListener('blur', () => {
    if (dom.productSalePrice.value.trim()) {
      dom.productSalePrice.value = formatPriceWithCurrency(dom.productSalePrice.value);
    }
  });

  // Submit product
  dom.productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();

    const prodId = dom.productId.value;
    const name = dom.productName.value.trim();
    const price = formatPriceWithCurrency(dom.productPrice.value);
    const salePrice = dom.productSalePrice.value.trim() ? formatPriceWithCurrency(dom.productSalePrice.value) : "";
    const stockCount = parseInt(dom.productStock.value, 10);
    const sizes = Array.from(document.querySelectorAll('input[name="product-sizes"]:checked')).map(el => el.value);
    const category = dom.productCategory.value;
    const active = dom.productActive.checked;
    const isNewArrival = dom.productNewArrival.checked;
    let imageUrl = dom.productImageUrl.value;

    try {
      // 1. Handle file upload if a new file is chosen via ImgBB
      if (selectedProductImageFile) {
        imageUrl = await uploadImageToImgBB(selectedProductImageFile);
      }

      const productData = {
        name,
        price,
        salePrice,
        stockCount: isNaN(stockCount) ? 10 : stockCount,
        sizes,
        category,
        active,
        isNewArrival,
        imageUrl,
        updatedAt: Date.now()
      };

      if (prodId) {
        // Edit existing
        await updateDoc(doc(db, 'products', prodId), productData);
        showAlert("Product updated successfully!");
      } else {
        // Add new
        productData.createdAt = Date.now();
        await addDoc(collection(db, 'products'), productData);
        showAlert("New product created successfully!");
      }

      closeModal();
      await fetchProducts();
    } catch (error) {
      console.error("Error saving product:", error);
      showAlert(`Error saving product: ${error.message}`, "danger");
    } finally {
      hideLoading();
    }
  });
}

async function openProductModal(prodId = null) {
  dom.productForm.reset();
  selectedProductImageFile = null;
  dom.productImagePreview.style.display = 'none';
  dom.productUploadZone.querySelector('.upload-placeholder').style.display = 'none';

  if (prodId) {
    dom.modalTitle.textContent = "Edit Product";
    const prod = productsList.find(p => p.id === prodId);
    if (!prod) return;

    dom.productId.value = prod.id;
    dom.productName.value = prod.name;
    dom.productPrice.value = formatPriceWithCurrency(prod.price);
    dom.productSalePrice.value = prod.salePrice ? formatPriceWithCurrency(prod.salePrice) : '';
    dom.productStock.value = prod.stockCount !== undefined ? prod.stockCount : 10;
    dom.productCategory.value = prod.category;
    dom.productActive.checked = prod.active;
    dom.productNewArrival.checked = !!prod.isNewArrival;
    dom.productImageUrl.value = prod.imageUrl || '';

    const sizes = prod.sizes || ["XS", "S", "M", "L", "XL"];
    document.querySelectorAll('input[name="product-sizes"]').forEach(cb => {
      cb.checked = sizes.includes(cb.value);
    });

    if (prod.imageUrl) {
      dom.productImagePreview.src = prod.imageUrl;
      dom.productImagePreview.style.display = 'block';
    } else {
      dom.productUploadZone.querySelector('.upload-placeholder').style.display = 'block';
    }
  } else {
    dom.modalTitle.textContent = "Add New Product";
    dom.productId.value = '';
    dom.productNewArrival.checked = false;
    dom.productImageUrl.value = '';
    dom.productSalePrice.value = '';
    dom.productStock.value = 10;
    
    document.querySelectorAll('input[name="product-sizes"]').forEach(cb => {
      cb.checked = ["XS", "S", "M", "L", "XL"].includes(cb.value);
    });
    
    dom.productUploadZone.querySelector('.upload-placeholder').style.display = 'block';
  }

  dom.productModal.classList.add('is-active');
}

async function deleteProductHandler(prodId) {
  const prod = productsList.find(p => p.id === prodId);
  if (!prod) return;

  if (confirm(`Are you sure you want to delete "${prod.name}"?`)) {
    showLoading();
    try {
      // Delete document from firestore
      await deleteDoc(doc(db, 'products', prodId));

      // Storage deletion skipped (managed by ImgBB host)

      showAlert("Product deleted successfully!");
      await fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      showAlert(`Error deleting product: ${error.message}`, "danger");
    } finally {
      hideLoading();
    }
  }
}

/* ============================================================
   2. HERO CAROUSEL MANAGEMENT
   ============================================================ */
async function fetchHeroSlides() {
  const q = query(collection(db, 'hero_slides'), orderBy('order', 'asc'));
  const querySnapshot = await getDocs(q);
  slidesList = [];
  querySnapshot.forEach((docSnap) => {
    slidesList.push({ id: docSnap.id, ...docSnap.data() });
  });
  renderHeroSlides();
}

function renderHeroSlides() {
  dom.slidesContainer.innerHTML = '';
  
  if (slidesList.length === 0) {
    dom.slidesContainer.innerHTML = `
      <div style="text-align: center; color: var(--color-neutral-500); padding: var(--space-md);">
        No slides available. Please upload one.
      </div>
    `;
    return;
  }

  slidesList.forEach((slide, index) => {
    const isBig = index === 0;
    const labelText = isBig ? 'BIG' : `Small ${index}`;
    const badgeText = isBig ? 'Main Banner' : `Small Section ${index}`;
    const badgeStyle = isBig ? 'background-color: #fef3c7; color: #92400e;' : 'background-color: #e0f2fe; color: #075985;';

    const item = document.createElement('div');
    item.className = 'slide-item';
    item.innerHTML = `
      <img class="slide-item__thumbnail" src="${slide.imageUrl || 'assets/hero-placeholder.png'}" alt="${labelText}">
      <div class="slide-item__info">
        <span class="slide-item__title" style="font-weight: 700; font-size: 15px; letter-spacing: 0.05em;">${labelText}</span>
        <span class="status-badge" style="${badgeStyle} font-size: 10px; margin-top: 4px; display: inline-block;">${badgeText}</span>
      </div>
      <div class="table-actions">
        <button class="action-btn edit-slide-btn" data-id="${slide.id}">Edit</button>
        <button class="action-btn move-up-btn" data-id="${slide.id}" ${index === 0 ? 'disabled' : ''}>↑</button>
        <button class="action-btn move-down-btn" data-id="${slide.id}" ${index === slidesList.length - 1 ? 'disabled' : ''}>↓</button>
        <button class="action-btn action-btn--delete delete-slide-btn" data-id="${slide.id}">Delete</button>
      </div>
    `;
    dom.slidesContainer.appendChild(item);
  });

  // Attach Carousel Event Listeners
  document.querySelectorAll('.edit-slide-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const slideId = e.target.getAttribute('data-id');
      openSlideEdit(slideId);
    });
  });

  document.querySelectorAll('.move-up-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const slideId = e.target.getAttribute('data-id');
      await reorderSlide(slideId, -1);
    });
  });

  document.querySelectorAll('.move-down-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const slideId = e.target.getAttribute('data-id');
      await reorderSlide(slideId, 1);
    });
  });

  document.querySelectorAll('.delete-slide-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const slideId = e.target.getAttribute('data-id');
      deleteSlideHandler(slideId);
    });
  });
}

function setupHeroSlideForm() {
  const resetForm = () => {
    dom.slideForm.reset();
    dom.slideId.value = '';
    selectedSlideImageFile = null;
    dom.slideImagePreview.style.display = 'none';
    dom.slideUploadZone.querySelector('.upload-placeholder').style.display = 'block';
    dom.slideFormTitle.textContent = "Upload New Slide";
    dom.cancelSlideEdit.style.display = 'none';
  };

  dom.cancelSlideEdit.addEventListener('click', resetForm);

  dom.slideForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();

    const slideId = dom.slideId.value;
    
    // Find current slide object if editing
    const currentSlide = slideId ? slidesList.find(s => s.id === slideId) : null;
    let imageUrl = currentSlide ? currentSlide.imageUrl : '';

    try {
      // Upload image if selected via ImgBB
      if (selectedSlideImageFile) {
        imageUrl = await uploadImageToImgBB(selectedSlideImageFile);
      }

      if (!imageUrl) {
        throw new Error("An image is required for the slide banner.");
      }

      if (slideId) {
        // Update slide
        await updateDoc(doc(db, 'hero_slides', slideId), {
          imageUrl,
          updatedAt: Date.now()
        });
        showAlert("Slide updated successfully!");
      } else {
        // Add new slide (order is last)
        const order = slidesList.length > 0 ? slidesList[slidesList.length - 1].order + 1 : 1;
        await addDoc(collection(db, 'hero_slides'), {
          imageUrl,
          order,
          createdAt: Date.now()
        });
        showAlert("New slide added successfully!");
      }

      resetForm();
      await fetchHeroSlides();
    } catch (error) {
      console.error("Error saving slide:", error);
      showAlert(`Error saving slide: ${error.message}`, "danger");
    } finally {
      hideLoading();
    }
  });
}

function openSlideEdit(slideId) {
  const slide = slidesList.find(s => s.id === slideId);
  if (!slide) return;

  dom.slideFormTitle.textContent = "Edit Slide";
  dom.slideId.value = slide.id;
  dom.cancelSlideEdit.style.display = 'inline-block';

  dom.slideImagePreview.src = slide.imageUrl;
  dom.slideImagePreview.style.display = 'block';
  dom.slideUploadZone.querySelector('.upload-placeholder').style.display = 'none';
}

async function reorderSlide(slideId, direction) {
  const currentIndex = slidesList.findIndex(s => s.id === slideId);
  if (currentIndex === -1) return;

  const targetIndex = currentIndex + direction;
  if (targetIndex < 0 || targetIndex >= slidesList.length) return;

  showLoading();
  try {
    const currentSlide = slidesList[currentIndex];
    const targetSlide = slidesList[targetIndex];

    const currentOrder = currentSlide.order;
    const targetOrder = targetSlide.order;

    // Swap order values in Firestore
    await Promise.all([
      updateDoc(doc(db, 'hero_slides', currentSlide.id), { order: targetOrder }),
      updateDoc(doc(db, 'hero_slides', targetSlide.id), { order: currentOrder })
    ]);

    await fetchHeroSlides();
  } catch (error) {
    console.error("Error reordering slide:", error);
    showAlert("Failed to reorder slide.", "danger");
  } finally {
    hideLoading();
  }
}

async function deleteSlideHandler(slideId) {
  const slide = slidesList.find(s => s.id === slideId);
  if (!slide) return;

  if (confirm("Are you sure you want to delete this hero slide banner?")) {
    showLoading();
    try {
      await deleteDoc(doc(db, 'hero_slides', slideId));

      // Storage deletion skipped (managed by ImgBB host)

      showAlert("Slide deleted successfully.");
      await fetchHeroSlides();
    } catch (error) {
      console.error("Error deleting slide:", error);
      showAlert(`Error deleting slide: ${error.message}`, "danger");
    } finally {
      hideLoading();
    }
  }
}

/* ============================================================
   3. EDITORIAL & SITE CONTENT
   ============================================================ */
async function fetchSiteContent() {
  // 1. Fetch general settings
  const genSnap = await getDoc(doc(db, 'settings', 'general'));
  if (genSnap.exists()) {
    const data = genSnap.data();
    dom.settingWhatsapp.value = data.whatsapp || '';
    dom.settingGoogleReview.value = data.googleReviewUrl || '';
    dom.settingImgbbKey.value = data.imgbbApiKey || '';
  }

  // 1b. Fetch timer settings
  const timerSnap = await getDoc(doc(db, 'settings', 'timer'));
  if (timerSnap.exists()) {
    const data = timerSnap.data();
    if (dom.settingTimerShow) dom.settingTimerShow.checked = !!data.show;
    if (dom.settingTimerLabel) dom.settingTimerLabel.value = data.label || '';
    if (dom.settingTimerHeadline) dom.settingTimerHeadline.value = data.headline || '';
    if (data.targetDate) {
      dom.settingTimerEnd.value = data.targetDate;
    }
    if (data.postTimerText !== undefined) {
      dom.settingTimerPostText.value = data.postTimerText;
    }
  }

  // 2. Fetch About content
  const aboutSnap = await getDoc(doc(db, 'settings', 'about'));
  if (aboutSnap.exists()) {
    const data = aboutSnap.data();
    dom.aboutTitle.value = data.title || '';
    dom.aboutP1.value = data.p1 || '';
    dom.aboutP2.value = data.p2 || '';
    dom.aboutP3.value = data.p3 || '';
    dom.aboutStat1Num.value = data.stat1_num || '';
    dom.aboutStat1Lbl.value = data.stat1_lbl || '';
    dom.aboutStat2Num.value = data.stat2_num || '';
    dom.aboutStat2Lbl.value = data.stat2_lbl || '';
  }

  // 3. Fetch Brand Story (Atelier)
  const brandSnap = await getDoc(doc(db, 'settings', 'brand-story'));
  if (brandSnap.exists()) {
    const data = brandSnap.data();
    dom.atelierTitle.value = data.title || '';
    dom.atelierP1.value = data.p1 || '';
    dom.atelierP2.value = data.p2 || '';
  }
}

function setupSettingsHandlers() {
  // General settings
  dom.generalSettingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();
    const whatsapp = dom.settingWhatsapp.value.trim();
    const googleReviewUrl = dom.settingGoogleReview.value.trim();
    const imgbbApiKey = dom.settingImgbbKey.value.trim();

    try {
      await setDoc(doc(db, 'settings', 'general'), {
        whatsapp,
        googleReviewUrl,
        imgbbApiKey,
        updatedAt: Date.now()
      });
      showAlert("General settings saved!");
    } catch (error) {
      console.error("Error saving general settings:", error);
      showAlert("Failed to save settings.", "danger");
    } finally {
      hideLoading();
    }
  });

  // About settings
  dom.aboutContentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();
    
    try {
      await setDoc(doc(db, 'settings', 'about'), {
        title: dom.aboutTitle.value.trim(),
        p1: dom.aboutP1.value.trim(),
        p2: dom.aboutP2.value.trim(),
        p3: dom.aboutP3.value.trim(),
        stat1_num: dom.aboutStat1Num.value.trim(),
        stat1_lbl: dom.aboutStat1Lbl.value.trim(),
        stat2_num: dom.aboutStat2Num.value.trim(),
        stat2_lbl: dom.aboutStat2Lbl.value.trim(),
        updatedAt: Date.now()
      });
      showAlert("About content saved successfully!");
    } catch (error) {
      console.error("Error saving about info:", error);
      showAlert("Failed to save about details.", "danger");
    } finally {
      hideLoading();
    }
  });

  // Brand story settings
  dom.brandStoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();

    try {
      await setDoc(doc(db, 'settings', 'brand-story'), {
        title: dom.atelierTitle.value.trim(),
        p1: dom.atelierP1.value.trim(),
        p2: dom.atelierP2.value.trim(),
        updatedAt: Date.now()
      });
      showAlert("Brand story saved successfully!");
    } catch (error) {
      console.error("Error saving brand story:", error);
      showAlert("Failed to save brand story.", "danger");
    } finally {
      hideLoading();
    }
  });

  // Timer settings
  if (dom.timerSettingsForm) {
    dom.timerSettingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      showLoading();
      
      try {
        await setDoc(doc(db, 'settings', 'timer'), {
          show: dom.settingTimerShow.checked,
          label: dom.settingTimerLabel.value.trim(),
          headline: dom.settingTimerHeadline.value.trim(),
          targetDate: dom.settingTimerEnd.value,
          postTimerText: dom.settingTimerPostText.value.trim(),
          updatedAt: Date.now()
        });
        showAlert("Timer settings saved successfully!");
      } catch (error) {
        console.error("Error saving timer settings:", error);
        showAlert("Failed to save timer settings.", "danger");
      } finally {
        hideLoading();
      }
    });
  }
}

/* ============================================================
   PRODUCT CATEGORY SYNC & MANAGEMENT
   ============================================================ */
async function fetchCategories() {
  try {
    const q = query(collection(db, 'categories'));
    const querySnapshot = await getDocs(q);
    categoriesList = [];
    querySnapshot.forEach((docSnap) => {
      categoriesList.push(docSnap.data());
    });
    categoriesList.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    renderCategories();
  } catch (error) {
    console.error("Error fetching categories:", error);
    showAlert("Failed to sync categories.", "danger");
  }
}

function renderCategories() {
  if (dom.productCategory) {
    dom.productCategory.innerHTML = '';
    categoriesList.forEach((cat) => {
      const option = document.createElement('option');
      option.value = cat.slug;
      option.textContent = cat.name;
      dom.productCategory.appendChild(option);
    });
  }

  if (dom.adminCategoriesList) {
    dom.adminCategoriesList.innerHTML = '';
    if (categoriesList.length === 0) {
      dom.adminCategoriesList.innerHTML = `
        <li style="padding: var(--space-md); text-align: center; color: var(--color-neutral-500); font-size: 13px;">
          No categories found.
        </li>
      `;
      return;
    }

    categoriesList.forEach((cat) => {
      const li = document.createElement('li');
      li.className = 'category-item';
      li.innerHTML = `
        <div>
          <span class="category-item__name">${cat.name}</span>
          <span class="category-item__slug">(${cat.slug})</span>
        </div>
        <button class="action-btn action-btn--delete delete-cat-btn" data-slug="${cat.slug}">Delete</button>
      `;
      dom.adminCategoriesList.appendChild(li);
    });

    document.querySelectorAll('.delete-cat-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const slug = e.target.getAttribute('data-slug');
        deleteCategoryHandler(slug);
      });
    });
  }
}

function setupCategoryForm() {
  if (dom.addCategoryForm) {
    dom.addCategoryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      showLoading();

      const name = dom.newCategoryName.value.trim();
      const slug = slugify(name);

      if (!name) {
        showAlert("Category name is required.", "danger");
        hideLoading();
        return;
      }

      const exists = categoriesList.some(cat => cat.slug === slug);
      if (exists) {
        showAlert("A category with this name or slug already exists.", "danger");
        hideLoading();
        return;
      }

      try {
        await setDoc(doc(db, 'categories', slug), {
          name,
          slug,
          createdAt: Date.now()
        });
        showAlert(`Category "${name}" added successfully!`);
        dom.newCategoryName.value = '';
        await fetchCategories();
      } catch (error) {
        console.error("Error adding category:", error);
        showAlert(`Error adding category: ${error.message}`, "danger");
      } finally {
        hideLoading();
      }
    });
  }
}

async function deleteCategoryHandler(slug) {
  const cat = categoriesList.find(c => c.slug === slug);
  if (!cat) return;

  if (confirm(`Are you sure you want to delete category "${cat.name}"? Products assigned to it will not be deleted, but you should re-assign them.`)) {
    showLoading();
    try {
      await deleteDoc(doc(db, 'categories', slug));
      showAlert(`Category "${cat.name}" deleted successfully.`);
      await fetchCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      showAlert(`Error deleting category: ${error.message}`, "danger");
    } finally {
      hideLoading();
    }
  }
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

/* ============================================================
   IMAGE UPLOAD & SELECTION TRICKS
   ============================================================ */
function setupImageUploads() {
  // Trigger file dialogs on click of upload zones
  dom.productUploadZone.addEventListener('click', () => dom.productImageFile.click());
  dom.slideUploadZone.addEventListener('click', () => dom.slideImageFile.click());

  // Handle file selection
  dom.productImageFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      selectedProductImageFile = file;
      previewImage(file, dom.productImagePreview, dom.productUploadZone);
    }
  });

  dom.slideImageFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      selectedSlideImageFile = file;
      previewImage(file, dom.slideImagePreview, dom.slideUploadZone);
    }
  });

  // Drag & drop support
  const preventDefaults = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dom.productUploadZone.addEventListener(eventName, preventDefaults);
    dom.slideUploadZone.addEventListener(eventName, preventDefaults);
  });

  const highlight = (zone) => () => zone.style.borderColor = 'var(--color-black)';
  const unhighlight = (zone) => () => zone.style.borderColor = 'var(--color-neutral-300)';

  dom.productUploadZone.addEventListener('dragenter', highlight(dom.productUploadZone));
  dom.productUploadZone.addEventListener('dragover', highlight(dom.productUploadZone));
  dom.productUploadZone.addEventListener('dragleave', unhighlight(dom.productUploadZone));
  dom.productUploadZone.addEventListener('drop', unhighlight(dom.productUploadZone));

  dom.slideUploadZone.addEventListener('dragenter', highlight(dom.slideUploadZone));
  dom.slideUploadZone.addEventListener('dragover', highlight(dom.slideUploadZone));
  dom.slideUploadZone.addEventListener('dragleave', unhighlight(dom.slideUploadZone));
  dom.slideUploadZone.addEventListener('drop', unhighlight(dom.slideUploadZone));

  dom.productUploadZone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      selectedProductImageFile = file;
      previewImage(file, dom.productImagePreview, dom.productUploadZone);
    }
  });

  dom.slideUploadZone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      selectedSlideImageFile = file;
      previewImage(file, dom.slideImagePreview, dom.slideUploadZone);
    }
  });
}

function previewImage(file, imgElement, zoneElement) {
  const reader = new FileReader();
  reader.onload = (e) => {
    imgElement.src = e.target.result;
    imgElement.style.display = 'block';
    zoneElement.querySelector('.upload-placeholder').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

/* ============================================================
   FIRST-TIME INITIALIZATION (PREPOPULATE DATABASE)
   ============================================================ */
async function checkAndPopulateDefaults() {
  // Check if products collection exists or is empty
  const prodCheck = await getDocs(collection(db, 'products'));
  if (prodCheck.empty) {
    console.log("Populating products database with default values...");
    const defaultProducts = [
      { name: "Midnight Silhouette Dress", price: "₹28,500", salePrice: "₹24,000", stockCount: 2, sizes: ["S", "M", "L"], category: "dress", displayCategory: "Evening Wear", imageUrl: "assets/product-1.png", active: true, createdAt: Date.now() - 1000 },
      { name: "Royal Sapphire Saree", price: "₹42,000", salePrice: "", stockCount: 8, sizes: ["XS", "S", "M", "L", "XL"], category: "saree", displayCategory: "Festive Saree", imageUrl: "assets/product-2.png", active: true, createdAt: Date.now() - 2000 },
      { name: "Champagne Aura Lehenga", price: "₹65,000", salePrice: "", stockCount: 3, sizes: ["S", "M", "L"], category: "lehenga", displayCategory: "Bridal Couture", imageUrl: "assets/product-3.png", active: true, createdAt: Date.now() - 3000 },
      { name: "Emerald Empress Gown", price: "₹38,000", salePrice: "₹32,500", stockCount: 0, sizes: ["XS", "S", "M", "L"], category: "gown", displayCategory: "Evening Wear", imageUrl: "assets/product-4.png", active: true, createdAt: Date.now() - 4000 },
      { name: "Blush Petal Anarkali", price: "₹34,000", salePrice: "", stockCount: 15, sizes: ["XS", "S", "M", "L", "XL"], category: "kurti", displayCategory: "Festive Wear", imageUrl: "assets/product-5.png", active: true, createdAt: Date.now() - 5000 },
      { name: "Ivory Heirloom Bridal Lehenga", price: "₹1,25,000", salePrice: "", stockCount: 1, sizes: ["M", "L", "XL"], category: "lehenga", displayCategory: "Bridal Couture", imageUrl: "assets/product-6.png", active: true, createdAt: Date.now() - 6000 }
    ];

    for (const prod of defaultProducts) {
      await addDoc(collection(db, 'products'), prod);
    }
  }

  // Check if slides collection is empty
  const slideCheck = await getDocs(collection(db, 'hero_slides'));
  if (slideCheck.empty) {
    console.log("Populating hero slides database with default values...");
    const defaultSlides = [
      { order: 1, imageUrl: "assets/hero-1.png", alt: "Noir Elegance — Black evening gown from the Obsidian Collection", active: true, createdAt: Date.now() - 1000 },
      { order: 2, imageUrl: "assets/hero-2.png", alt: "Ivory Whisper — Cream designer saree from the Ethereal Weave collection", active: true, createdAt: Date.now() - 2000 },
      { order: 3, imageUrl: "assets/hero-3.png", alt: "Burgundy Regalia — Embroidered lehenga from the Velvet Dynasty collection", active: true, createdAt: Date.now() - 3000 },
      { order: 4, imageUrl: "assets/hero-4.png", alt: "Blush Reverie — Pink anarkali from the Petal Reverie collection", active: true, createdAt: Date.now() - 4000 }
    ];

    for (const slide of defaultSlides) {
      await addDoc(collection(db, 'hero_slides'), slide);
    }
  }

  // Check general settings
  const genSnap = await getDoc(doc(db, 'settings', 'general'));
  if (!genSnap.exists()) {
    console.log("Creating default general settings...");
    await setDoc(doc(db, 'settings', 'general'), {
      whatsapp: "919999999999",
      googleReviewUrl: "https://g.page/r/YOUR_GOOGLE_REVIEW_LINK/review"
    });
  }

  // Check timer settings
  const timerSnap = await getDoc(doc(db, 'settings', 'timer'));
  if (!timerSnap.exists()) {
    console.log("Creating default timer settings...");
    const defaultTarget = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    const localISOTime = (new Date(defaultTarget - tzoffset)).toISOString().slice(0, 16);
    
    await setDoc(doc(db, 'settings', 'timer'), {
      show: true,
      label: "Exhibition & New Arrival Alerts",
      headline: "Next Exhibition Drop — Countdown Initiated",
      targetDate: localISOTime,
      updatedAt: Date.now()
    });
  }

  // Check about content
  const aboutSnap = await getDoc(doc(db, 'settings', 'about'));
  if (!aboutSnap.exists()) {
    console.log("Creating default About content...");
    await setDoc(doc(db, 'settings', 'about'), {
      title: "About Riya Dresses",
      p1: "Founded with a passion for timeless elegance, Riya Dresses is a premium designer boutique that brings together the finest traditions of Indian craftsmanship with contemporary design sensibilities. Every piece in our collection tells a story — of heritage, artistry, and the modern woman who wears it.",
      p2: "From hand-embroidered bridal lehengas to sleek evening gowns, we curate and craft garments that are as individual as the women who choose them. Our design philosophy is rooted in quality over quantity — each creation is made with intention, care, and an unwavering commitment to excellence.",
      p3: "We believe fashion should empower. Our collections are designed for moments that matter — weddings, celebrations, galas, and every occasion where you deserve to feel extraordinary. With a focus on luxurious fabrics, impeccable tailoring, and intricate detailing, Riya Dresses is where dreams meet design.",
      stat1_num: "500+", stat1_lbl: "Happy Clients",
      stat2_num: "50+", stat2_lbl: "Exhibitions"
    });
  }

  // Check brand story content
  const brandSnap = await getDoc(doc(db, 'settings', 'brand-story'));
  if (!brandSnap.exists()) {
    console.log("Creating default Brand Story content...");
    await setDoc(doc(db, 'settings', 'brand-story'), {
      title: "Crafted With Intention,\nWorn With Grace",
      p1: "Every Riya Dresses piece is born in our atelier — a sanctuary where traditional craftsmanship meets contemporary vision. From hand-selected fabrics to the final stitch, each garment is a testament to the art of slow fashion and the belief that true luxury lies in the details.",
      p2: "We work with master artisans across India, preserving centuries-old techniques while shaping them into modern silhouettes that speak to today's woman — confident, discerning, and unapologetically elegant."
    });
  }

  // Check categories collection
  const catCheck = await getDocs(collection(db, 'categories'));
  if (catCheck.empty) {
    console.log("Populating categories database with default values...");
    const defaultCategories = [
      { name: "Sarees", slug: "saree", createdAt: Date.now() - 7000 },
      { name: "Lehengas", slug: "lehenga", createdAt: Date.now() - 6000 },
      { name: "Dresses", slug: "dress", createdAt: Date.now() - 5000 },
      { name: "Kurtis", slug: "kurti", createdAt: Date.now() - 4000 },
      { name: "Gowns", slug: "gown", createdAt: Date.now() - 3000 },
      { name: "Tops", slug: "top", createdAt: Date.now() - 2000 },
      { name: "Jeans", slug: "jeans", createdAt: Date.now() - 1000 }
    ];

    for (const cat of defaultCategories) {
      await setDoc(doc(db, 'categories', cat.slug), cat);
    }
  }
  
  // Check if reviews collection is empty
  const reviewCheck = await getDocs(collection(db, 'reviews'));
  if (reviewCheck.empty) {
    console.log("Populating reviews database with default values...");
    const defaultReviews = [
      { author: "Ananya Iyer", rating: 5, text: "Absolutely stunning lehenga! The fit was perfect and the hand embroidery is extremely intricate. Highly recommend Riya Dresses for wedding shopping.", active: true, createdAt: Date.now() - 1000 },
      { author: "Kriti Sharma", rating: 5, text: "I bought a sapphire saree for Diwali and received so many compliments. The customer support over WhatsApp was so helpful in choosing the design.", active: true, createdAt: Date.now() - 2000 },
      { author: "Sneha Reddy", rating: 5, text: "The evening gown is pure elegance. Zara-like minimalist vibes with rich Indian fabrics. Will definitely be a returning customer!", active: true, createdAt: Date.now() - 3000 }
    ];

    for (const rev of defaultReviews) {
      await addDoc(collection(db, 'reviews'), rev);
    }
  }

  // Check if reels collection is empty
  const reelsCheck = await getDocs(collection(db, 'reels'));
  if (reelsCheck.empty) {
    console.log("Populating reels database with default values...");
    const defaultReels = [
      { order: 1, videoUrl: "https://www.instagram.com/reel/example1/", caption: "Crimson Elegance Gown — Obsidian Collection ✦", whatsappTag: "Crimson Elegance Gown", active: true, createdAt: Date.now() - 3000 },
      { order: 2, videoUrl: "https://www.instagram.com/reel/example2/", caption: "Ivory Whisper Dress — Handcrafted luxury tailoring ✦", whatsappTag: "Ivory Whisper Dress", active: true, createdAt: Date.now() - 2000 },
      { order: 3, videoUrl: "https://www.instagram.com/reel/example3/", caption: "Golden Aura Couture — High fashion spotlights ✦", whatsappTag: "Golden Aura Couture", active: true, createdAt: Date.now() - 1000 }
    ];

    for (const reel of defaultReels) {
      await addDoc(collection(db, 'reels'), reel);
    }
  }
}

/* ============================================================
   PRODUCT REVIEWS SYNC & MANAGEMENT
   ============================================================ */
async function fetchReviews() {
  try {
    const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    reviewsList = [];
    querySnapshot.forEach((docSnap) => {
      reviewsList.push({ id: docSnap.id, ...docSnap.data() });
    });
    renderReviews();
  } catch (error) {
    console.error("Error fetching reviews:", error);
    showAlert("Failed to sync reviews.", "danger");
  }
}

function renderReviews() {
  if (!dom.adminReviewsList) return;

  dom.adminReviewsList.innerHTML = '';
  if (reviewsList.length === 0) {
    dom.adminReviewsList.innerHTML = `
      <div style="padding: var(--space-md); text-align: center; color: var(--color-neutral-500); font-size: 13px;">
        No customer reviews found.
      </div>
    `;
    return;
  }

  reviewsList.forEach((rev) => {
    const stars = '★'.repeat(rev.rating) + '☆'.repeat(5 - rev.rating);
    const li = document.createElement('div');
    li.className = 'review-item-pane';
    li.innerHTML = `
      <div class="review-item-header">
        <span class="review-item-author">${rev.author}</span>
        <span class="review-item-stars">${stars}</span>
      </div>
      <p class="review-item-text">"${rev.text}"</p>
      <div class="review-item-actions">
        <span class="review-item-status review-item-status--${rev.active ? 'active' : 'hidden'}">
          Status: ${rev.active ? 'Visible' : 'Hidden'}
        </span>
        <div class="table-actions">
          <button class="action-btn toggle-review-btn" data-id="${rev.id}">
            ${rev.active ? 'Hide' : 'Show'}
          </button>
          <button class="action-btn action-btn--delete delete-review-btn" data-id="${rev.id}">Delete</button>
        </div>
      </div>
    `;
    dom.adminReviewsList.appendChild(li);
  });

  // Attach button event listeners
  document.querySelectorAll('.toggle-review-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const revId = e.target.getAttribute('data-id');
      await toggleReviewActive(revId);
    });
  });

  document.querySelectorAll('.delete-review-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const revId = e.target.getAttribute('data-id');
      deleteReviewHandler(revId);
    });
  });
}

function setupReviewsForm() {
  if (!dom.addReviewForm) return;

  dom.addReviewForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();

    const author = dom.newReviewAuthor.value.trim();
    const rating = parseInt(dom.newReviewRating.value, 10) || 5;
    const text = dom.newReviewText.value.trim();

    if (!author || !text) {
      showAlert("Reviewer name and review text are required.", "danger");
      hideLoading();
      return;
    }

    try {
      await addDoc(collection(db, 'reviews'), {
        author,
        rating,
        text,
        active: true,
        createdAt: Date.now()
      });
      showAlert("New review added successfully!");
      dom.addReviewForm.reset();
      await fetchReviews();
    } catch (error) {
      console.error("Error adding review:", error);
      showAlert(`Error adding review: ${error.message}`, "danger");
    } finally {
      hideLoading();
    }
  });
}

async function toggleReviewActive(reviewId) {
  const rev = reviewsList.find(r => r.id === reviewId);
  if (!rev) return;

  showLoading();
  try {
    await updateDoc(doc(db, 'reviews', reviewId), {
      active: !rev.active
    });
    await fetchReviews();
    showAlert("Review visibility status updated.");
  } catch (error) {
    console.error("Error toggling review active:", error);
    showAlert("Failed to toggle review visibility.", "danger");
  } finally {
    hideLoading();
  }
}

async function deleteReviewHandler(reviewId) {
  const rev = reviewsList.find(r => r.id === reviewId);
  if (!rev) return;

  if (confirm(`Are you sure you want to delete the review by "${rev.author}"?`)) {
    showLoading();
    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
      showAlert("Review deleted successfully.");
      await fetchReviews();
    } catch (error) {
      console.error("Error deleting review:", error);
      showAlert(`Error deleting review: ${error.message}`, "danger");
    } finally {
      hideLoading();
    }
  }
}

/* ============================================================
   INSTAGRAM REELS MANAGEMENT
   ============================================================ */
async function fetchReels() {
  try {
    const q = query(collection(db, 'reels'), orderBy('order', 'asc'));
    const querySnapshot = await getDocs(q);
    reelsList = [];
    querySnapshot.forEach((docSnap) => {
      reelsList.push({ id: docSnap.id, ...docSnap.data() });
    });
    renderReels();
  } catch (error) {
    console.error("Error fetching reels:", error);
    showAlert("Failed to sync reels.", "danger");
  }
}

function renderReels() {
  if (!dom.adminReelsList) return;

  dom.adminReelsList.innerHTML = '';
  if (reelsList.length === 0) {
    dom.adminReelsList.innerHTML = `
      <div style="padding: var(--space-md); text-align: center; color: var(--color-neutral-500); font-size: 13px;">
        No reels found. Paste an MP4 link to add one.
      </div>
    `;
    return;
  }

  reelsList.forEach((reel, index) => {
    let embedUrl = reel.videoUrl || '';
    let isInstagram = false;
    if (embedUrl) {
      try {
        const cleanUrl = new URL(embedUrl);
        if (cleanUrl.hostname.includes('instagram.com')) {
          isInstagram = true;
          let path = cleanUrl.pathname;
          if (path.startsWith('/')) path = path.substring(1);
          if (path.endsWith('/')) path = path.substring(0, path.length - 1);
          const segments = path.split('/');
          if (segments[0] === 'reel' || segments[0] === 'p') {
            embedUrl = `https://www.instagram.com/${segments[0]}/${segments[1]}/embed/`;
          } else {
            embedUrl = `https://www.instagram.com/${path}/embed/`;
          }
        }
      } catch (e) {
        if (embedUrl.includes('instagram.com')) {
          isInstagram = true;
          if (!embedUrl.endsWith('/embed/') && !embedUrl.endsWith('/embed')) {
            embedUrl = embedUrl.replace(/\/$/, '') + '/embed/';
          }
        }
      }
    }

    const div = document.createElement('div');
    div.className = 'reel-item-pane';
    div.innerHTML = `
      <div class="reel-item-thumbnail">
        ${isInstagram 
          ? `<iframe src="${embedUrl}" frameborder="0" scrolling="no" allowtransparency="true" loading="lazy"></iframe>` 
          : `<video src="${reel.videoUrl}" muted playsinline></video>`
        }
      </div>
      <div class="reel-item-info">
        <span class="reel-item-caption" title="${reel.caption}">${reel.caption || 'No caption'}</span>
        <span class="reel-item-tag">Tag: ${reel.whatsappTag}</span>
        <span class="reel-item-stats">📎 ${reel.videoUrl}</span>
        <span class="reel-item-status reel-item-status--${reel.active ? 'active' : 'hidden'}">
          ${reel.active ? 'Visible' : 'Hidden'}
        </span>
      </div>
      <div class="table-actions" style="flex-direction: column; gap: 4px;">
        <div style="display: flex; gap: 4px;">
          <button class="action-btn edit-reel-btn" data-id="${reel.id}">Edit</button>
          <button class="action-btn toggle-reel-btn" data-id="${reel.id}">
            ${reel.active ? 'Hide' : 'Show'}
          </button>
        </div>
        <div style="display: flex; gap: 4px;">
          <button class="action-btn move-reel-up-btn" data-id="${reel.id}" ${index === 0 ? 'disabled' : ''}>↑</button>
          <button class="action-btn move-reel-down-btn" data-id="${reel.id}" ${index === reelsList.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="action-btn action-btn--delete delete-reel-btn" data-id="${reel.id}">Del</button>
        </div>
      </div>
    `;
    dom.adminReelsList.appendChild(div);
  });

  // Attach event listeners
  document.querySelectorAll('.edit-reel-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      openReelEdit(id);
    });
  });

  document.querySelectorAll('.toggle-reel-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      await toggleReelActive(id);
    });
  });

  document.querySelectorAll('.move-reel-up-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      await reorderReel(id, -1);
    });
  });

  document.querySelectorAll('.move-reel-down-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      await reorderReel(id, 1);
    });
  });

  document.querySelectorAll('.delete-reel-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      deleteReelHandler(id);
    });
  });
}

function openReelEdit(reelId) {
  const reel = reelsList.find(r => r.id === reelId);
  if (!reel) return;

  dom.reelFormTitle.textContent = "Edit Reel";
  dom.reelId.value = reel.id;
  dom.reelVideoUrl.value = reel.videoUrl || '';
  dom.reelCaption.value = reel.caption || '';
  dom.reelWhatsappTag.value = reel.whatsappTag || '';
  dom.reelActive.checked = !!reel.active;
  dom.cancelReelEdit.style.display = 'inline-block';
}

function setupReelsForm() {
  if (!dom.addReelForm) return;

  const resetForm = () => {
    dom.addReelForm.reset();
    dom.reelId.value = '';
    dom.reelActive.checked = true;
    dom.reelFormTitle.textContent = "Add New Reel";
    dom.cancelReelEdit.style.display = 'none';
  };

  dom.cancelReelEdit.addEventListener('click', resetForm);

  dom.addReelForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();

    const id = dom.reelId.value;
    const videoUrl = dom.reelVideoUrl.value.trim();
    const caption = dom.reelCaption.value.trim();
    const whatsappTag = dom.reelWhatsappTag.value.trim();
    const active = dom.reelActive.checked;

    try {
      const reelData = {
        videoUrl,
        caption,
        whatsappTag,
        active,
        updatedAt: Date.now()
      };

      if (id) {
        // Edit existing reel
        await updateDoc(doc(db, 'reels', id), reelData);
        showAlert("Reel updated successfully!");
      } else {
        // Add new reel (order is last)
        const order = reelsList.length > 0 ? reelsList[reelsList.length - 1].order + 1 : 1;
        reelData.order = order;
        reelData.createdAt = Date.now();
        await addDoc(collection(db, 'reels'), reelData);
        showAlert("New reel added successfully!");
      }

      resetForm();
      await fetchReels();
    } catch (error) {
      console.error("Error saving reel:", error);
      showAlert(`Error saving reel: ${error.message}`, "danger");
    } finally {
      hideLoading();
    }
  });
}

async function toggleReelActive(reelId) {
  const reel = reelsList.find(r => r.id === reelId);
  if (!reel) return;

  showLoading();
  try {
    await updateDoc(doc(db, 'reels', reelId), {
      active: !reel.active
    });
    await fetchReels();
    showAlert("Reel visibility status updated.");
  } catch (error) {
    console.error("Error toggling reel active:", error);
    showAlert("Failed to toggle reel status.", "danger");
  } finally {
    hideLoading();
  }
}

async function reorderReel(reelId, direction) {
  const currentIndex = reelsList.findIndex(r => r.id === reelId);
  if (currentIndex === -1) return;

  const targetIndex = currentIndex + direction;
  if (targetIndex < 0 || targetIndex >= reelsList.length) return;

  showLoading();
  try {
    const currentReel = reelsList[currentIndex];
    const targetReel = reelsList[targetIndex];

    const currentOrder = currentReel.order;
    const targetOrder = targetReel.order;

    await Promise.all([
      updateDoc(doc(db, 'reels', currentReel.id), { order: targetOrder }),
      updateDoc(doc(db, 'reels', targetReel.id), { order: currentOrder })
    ]);

    await fetchReels();
  } catch (error) {
    console.error("Error reordering reel:", error);
    showAlert("Failed to reorder reel.", "danger");
  } finally {
    hideLoading();
  }
}

async function deleteReelHandler(reelId) {
  const reel = reelsList.find(r => r.id === reelId);
  if (!reel) return;

  if (confirm(`Are you sure you want to delete this reel: "${reel.caption}"?`)) {
    showLoading();
    try {
      await deleteDoc(doc(db, 'reels', reelId));
      showAlert("Reel deleted successfully.");
      await fetchReels();
    } catch (error) {
      console.error("Error deleting reel:", error);
      showAlert(`Error deleting reel: ${error.message}`, "danger");
    } finally {
      hideLoading();
    }
  }
}

/* ============================================================
   ANALYTICS MODULE
   ============================================================ */
let analyticsRange = 7;
let analyticsLoaded = false;

function setupAnalytics() {
  // Range pill clicks
  document.querySelectorAll('.analytics-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.analytics-pill').forEach(p => p.classList.remove('is-active'));
      pill.classList.add('is-active');
      analyticsRange = parseInt(pill.getAttribute('data-range'), 10);
      loadAnalytics();
    });
  });

  // Refresh button
  const refreshBtn = document.getElementById('analytics-refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => loadAnalytics());
  }
}

async function loadAnalytics() {
  showLoading();
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - analyticsRange);
    cutoff.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, 'analytics_events'),
      where('timestamp', '>=', Timestamp.fromDate(cutoff)),
      orderBy('timestamp', 'desc'),
      limit(500)
    );

    const snap = await getDocs(q);
    const events = [];
    snap.forEach(d => events.push(d.data()));

    renderAnalytics(events, cutoff);
    analyticsLoaded = true;
  } catch (error) {
    console.error('Analytics load error:', error);
    showAlert('Failed to load analytics data. Ensure Firestore index exists for analytics_events (timestamp).', 'warning');
  } finally {
    hideLoading();
  }
}

function renderAnalytics(events, cutoff) {
  // Categorise events
  const views = events.filter(e => e.type === 'product_view');
  const inquiries = events.filter(e => e.type === 'whatsapp_inquiry');
  const wishlistAdds = events.filter(e => e.type === 'wishlist_add');
  const searches = events.filter(e => e.type === 'search');
  const filters = events.filter(e => e.type === 'filter_used');

  // KPI cards
  document.getElementById('kpi-views').textContent = views.length;
  document.getElementById('kpi-inquiries').textContent = inquiries.length;
  document.getElementById('kpi-wishlist').textContent = wishlistAdds.length;
  document.getElementById('kpi-searches').textContent = searches.length;

  const convRate = views.length > 0
    ? ((inquiries.length / views.length) * 100).toFixed(1) + '% conversion'
    : 'N/A';
  document.getElementById('kpi-conversion').textContent = convRate;

  // Most Viewed Products
  renderMostViewed(views);

  // Daily Activity
  renderDailyChart(events, cutoff);

  // Top Search Queries
  renderTopSearches(searches);

  // Category Filter Usage
  renderFilterUsage(filters);
}

function renderMostViewed(views) {
  const container = document.getElementById('analytics-most-viewed');
  const counts = {};
  views.forEach(v => {
    const name = v.productName || 'Unknown';
    counts[name] = (counts[name] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  if (sorted.length === 0) { container.textContent = 'No product views yet.'; return; }

  const maxVal = sorted[0][1];
  container.innerHTML = sorted.map(([name, count], i) =>
    `<div class="analytics-rank-row">
      <span class="analytics-rank-pos">${i + 1}.</span>
      <span class="analytics-rank-name">${name}</span>
      <span class="analytics-rank-bar-wrap"><span class="analytics-rank-bar" style="width:${Math.round((count / maxVal) * 100)}%"></span></span>
      <span class="analytics-rank-count">${count}</span>
    </div>`
  ).join('');
}

function renderDailyChart(events, cutoff) {
  const container = document.getElementById('analytics-daily-chart');
  const now = new Date();
  const dayCount = Math.ceil((now - cutoff) / (1000 * 60 * 60 * 24));

  // Build day buckets
  const buckets = {};
  for (let i = 0; i < dayCount; i++) {
    const d = new Date(cutoff);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    buckets[key] = 0;
  }

  events.forEach(e => {
    if (!e.timestamp) return;
    const ts = e.timestamp.toDate ? e.timestamp.toDate() : new Date(e.timestamp);
    const key = ts.toISOString().slice(0, 10);
    if (buckets[key] !== undefined) buckets[key]++;
  });

  const entries = Object.entries(buckets);
  if (entries.length === 0) { container.textContent = 'No activity data.'; return; }

  const maxVal = Math.max(...entries.map(e => e[1]), 1);

  container.innerHTML = `<div class="bar-chart-wrapper">${entries.map(([date, count]) => {
    const label = date.slice(5); // MM-DD
    const pct = Math.round((count / maxVal) * 100);
    return `<div class="bar-chart-col">
      <span class="bar-chart-count">${count || ''}</span>
      <div class="bar-chart-bar" style="height:${pct}%"></div>
      <span class="bar-chart-label">${label}</span>
    </div>`;
  }).join('')}</div>`;
}

function renderTopSearches(searches) {
  const container = document.getElementById('analytics-top-searches');
  const counts = {};
  searches.forEach(s => {
    const q = (s.query || '').toLowerCase().trim();
    if (q) counts[q] = (counts[q] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  if (sorted.length === 0) { container.textContent = 'No search data yet.'; return; }

  const maxVal = sorted[0][1];
  container.innerHTML = sorted.map(([term, count], i) =>
    `<div class="analytics-rank-row">
      <span class="analytics-rank-pos">${i + 1}.</span>
      <span class="analytics-rank-name">${term}</span>
      <span class="analytics-rank-bar-wrap"><span class="analytics-rank-bar" style="width:${Math.round((count / maxVal) * 100)}%"></span></span>
      <span class="analytics-rank-count">${count}</span>
    </div>`
  ).join('');
}

function renderFilterUsage(filters) {
  const container = document.getElementById('analytics-filter-usage');
  const counts = {};
  filters.forEach(f => {
    const val = f.filter || 'unknown';
    counts[val] = (counts[val] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) { container.textContent = 'No filter usage yet.'; return; }

  const maxVal = sorted[0][1];
  container.innerHTML = sorted.map(([name, count]) =>
    `<div class="filter-bar-row">
      <span class="filter-bar-name">${name}</span>
      <div class="filter-bar-track"><div class="filter-bar-fill" style="width:${Math.round((count / maxVal) * 100)}%"></div></div>
      <span class="filter-bar-count">${count}</span>
    </div>`
  ).join('');
}
