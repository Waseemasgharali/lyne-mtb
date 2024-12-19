// Header Scroll
const header = document.querySelector("header");

window.addEventListener("scroll", () => {
  header.classList.toggle("shadow", window.scrollY > 0);
});

// Get the product and cart elements
const productList = document.getElementById("productList");
const cartItemsElement = document.getElementById("cartItems");
const cartTotalElement = document.getElementById("cartTotal");

// Store Cart Items in Local Storage
let cart = JSON.parse(localStorage.getItem("cart")) || [];

// Fetch products from the server
function fetchProducts() {
  fetch("/api/products")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Error fetching products: ${response.statusText}`);
      }
      return response.json();
    })
    .then((data) => {
      if (Array.isArray(data)) {
        renderProducts(data); // Render products on the index page
      } else {
        console.error("Unexpected data structure:", data);
        alert("Error fetching products. Please try again.");
      }
    })
    .catch((error) => console.error("Error fetching products:", error));
}

// Render products on the index page
function renderProducts(products) {
  productList.innerHTML = products
    .map(
      (product) => `
      <div class="product" onclick="openProductDetails(${product.id})">
        <img src="${product.image_url}" alt="${
        product.title
      }" class="product-img" />
        <div class="product-info">
          <h2 class="product-title">${product.title}</h2>
          <p class="product-price">£${product.price.toFixed(2)}</p>
        </div>
      </div>
    `
    )
    .join("");
}

// Open product details page
function openProductDetails(productId) {
  window.location.href = `product-details.html?id=${productId}`;
}

// Add to cart
// In public/js/main.js
function addToCart(event) {
  const productID = parseInt(event.target.dataset.id);

  // Prevent adding to cart if no size is selected
  const sizeWarning = document.getElementById("size-warning");

  if (typeof selectedSize === "undefined" || selectedSize === null) {
    sizeWarning.style.display = "block";
    return;
  }

  // Check inventory before adding to cart
  fetch(`/api/products/${productID}`)
    .then((response) => response.json())
    .then((product) => {
      if (product.inventory <= 0) {
        showToast("Sorry, this item is out of stock!", "bx bx-x-circle");
        return;
      }

      const existingItem = cart.find(
        (item) => item.id === productID && item.size === selectedSize
      );

      if (existingItem) {
        // Check if adding one more would exceed inventory
        if (existingItem.quantity + 1 > product.inventory) {
          showToast("Sorry, not enough stock available!", "bx bx-x-circle");
          return;
        }
        existingItem.quantity++;
      } else {
        const cartItem = {
          id: product.id,
          title: product.title,
          price: product.price,
          image_url: product.image_url,
          size: selectedSize,
          quantity: 1,
        };
        cart.push(cartItem);
      }

      showToast("Item added to cart!", "bx bxs-check-circle");
      event.target.textContent = "Added";
      saveToLocalStorage();
      updateCartIcon();
      renderCartItems();
      calculateCartTotal();
    });
}

// Remove from cart
function removeFromCart(event) {
  const productID = parseInt(event.target.dataset.id);
  cart = cart.filter((item) => item.id !== productID);
  saveToLocalStorage(); // Save changes
  renderCartItems(); // Update the cart UI
  calculateCartTotal(); // Recalculate total
  updateCartIcon(); // Update cart icon

  // Show a toast notification for item removal
  showToast("Item removed from cart", "bx bxs-check-circle");
}

// Change cart item quantity
function changeQuantity(event) {
  const productID = parseInt(event.target.dataset.id);
  const newQuantity = parseInt(event.target.value);

  if (newQuantity > 0) {
    // Check inventory before updating quantity
    fetch(`/api/products/${productID}`)
      .then((response) => response.json())
      .then((product) => {
        if (newQuantity > product.inventory) {
          // Reset input to available inventory amount
          event.target.value = product.inventory;
          showToast(
            "Sorry, only " + product.inventory + " items available!",
            "bx bx-x-circle"
          );

          // Update cart with max available quantity
          const cartItem = cart.find((item) => item.id === productID);
          if (cartItem) {
            cartItem.quantity = product.inventory;
            saveToLocalStorage();
            calculateCartTotal();
            updateCartIcon();
            renderCartItems();
          }
        } else {
          // Update quantity if within inventory limits
          const cartItem = cart.find((item) => item.id === productID);
          if (cartItem) {
            cartItem.quantity = newQuantity;
            saveToLocalStorage();
            calculateCartTotal();
            updateCartIcon();
            showToast("Cart updated!", "bx bxs-check-circle");
          }
        }
      })
      .catch((err) => {
        console.error("Error checking inventory:", err);
        showToast("Error updating cart. Please try again.", "bx bx-x-circle");
      });
  }
}

// Save cart to local storage
function saveToLocalStorage() {
  localStorage.setItem("cart", JSON.stringify(cart));
}

// Render cart items
function renderCartItems() {
  cartItemsElement.innerHTML = cart
    .map(
      (item) => `
      <div class="cart-item">
        <img src="${item.image_url}" alt="${item.title}" />
        <div class="cart-item-info">
          <h2 class="cart-item-title">${item.title} (${item.size})</h2> <!-- Include size -->
          <input
            type="number"
            min="1"
            value="${item.quantity}"
            data-id="${item.id}"
            class="cart-item-quantity"
          />
        </div>
        <h2 class="cart-item-price">£${item.price}</h2>
        <button class="remove-from-cart" data-id="${item.id}">Remove</button>
      </div>
    `
    )
    .join("");

  // Add event listeners for quantity change and remove button
  const quantityInputs = document.querySelectorAll(".cart-item-quantity");
  quantityInputs.forEach((input) => {
    input.addEventListener("change", changeQuantity);
  });

  const removeButtons = document.getElementsByClassName("remove-from-cart");
  for (let i = 0; i < removeButtons.length; i++) {
    removeButtons[i].addEventListener("click", removeFromCart);
  }
}

// Calculate cart total
function calculateCartTotal() {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  cartTotalElement.textContent = `Total: £${total.toFixed(2)}`;
}

// Clear cart on successful payment
function clearCart() {
  cart = [];
  saveToLocalStorage(); // Save changes
  updateCartIcon(); // Update the cart icon
}

// Update cart icon quantity
function updateCartIcon() {
  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartIcon = document.getElementById("cart-icon");
  cartIcon.setAttribute("data-quantity", totalQuantity);
}

// Update login status on page load
document.addEventListener("DOMContentLoaded", () => {
  updateLoginStatus();

  // Example code to update UI based on user authentication status
  fetch("/api/user")
    .then((response) => response.json())
    .then((data) => {
      const loginBtn = document.querySelector(".log-sign");
      if (data.user) {
        // User is logged in
        loginBtn.href = "/logout";
        loginBtn.innerText = "Logout";
      } else {
        // User is not logged in
        loginBtn.href = "login.html";
        loginBtn.innerText = "Login";
      }
    })
    .catch((error) =>
      console.error("Error checking user authentication:", error)
    );
});

function updateLoginStatus() {
  const loginLink = document.querySelector(".log-sign");

  // Check if the user is authenticated
  fetch("/api/user")
    .then((response) => response.json())
    .then((data) => {
      if (data.user) {
        // User is authenticated, show logout button
        loginLink.textContent = "Logout";
        loginLink.href = "/logout"; // Update the href as needed
      } else {
        // User is not authenticated, show login button
        loginLink.textContent = "Login";
        loginLink.href = "login.html";
      }
    })
    .catch((error) => {
      console.error("Error checking authentication status:", error);
    });
}

// Function to handle logout
function handleLogout() {
  localStorage.removeItem("user");
  localStorage.removeItem("cart"); // Clear cart data
  window.location.href = "/";
}

// Add event listeners
document.getElementById("logout-link").addEventListener("click", handleLogout);
window.addEventListener("storage", updateCartIcon);

// Check the current page and perform actions accordingly
if (window.location.pathname.includes("cart.html")) {
  renderCartItems();
  calculateCartTotal();
  updateCartIcon();
} else if (window.location.pathname.includes("success.html")) {
  clearCart();
} else if (window.location.pathname.includes("product-details.html")) {
  updateCartIcon();
  renderCartItems();
} else {
  fetchProducts();
  updateCartIcon();
}
