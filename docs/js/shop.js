/* ============================================================
   BAZZAR — shop.js
   Handles: loading & displaying products, search, category
   filters, cart logic, checkout flow, and "My Orders".
   ============================================================ */

const API = 'https://bazzar-backend-production.up.railway.app';

// In-memory cart — resets if the page is refreshed (a known limitation)
let cart = [];

// All products currently loaded for the active category (used by search)
let allProducts = [];

// Which category filter is currently active ('' means "All")
let currentCategory = '';

// Currently logged-in user, read once from localStorage (or null if guest)
const user = JSON.parse(localStorage.getItem('user'));


const params = new URLSearchParams(window.location.search);
const category = params.get("category");

console.log(category);



/* ---------------- PAGE LOAD ---------------- */

window.onload = function () {
  // Show "User" menu if logged in, otherwise show "Login" button
  if (user) {
    document.getElementById('userMenuSection').style.display = 'block';
    document.getElementById('guestSection').style.display = 'none';
    document.getElementById('userBtn').textContent = user.name;
  }

  // If we arrived here via a "category" link (e.g. shop.html?category=Fashion),
  // pre-select that category filter button.
  const urlParams = new URLSearchParams(window.location.search);
  const categoryFromUrl = urlParams.get('category');
  if (categoryFromUrl) {
    currentCategory = categoryFromUrl;
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.textContent === categoryFromUrl) btn.classList.add('active');
    });
  }

  loadProducts();
};


/* ---------------- LOAD & DISPLAY PRODUCTS ---------------- */

async function loadProducts() {
  try {
    let url = `${API}/products`;
    if (currentCategory) url += `?category=${currentCategory}`;

    const res = await fetch(url);
    allProducts = await res.json();
    displayProducts(allProducts);
  } catch (err) {
    document.getElementById('productsGrid').innerHTML =
      '<p class="loading-text">Could not load products. Make sure server is running!</p>';
  }
}

function formatPrice(price) {
  return `Rs ${parseFloat(price).toLocaleString()}`;
}

// ──  the entire displayProducts() function 

function displayProducts(products) {
  const grid = document.getElementById('productsGrid');
  if (products.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-light); grid-column:1/-1; text-align:center; padding:60px 0; font-size:14px;">No products found.</p>';
    return;
  }

  grid.innerHTML = products.map(p => `
    <div class="product-card">

      <!-- Image + overlapping badge -->
      <div class="product-img-wrap">
        <img
          src="${p.image_url}"
          alt="${p.name}"
          onerror="this.src='https://via.placeholder.com/400x340?text=No+Image'"
        />
        <span class="stock-badge ${p.stock > 0 ? 'in-stock' : 'out-stock'}">
          ${p.stock > 0 ? 'In Stock' : 'Out of Stock'}
        </span>
      </div>

      <!-- Info -->
      <div class="product-info">
        <span class="product-category">${p.category}</span>
        <h3>${p.name}</h3>
        <p>${p.description}</p>
        <div class="price">${formatPrice(p.price)}</div>
        <button
          class="btn-add-cart"
          onclick="addToCart(${p.id}, '${p.name.replace(/'/g,"\\'")}', ${p.price}, '${p.image_url}')"
          ${p.stock === 0 ? 'disabled' : ''}>
          ${p.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>

    </div>
  `).join('');
}



/* ---------------- SEARCH & FILTER ---------------- */

// Search filters within whatever category is currently active
// (so search + category filter work together correctly).
function searchProducts() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const filtered = allProducts.filter(p =>
    p.name.toLowerCase().includes(query) ||
    p.description.toLowerCase().includes(query)
  );
  displayProducts(filtered);
}

function filterCategory(category) {
  currentCategory = category;

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
    const isAllButton = category === '' && btn.textContent === 'All';
    if (isAllButton || btn.textContent === category) {
      btn.classList.add('active');
    }
  });

  // Clear any previous search text so the new category shows fully
  document.getElementById('searchInput').value = '';
  loadProducts();
}


/* ---------------- CART ---------------- */

function addToCart(id, name, price, image) {
  const existingItem = cart.find(item => item.id === id);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ id, name, price: parseFloat(price), image, quantity: 1 });
  }

  updateCartUI();
  document.getElementById('cartPanel').classList.add('open');
}

function removeFromCart(id) {
  cart = cart.filter(item => item.id !== id);
  updateCartUI();
}

