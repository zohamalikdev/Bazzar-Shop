// Main server file - this is the brain of our website
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const pool = require('./db');
const app = express();

// Middleware - allows our server to read JSON and talk to frontend
app.use(cors());
app.use(express.json());

// ==================== SECURITY MIDDLEWARE ====================

// Verifies the user is logged in via their JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expects "Bearer <token>"

  if (!token) {
    return res.status(401).json({ message: 'Access denied. Token missing.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }
}

// Verifies the logged-in user is specifically an administrator
function requireAdmin(req, res, next) {
  authenticateToken(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access forbidden. Admins only.' });
    }
    next();
  });
}

// ==================== AUTH ROUTES ====================

// REGISTER - creates a new user account
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    // Check if email already exists
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    // Encrypt the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, hashedPassword, 'user']
    );
    res.json({ message: 'Account created successfully!' });
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// LOGIN - checks email and password
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Email not found' });
    }
    const user = result.rows[0];
    // Compare password with encrypted one in database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Wrong password' });
    }
    // Create a token so user stays logged in
    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// DELETE PROFILE (Protected: Users can only delete their own account)
app.delete('/user/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  // Bug #2 Fix: Prevent users from deleting other profiles by verifying ID matching
  if (req.user.id !== parseInt(id) && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized profile deletion attempt.' });
  }

  try {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// ==================== PRODUCT ROUTES ====================

// GET ALL PRODUCTS (Public: with optional search and category filter)
app.get('/products', async (req, res) => {
  const { search, category } = req.query;
  try {
    let query = 'SELECT * FROM products WHERE 1=1';
    let params = [];
    if (search) {
      params.push(`%${search}%`);
      query += ` AND name ILIKE $${params.length}`;
    }
    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// ADD PRODUCT (Protected: Admin only)
app.post('/products', requireAdmin, async (req, res) => {
  const { name, description, price, image_url, category, stock } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO products (name, description, price, image_url, category, stock) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [name, description, price, image_url, category, stock]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// UPDATE PRODUCT (Protected: Admin only)
app.put('/products/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, description, price, image_url, category, stock } = req.body;
  try {
    const result = await pool.query(
      'UPDATE products SET name=$1, description=$2, price=$3, image_url=$4, category=$5, stock=$6 WHERE id=$7 RETURNING *',
      [name, description, price, image_url, category, stock, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// DELETE PRODUCT (Protected: Admin only)
app.delete('/products/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM products WHERE id = $1', [id]);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// ==================== ORDER ROUTES ====================

// PLACE ORDER (Public endpoint supporting guest checkouts)
app.post('/orders', async (req, res) => {
  const { user_id, full_name, phone, address, total, items } = req.body;
  try {
    // Create the order
    const orderResult = await pool.query(
      'INSERT INTO orders (user_id, full_name, phone, address, total) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [user_id, full_name, phone, address, total]
    );
    const order = orderResult.rows[0];
    // Add each item to order_items table
    for (let item of items) {
      await pool.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1,$2,$3,$4)',
        [order.id, item.product_id, item.quantity, item.price]
      );
      // Reduce stock
      await pool.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }
    res.json({ message: `Thank you ${full_name}! Your order has been placed.`, order });
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// GET USER ORDERS (Protected: Ensure users can only query their own history)
app.get('/orders/user/:user_id', authenticateToken, async (req, res) => {
  const { user_id } = req.params;

  if (req.user.id !== parseInt(user_id) && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized order history search request.' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [user_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// GET ALL ORDERS (Protected: Admin only)
app.get('/orders', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT orders.*, users.name as customer_name FROM orders LEFT JOIN users ON orders.user_id = users.id ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// UPDATE ORDER STATUS (Protected: Admin only)
app.put('/orders/:id/status', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE orders SET status=$1 WHERE id=$2 RETURNING *',
      [status, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5500;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});