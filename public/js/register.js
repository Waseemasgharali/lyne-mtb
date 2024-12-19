const registerForm = document.getElementById("registerForm");

registerForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const username = document.getElementById("username").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  // Send a POST request to the /register endpoint
  fetch("/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, email, password }),
  })
    .then((response) => response.json())
    .then((data) => {
      // Check if the registration was successful
      if (data.message) {
        // Display a success message to the user
        alert(`Registration successful!`);
        // Optionally, you can redirect the user to a different page after successful registration
        window.location.href = "/login.html";
      } else {
        // Display an error message to the user
        alert("Registration failed. Username or email already exists");
      }
    })
    .catch((error) => {
      console.error("Error during registration:", error);
      alert("An error occurred. Please try again later.");
    });
});
