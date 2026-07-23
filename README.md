<<<<<<< HEAD
# BAZZAR E-Commerce Platform
=======
# BAZZAR — Online Book Store
>>>>>>> b1c11af (cart issue ressolved)

A full-stack e-commerce web application for buying books online, built with vanilla HTML/CSS/JavaScript, Node.js, Express.js, and PostgreSQL.

---

## Features

### Customer
- User Registration & Login (JWT Authentication)
- Role-based redirect — admins go to the dashboard, users go to the shop
- Browse books by category (Fiction, Academic, Islamic, Children, Self Help)
- Live product search + category filter
- **Persistent shopping cart** — survives page refreshes via localStorage
- Stock-aware cart — out-of-stock books are disabled automatically
- Guest checkout (no account required)
- Delivery details form + order confirmation receipt
- View personal order history with status tracking

### Admin
- Protected dashboard (admin-only access)
- Stats overview — total products, total orders, total revenue
- Full product CRUD — add, edit, delete books
- View all customer orders
- Update order status (Pending → Processing → Shipping → Delivered)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js, Express.js v5 |
| Database | PostgreSQL (hosted on Neon) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Deployment | Railway (backend), Neon (database) |

---

## Project Structure

```
modrn/
├── backend/
│   ├── server.js        ← All API routes (Auth, Products, Orders)
│   ├── db.js            ← PostgreSQL connection pool
│   ├── .env             ← DB credentials + JWT_SECRET + PORT
│   └── package.json
│
├── frontend/
│   ├── index.html       ← Landing page (hero, categories, about)
│   ├── shop.html        ← Product listing, cart, checkout
│   ├── admin.html       ← Admin dashboard (SPA layout)
│   ├── style.css        ← All styles
│   └── js/
│       ├── index.js     ← Login/register logic, nav animations
│       ├── shop.js      ← Products, cart (localStorage), checkout, orders
│       └── admin.js     ← Product CRUD, order management, stats
│
└── docs/                ← Static frontend mirror (for deployment)
```

---

## Database Schema

```
users         → id, name, email, password, role
products      → id, name, description, price, image_url, category, stock
orders        → id, user_id, full_name, phone, address, total, status, created_at
order_items   → id, order_id, product_id, quantity, price
```

---

## API Endpoints

| Method | Route | Description |
|---|---|---|
| POST | `/register` | Create a new user account |
| POST | `/login` | Login and receive JWT token |
| DELETE | `/user/:id` | Delete a user account |
| GET | `/products` | Get all products (supports `?search=` and `?category=`) |
| POST | `/products` | Add a new product |
| PUT | `/products/:id` | Update a product |
| DELETE | `/products/:id` | Delete a product |
| POST | `/orders` | Place an order (decrements stock) |
| GET | `/orders` | Get all orders (admin) |
| GET | `/orders/user/:id` | Get a user's order history |
| PUT | `/orders/:id/status` | Update order status |

---

## Installation

### Prerequisites
- Node.js v18+
- A PostgreSQL database (Neon free tier recommended)

### Steps

```bash
# 1. Clone the repository
git clone <repo-url>
cd modrn

# 2. Install backend dependencies
cd backend
npm install

# 3. Configure environment variables
# Create backend/.env with the following:
DB_HOST=your-neon-host
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=your-db-name
DB_PORT=5432
JWT_SECRET=your-secret-key
PORT=5500

# 4. Start the backend server
npm start

# 5. Open the frontend
# Open frontend/index.html in your browser
# Or serve the frontend/ folder with any static file server
```

---

## Deployment

- **Backend**: Deployed on [Railway](https://railway.app) — push to Git, auto-deploys.
- **Database**: Hosted on [Neon](https://neon.tech) — serverless PostgreSQL, free tier.
- **Frontend**: Static files — can be served via GitHub Pages (`docs/` folder), Netlify, or Vercel.

---

## Author

**Zoha Malik** — [zohamalikdev](https://github.com/zohamalikdev)
