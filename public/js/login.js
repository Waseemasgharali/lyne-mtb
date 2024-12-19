const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  // Send a POST request to the /login endpoint
  fetch("/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  })
    .then((response) => response.json())
    .then((data) => {
      // Check if the login was successful
      if (data.message) {
        // Display a success message to the user
        alert("Login successful!");

        // Call the updateLoginStatus function to update the UI
        updateLoginStatus();

        // Redirect the user to a different page or perform other actions as needed
        window.location.href = "/";
      } else {
        // Display an error message to the user
        alert("Login failed. Please check your credentials and try again.");
      }
    })
    .catch((error) => {
      console.error("Error during login:", error);
      alert("An error occurred. Please try again later.");
    });
});