function updateCartUI() {
  const badge = document.getElementById('cartBadge');
  const itemsDiv = document.getElementById('cartItems');
  const totalDiv = document.getElementById('cartTotal');

  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  badge.textContent = totalItemCount;

  if (cart.length === 0) {
    itemsDiv.innerHTML = '<p class="cart-empty">Your cart is empty</p>';
    totalDiv.textContent = 'Total: Rs 0.00';
    return;
  }

  itemsDiv.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/70'"/>
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <p>Rs ${item.price.toFixed(2)} x ${item.quantity}</p>
      </div>
      <button class="remove-item" onclick="removeFromCart(${item.id})">&#x2715;</button>
    </div>
  `).join('');

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  totalDiv.textContent = `Total: Rs ${cartTotal.toFixed(2)}`;
}

function toggleCart() {
  document.getElementById('cartPanel').classList.toggle('open');
}


/* ---------------- USER DROPDOWN MENU ---------------- */

function toggleDropdown() {
  document.getElementById('userDropdown').classList.toggle('active');
}

// Close the dropdown if the user clicks anywhere outside of it
document.addEventListener('click', function (e) {
  const menu = document.getElementById('userMenuSection');
  if (menu && !menu.contains(e.target)) {
    document.getElementById('userDropdown').classList.remove('active');
  }
});


/* ---------------- MODALS ---------------- */

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// Close any modal by clicking its dark background (outside the box)
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('active');
  });
});


/* ---------------- CHECKOUT FLOW ---------------- */

function openDeliveryModal() {
  if (cart.length === 0) {
    alert('Your cart is empty!');
    return;
  }
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  document.getElementById('modalTotal').textContent = `Total Amount: Rs ${cartTotal.toFixed(2)}`;
  document.getElementById('deliveryModal').classList.add('active');
}

async function placeOrder() {
  const fullName = document.getElementById('fullName').value.trim();
  const phone = document.getElementById('phoneNumber').value.trim();
  const address = document.getElementById('deliveryAddress').value.trim();

  if (!fullName || !phone || !address) {
    alert('Please fill in Name, Phone and Address!');
    return;
  }

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Guest checkout is supported: user_id is null if nobody is logged in
  const orderData = {
    user_id: user ? user.id : null,
    full_name: fullName,
    phone: phone,
    address: address,
    total: total,
    items: cart.map(item => ({
      product_id: item.id,
      quantity: item.quantity,
      price: item.price
    }))
  };

  try {
    const res = await fetch(`${API}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    const data = await res.json();

    if (res.ok) {
      closeModal('deliveryModal');
      document.getElementById('cartPanel').classList.remove('open');
      showReceipt(fullName, phone, address, total);
      cart = [];
      updateCartUI();
    } else {
      alert('Error: ' + data.message);
    }
  } catch (err) {
    alert('Could not connect to server!');
  }
}

function showReceipt(name, phone, address, total) {
  document.getElementById('receiptDetails').innerHTML = `
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Phone:</strong> ${phone}</p>
    <p><strong>Address:</strong> ${address}</p>
    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
  `;
  document.getElementById('receiptTotal').textContent = `Total Paid: Rs ${total.toFixed(2)}`;
  document.getElementById('receiptModal').classList.add('active');
}


/* ---------------- MY ORDERS ---------------- */

async function showOrders() {
  toggleDropdown();
  if (!user) return;

  try {
    const res = await fetch(`${API}/orders/user/${user.id}`);
    const orders = await res.json();

    const list = document.getElementById('ordersList');

    if (orders.length === 0) {
      list.innerHTML = '<p class="no-orders-text">No orders yet.</p>';
    } else {
      list.innerHTML = orders.map(o => `
        <div class="order-card">
          <h4>Order #${o.id}</h4>
          <p><strong>Address:</strong> ${o.address}</p>
          <p><strong>Total:</strong> Rs ${parseFloat(o.total).toFixed(2)}</p>
          <p><strong>Date:</strong> ${new Date(o.created_at).toLocaleDateString()}</p>
          <span class="order-status status-${o.status.toLowerCase()}">${o.status}</span>
        </div>
      `).join('');
    }

    document.getElementById('ordersModal').classList.add('active');
  } catch (err) {
    alert('Could not load orders!');
  }
}


/* ---------------- LOGOUT & DELETE PROFILE ---------------- */

function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

async function deleteProfile() {
  if (!confirm('Are you sure you want to delete your account? This cannot be undone!')) return;

  try {
    await fetch(`${API}/user/${user.id}`, { method: 'DELETE' });
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    alert('Account deleted.');
    window.location.href = 'index.html';
  } catch (err) {
    alert('Error deleting account!');
  }
}


/* ---------------- NAVBAR SCROLL EFFECT ---------------- */

const navbar = document.querySelector('.navbar, .shop-navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  });
}


/* ---------------- FADE-IN ON SCROLL ---------------- */

const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) e.target.classList.add('visible');
  });
}, { threshold: 0.12 });

document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));