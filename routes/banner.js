const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { Pool } = require("pg");
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Add Banner Image
router.post("/api/banner", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image file provided" });
  }

  try {
    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: "image" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      const bufferStream = require("stream").Readable.from(req.file.buffer);
      bufferStream.pipe(uploadStream);
    });

    // Save to database
    const result = await pool.query(
      "INSERT INTO banner_images (image_url, public_id, order_index) VALUES ($1, $2, (SELECT COALESCE(MAX(order_index), 0) + 1 FROM banner_images)) RETURNING *",
      [uploadResult.secure_url, uploadResult.public_id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error uploading banner:", error);
    res.status(500).json({ error: "Failed to upload banner image" });
  }
});

// Get All Banner Images
router.get("/api/banner", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM banner_images ORDER BY order_index ASC"
    );
    res.json(result.rows || []);
  } catch (error) {
    console.error("Error fetching banners:", error);
    res.status(500).json({ error: "Failed to fetch banner images" });
  }
});

// Delete Banner Image
router.delete("/api/banner/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Get the public_id before deleting
    const imageResult = await pool.query(
      "SELECT public_id FROM banner_images WHERE id = $1",
      [id]
    );
    if (imageResult.rows.length > 0) {
      // Delete from Cloudinary
      await cloudinary.uploader.destroy(imageResult.rows[0].public_id);

      // Delete from database
      await pool.query("DELETE FROM banner_images WHERE id = $1", [id]);
      res.json({ message: "Banner deleted successfully" });
    } else {
      res.status(404).json({ error: "Banner not found" });
    }
  } catch (error) {
    console.error("Error deleting banner:", error);
    res.status(500).json({ error: "Failed to delete banner image" });
  }
});

module.exports = router;
