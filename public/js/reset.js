// Function to handle form submission for password reset
async function handleReset(event) {
  event.preventDefault();

  // Get the form data
  const formData = new FormData(event.target);

  // Create an object to store the form values
  const resetData = {
    username: formData.get("username"),
    email: formData.get("email"),
  };

  try {
    // Send a POST request to the server to initiate password reset
    const response = await fetch("/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resetData),
    });

    // Check if the request was successful
    if (response.ok) {
      // Reset the form and display a success message
      event.target.reset();
      alert(" A Temporary reset link sent to your email");
    } else {
      // Display an error message if the request was not successful
      const data = await response.json();
      alert(data.error);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("An error occurred. Please try again later.");
  }
}

// Add event listener to the form for password reset
document.getElementById("resetForm").addEventListener("submit", handleReset);
