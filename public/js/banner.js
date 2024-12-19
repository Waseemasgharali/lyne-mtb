// Fetch and display banners
function fetchBanners() {
  fetch("/api/banner")
    .then((response) => response.json())
    .then((banners) => {
      const bannerList = document.getElementById("banner-list");
      bannerList.innerHTML = banners
        .map(
          (banner) => `
                <div class="banner-item">
                    <img src="${banner.image_url}" alt="Banner">
                    <button class="banner-delete" onclick="deleteBanner(${banner.id})">Delete</button>
                </div>
            `
        )
        .join("");
    })
    .catch((error) => console.error("Error fetching banners:", error));
}

// Handle banner upload
document.getElementById("bannerForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const formData = new FormData(this);

  fetch("/api/banner", {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      fetchBanners();
      this.reset();
    })
    .catch((error) => console.error("Error:", error));
});

// Delete banner
function deleteBanner(id) {
  if (confirm("Are you sure you want to delete this banner?")) {
    fetch(`/api/banner/${id}`, {
      method: "DELETE",
    })
      .then((response) => response.json())
      .then((data) => {
        fetchBanners();
      })
      .catch((error) => console.error("Error:", error));
  }
}

// Initialize banners on page load
document.addEventListener("DOMContentLoaded", fetchBanners);
