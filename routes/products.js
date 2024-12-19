const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { Pool } = require("pg");
const cloudinary = require("cloudinary").v2;
const stream = require("stream");

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

// Allowed image types
const ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "gif"];

const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split(".").pop().toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"), false);
    }
  },
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Ensure DATABASE_URL is set in environment variables
  ssl: { rejectUnauthorized: false },
});

// Add a Product
router.post("/", upload.single("image"), async (req, res) => {
  const { title, price, subtitle, sizes, description, inventory } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    // Upload image to Cloudinary using the buffer from memory storage
    const imageUploadResult = await cloudinary.uploader.upload_stream(
      { resource_type: "image" },
      async (error, result) => {
        if (error) {
          return res
            .status(500)
            .json({ error: "Image upload to Cloudinary failed" });
        }

        // Insert product data into PostgreSQL
        const resultPostgres = await pool.query(
          `INSERT INTO products (title, price, image_url, subtitle, sizes, description, inventory) 
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [
            title,
            price,
            result.secure_url, // Cloudinary image URL
            subtitle,
            sizes,
            description,
            inventory || 0,
          ]
        );

        res.status(201).json({
          message: "Product added successfully",
          product: resultPostgres.rows[0],
        });
      }
    );

    // Create a stream from the uploaded image file buffer
    const bufferStream = new stream.PassThrough();
    bufferStream.end(req.file.buffer);
    bufferStream.pipe(imageUploadResult);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add product" });
  }
});

// Add to routes/products.js
router.post("/update-inventory", async (req, res) => {
  const { productId, quantity } = req.body;
  try {
    const result = await pool.query(
      "UPDATE products SET inventory = inventory - $1 WHERE id = $2 RETURNING *",
      [quantity, productId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to update inventory" });
  }
});

router.put("/:id", upload.single("image"), async (req, res) => {
  const { id } = req.params;
  let { title, price, subtitle, sizes, description, inventory } = req.body;

  // Convert description to string if not already
  description =
    typeof description === "string" ? description : String(description || "");

  // Enhanced cleaning: remove leading commas and extra whitespace
  const cleanDescription = description
    .replace(/^,+/, "") // Remove leading commas
    .replace(/,+/g, ",") // Replace multiple commas with single comma
    .trim(); // Remove whitespace from start and end

  try {
    let updateQuery = `
      UPDATE products 
      SET title = $1, price = $2, subtitle = $3, sizes = $4, description = $5, inventory = $6
    `;
    let queryParams = [
      title,
      price,
      subtitle,
      sizes,
      cleanDescription,
      inventory,
    ];
    let paramCount = 6;

    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const streamUpload = cloudinary.uploader.upload_stream(
          { resource_type: "image" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        const bufferStream = new stream.PassThrough();
        bufferStream.end(req.file.buffer);
        bufferStream.pipe(streamUpload);
      });

      updateQuery += `, image_url = $${paramCount + 1}`;
      queryParams.push(uploadResult.secure_url);
      paramCount++;
    }

    updateQuery += ` WHERE id = $${paramCount + 1} RETURNING *`;
    queryParams.push(id);

    const result = await pool.query(updateQuery, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({
      message: "Product updated successfully",
      product: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Failed to update product" });
  }
});

// Get All Products
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM products ORDER BY order_index ASC"
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// Get Product by ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM products WHERE id = $1", [
      id,
    ]);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: "Product not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// Delete Product by ID
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM products WHERE id = $1", [id]);
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// Update Product Order
router.post("/update-order", async (req, res) => {
  const updates = req.body;
  try {
    for (const update of updates) {
      await pool.query("UPDATE products SET order_index = $1 WHERE id = $2", [
        update.order_index,
        update.id,
      ]);
    }
    res.json({ message: "Product order updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update product order" });
  }
});

// Add order_index column (if not exists)
async function addOrderIndexColumn() {
  const db = await getDBConnection();
  try {
    await db.run(
      "ALTER TABLE products ADD COLUMN order_index INTEGER DEFAULT 0"
    );
  } catch (e) {
    if (e.message.includes("duplicate column")) {
      console.log('Column "order_index" already exists');
    } else {
      console.error(`Error: ${e.message}`);
    }
  } finally {
    await db.close();
  }
}

module.exports = router;
