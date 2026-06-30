/* ============================================================
   BAZZAR — index.js
   Handles: login/register modals, navigation helpers,
   navbar scroll effect, and fade-in animations on the
   homepage (index.html).
   ============================================================ */

// Your backend API base URL (hosted on Railway)
const API = 'https://bazzar-backend-production.up.railway.app';


/* ---------------- MODAL HELPERS ---------------- */

// Show a modal by its element id (e.g. 'loginModal')
function openModal(id) {
  document.getElementById(id).classList.add('active');
}

// Hide a modal by its element id
function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// Close one modal and open another (used for "Don't have an account? Register")
function switchModal(closeId, openId) {
  closeModal(closeId);
  openModal(openId);
}

// Close any modal if the user clicks on the dark background (outside the box)
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', function (e) {
    if (e.target === this) {
      this.classList.remove('active');
    }
  });
});


/* ---------------- NAVIGATION HELPERS ---------------- */

// Smooth scroll down to the categories section on this same page
function scrollToCategories() {
  document.getElementById('categories').scrollIntoView({ behavior: 'smooth' });
}

// Go to the shop page
function goToShop() {
  window.location.href = 'shop.html';
}

// Go to the shop page, pre-filtered by a specific category
function goToCategory(category) {
  window.location.href = `shop.html?category=${category}`;
}


/* ---------------- REGISTER ---------------- */

async function handleRegister() {
  const name = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value.trim();
  const errorDiv = document.getElementById('registerError');

  // Basic front-end validation before even calling the API
  if (!name || !email || !password) {
    errorDiv.textContent = 'Please fill in all fields!';
    return;
  }

  try {
    const response = await fetch(`${API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const data = await response.json();

    if (response.ok) {
      alert('Account created! Please login.');
      closeModal('registerModal');
      openModal('loginModal');
    } else {
      // Server sends back a message like "Email already registered"
      errorDiv.textContent = data.message;
    }
  } catch (err) {
    errorDiv.textContent = 'Could not connect to server!';
  }
}


/* ---------------- LOGIN ---------------- */

async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const errorDiv = document.getElementById('loginError');

  if (!email || !password) {
    errorDiv.textContent = 'Please fill in all fields!';
    return;
  }

  try {
    const response = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      // Save the JWT token + user info so other pages know we're logged in
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Send admins to the dashboard, everyone else to the shop
      if (data.user.role === 'admin') {
        window.location.href = 'admin.html';
      } else {
        window.location.href = 'shop.html';
      }
    } else {
      errorDiv.textContent = data.message;
    }
  } catch (err) {
    errorDiv.textContent = 'Could not connect to server!';
  }
}


/* ---------------- NAVBAR SCROLL EFFECT ---------------- */

// Adds a "scrolled" class to the navbar after scrolling 40px down,
// used in CSS to give the navbar a background once you leave the top.
const navbar = document.querySelector('.navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  });
}


/* ---------------- FADE-IN ON SCROLL ---------------- */

// Any element with class "fade-up" gets a "visible" class added
// once it scrolls into view — CSS handles the actual animation.
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));