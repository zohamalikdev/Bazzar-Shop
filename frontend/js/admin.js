/* ============================================================
   BAZZAR — admin.js
   Handles: dashboard stats, product CRUD (add/edit/delete),
   order list + status updates, sidebar navigation.
   ============================================================ */

const API = 'https://bazzar-backend-production.up.railway.app';

// Returns the stored JWT as a ready-to-use Authorization header value
function token() {
  return localStorage.getItem('token');
}

// Guard: only logged-in admins can use this page
const user = JSON.parse(localStorage.getItem('user'));
if (!user || user.role !== 'admin') {
  window.location.href = 'index.html';
}


/* ---------------- SIDEBAR NAVIGATION ---------------- */

// Switches between Dashboard / Products / Orders sections
// and loads the relevant data for whichever one is opened.
function showSection(name) {
  ['dashboard', 'products', 'orders'].forEach(section => {
    document.getElementById('section-' + section).style.display = 'none';
  });

  document.querySelectorAll('.sidebar-menu a').forEach(link => link.classList.remove('active'));

  document.getElementById('section-' + name).style.display = 'block';
  document.getElementById('menu' + name.charAt(0).toUpperCase() + name.slice(1)).classList.add('active');

  if (name === 'products') loadProducts();
  if (name === 'orders') loadOrders();
  if (name === 'dashboard') loadStats();
}


/* ---------------- DASHBOARD STATS ---------------- */

async function loadStats() {
  try {
    const [productsRes, ordersRes] = await Promise.all([
      fetch(`${API}/products`),
      fetch(`${API}/orders`, {
        headers: { 'Authorization': `Bearer ${token()}` }
      })
    ]);

    const products = await productsRes.json();
    const orders = await ordersRes.json();

    document.getElementById('statProducts').textContent = products.length;
    document.getElementById('statOrders').textContent = orders.length;

    const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
    document.getElementById('statRevenue').textContent = `Rs ${totalRevenue.toFixed(0)}`;
  } catch (err) {
    console.log('Failed to load stats:', err);
  }
}


/* ---------------- PRODUCTS: LOAD & DISPLAY ---------------- */

async function loadProducts() {
  try {
    const res = await fetch(`${API}/products`);
    const products = await res.json();

    document.getElementById('productsBody').innerHTML = products.map(p => `
      <tr>
        <td><img src="${p.image_url}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/50'"/></td>
        <td><strong>${p.name}</strong></td>
        <td><span class="cat-tag">${p.category}</span></td>
        <td>Rs ${parseFloat(p.price).toFixed(0)}</td>
        <td>${p.stock}</td>
        <td>
          <button class="btn-edit" onclick="editProduct(${p.id}, '${escapeQuotes(p.name)}', '${escapeQuotes(p.description)}', ${p.price}, '${p.image_url}', '${p.category}', ${p.stock})">Edit</button>
          <button class="btn-delete" onclick="deleteProduct(${p.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    alert('Could not load products!');
  }
}

// Helper: safely escape single quotes so product names/descriptions
// with an apostrophe (e.g. "Men's Watch") don't break the onclick string.
function escapeQuotes(text) {
  return (text || '').replace(/'/g, "\\'");
}


/* ---------------- PRODUCTS: ADD / EDIT MODAL ---------------- */

function openProductModal() {
  document.getElementById('productModalTitle').textContent = 'Add New Product';

  // Clear all fields for a fresh "Add" form
  document.getElementById('productId').value = '';
  document.getElementById('productName').value = '';
  document.getElementById('productDescription').value = '';
  document.getElementById('productPrice').value = '';
  document.getElementById('productImage').value = '';
  document.getElementById('productCategory').value = '';
  document.getElementById('productStock').value = '';

  document.getElementById('productModal').classList.add('active');
}

function editProduct(id, name, description, price, image, category, stock) {
  document.getElementById('productModalTitle').textContent = 'Edit Product';

  // Pre-fill the form with this product's existing data
  document.getElementById('productId').value = id;
  document.getElementById('productName').value = name;
  document.getElementById('productDescription').value = description;
  document.getElementById('productPrice').value = price;
  document.getElementById('productImage').value = image;
  document.getElementById('productCategory').value = category;
  document.getElementById('productStock').value = stock;

  document.getElementById('productModal').classList.add('active');
}

// Used for both Add and Edit — if productId has a value, we PUT (update),
// otherwise we POST (create new).
async function saveProduct() {
  const id = document.getElementById('productId').value;

  const productData = {
    name: document.getElementById('productName').value.trim(),
    description: document.getElementById('productDescription').value.trim(),
    price: document.getElementById('productPrice').value,
    image_url: document.getElementById('productImage').value.trim(),
    category: document.getElementById('productCategory').value,
    stock: document.getElementById('productStock').value
  };

  if (!productData.name || !productData.price || !productData.category) {
    alert('Please fill Name, Price and Category!');
    return;
  }

  try {
    const res = await fetch(`${API}/products${id ? '/' + id : ''}`, {
      method: id ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token()}`
      },
      body: JSON.stringify(productData)
    });

    if (res.ok) {
      closeModal('productModal');
      loadProducts();
      loadStats(); // refresh product count on dashboard too
    } else {
      alert('Error saving product!');
    }
  } catch (err) {
    alert('Could not connect to server!');
  }
}

async function deleteProduct(id) {
  if (!confirm('Are you sure you want to delete this product?')) return;

  try {
    await fetch(`${API}/products/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token()}` }
    });
    loadProducts();
    loadStats();
  } catch (err) {
    alert('Error deleting product!');
  }
}


/* ---------------- ORDERS: LOAD & STATUS UPDATE ---------------- */

async function loadOrders() {
  try {
    const res = await fetch(`${API}/orders`, {
      headers: { 'Authorization': `Bearer ${token()}` }
    });
    const orders = await res.json();

    document.getElementById('ordersBody').innerHTML = orders.map(o => `
      <tr>
        <td><strong>#${o.id}</strong></td>
        <td>${o.customer_name || o.full_name}</td>
        <td>${o.phone}</td>
        <td>${o.address}</td>
        <td>Rs ${parseFloat(o.total).toFixed(0)}</td>
        <td>${new Date(o.created_at).toLocaleDateString()}</td>
        <td>
          <select class="status-select" onchange="updateStatus(${o.id}, this.value)">
            <option value="Pending"    ${o.status === 'Pending'    ? 'selected' : ''}>Pending</option>
            <option value="Processing" ${o.status === 'Processing' ? 'selected' : ''}>Processing</option>
            <option value="Shipping"   ${o.status === 'Shipping'   ? 'selected' : ''}>Shipping</option>
            <option value="Delivered"  ${o.status === 'Delivered'  ? 'selected' : ''}>Delivered</option>
          </select>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    alert('Could not load orders!');
  }
}

async function updateStatus(orderId, newStatus) {
  try {
    await fetch(`${API}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token()}`
      },
      body: JSON.stringify({ status: newStatus })
    });
  } catch (err) {
    alert('Error updating status!');
  }
}


/* ---------------- MODAL HELPERS ---------------- */

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// Close modal by clicking its dark background
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('active');
  });
});


/* ---------------- LOGOUT ---------------- */

function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}


/* ---------------- INITIAL LOAD ---------------- */

loadStats();