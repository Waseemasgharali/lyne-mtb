const express = require("express");
const session = require("express-session");
const path = require("path");
const dotenv = require("dotenv");
const Stripe = require("stripe");
const bodyParser = require("body-parser");
const PgSession = require("connect-pg-simple")(session);
const { Pool } = require("pg");

// Load environment variables
dotenv.config();

// Import custom routes
const userRoutes = require("./routes/route");
const passwordRoutes = require("./routes/password");
const bannerRoutes = require("./routes/banner");
const productsRoutes = require("./routes/products");

// Initialize Express app
const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public"))); // Serve static files
app.use(express.static("public"));
app.use(express.static(path.join(__dirname, "views")));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Neon connections
  },
});

app.use(
  session({
    store: new PgSession({
      pool: pool, // PostgreSQL connection pool
      tableName: "session", // Table to store session data
    }),
    secret: process.env.SESSION_SECRET || "defaultSecret123",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Use true in production with HTTPS
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  })
);

app.use((req, res, next) => {
  res.locals.user = req.user; // Make user available to templates

  next();
});

// Custom middleware for authentication
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login.html");
  }
  next();
}

function requireAdmin(req, res, next) {
  const user = req.session.user;
  if (
    !(
      user &&
      (user.username === "admin" || user.email === "reece020408@gmail.com")
    )
  ) {
    return res.redirect("/");
  }
  next();
}

// Routes
app.use("/", userRoutes); // User routes
app.use("/", passwordRoutes); // Password routes
app.use("/", bannerRoutes); // Banner routes
app.use("/api/products", productsRoutes); // Product routes

// Root route to serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

// Admin page route
app.get("/admin", requireAuth, requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "admin.html"));
});

// Add product route
app.get("/add-product", requireAuth, requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "add-product.html"));
});
// Add banner route
app.get("/banner", requireAuth, requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "banner.html"));
});

// Set new password page
app.get("/set_new_password", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "set_new_password.html"));
});

// Stripe checkout route
app.post("/stripe-checkout", requireAuth, async (req, res) => {
  try {
    const line_items = req.body.items.map((item) => ({
      price_data: {
        currency: "GBP",
        product_data: {
          name: `${item.title} - Size: ${item.size}`,
          images: [item.image_url],
        },
        unit_amount: Math.round(parseFloat(item.price) * 100),
      },
      quantity: item.quantity,
    }));

    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      success_url: "https://lynemtb.co.uk/success.html",
      cancel_url: "https://lynemtb.co.uk/cancel.html",
      shipping_address_collection: {
        allowed_countries: [
          "GB",
          "IE",
          "FR",
          "DE",
          "ES",
          "IT",
          "NL",
          "BE",
          "LU",
          "PT",
          "AT",
          "FI",
          "GR",
          "EE",
          "LV",
          "LT",
          "CY",
          "MT",
          "SI",
          "SK",
          "CZ",
          "HU",
          "PL",
          "RO",
          "BG",
          "DK",
          "SE",
          "NO",
          "IS",
          "LI",
          "CH",
        ],
      },
      allow_promotion_codes: true,
      shipping_options: [
        { shipping_rate: "shr_1PRYc4JhxfvHGKvCXkz9Wcik" }, // UK shipping
        { shipping_rate: "shr_1PRYcgJhxfvHGKvCQjFVmTWU" }, // Europe shipping
      ],
    });

    res.json({ url: stripeSession.url });
  } catch (error) {
    console.error("Stripe error:", error.message);
    res.status(400).send(error.message);
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
