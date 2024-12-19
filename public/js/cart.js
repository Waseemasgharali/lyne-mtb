const payBtn = document.querySelector(".checkout-btn");

payBtn.addEventListener("click", () => {
  // Check if the user is logged in
  fetch("/api/user")
    .then((response) => response.json())
    .then((data) => {
      if (data.user) {
        // User is logged in, proceed with checkout
        initiateCheckout();
      } else {
        // User is not logged in, redirect to login page
        window.location.href = "login.html";
      }
    })
    .catch((error) =>
      console.error("Error checking user authentication:", error)
    );
});

// In public/js/cart.js, modify the initiateCheckout function
function initiateCheckout() {
  // First check inventory for all items
  const inventoryChecks = cart.map((item) =>
    fetch(`/api/products/${item.id}`).then((res) => res.json())
  );

  Promise.all(inventoryChecks).then((products) => {
    // Check if any item exceeds available inventory
    const invalidItems = cart.filter((item, index) => {
      const product = products[index];
      return item.quantity > product.inventory;
    });

    if (invalidItems.length > 0) {
      alert(
        "Some items in your cart are no longer available in the requested quantity. Please update your cart."
      );
      return;
    }

    // If all items are available, proceed with checkout
    fetch("/stripe-checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: cart,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.url) {
          // Update inventory for each item
          cart.forEach((item) => {
            fetch("/api/products/update-inventory", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                productId: item.id,
                quantity: item.quantity,
              }),
            });
          });
          window.location.href = data.url;
        }
      })
      .catch((err) => console.error(err));
  });
}
