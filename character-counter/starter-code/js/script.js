const toggleBtn = document.getElementById("themeToggle");
const logo = document.getElementById("logo");
const root = document.documentElement;

toggleBtn.addEventListener("click", () => {
  // Check current theme
  const currentTheme = root.getAttribute("data-theme");

  if (currentTheme === "light-theme") {
    // Switch to dark theme
    root.setAttribute("data-theme", "dark-theme");
    logo.src = "./assets/images/logo-dark-theme.svg";
    toggleBtn.src = "./assets/images/icon-sun.svg";
  } else {
    // Switch to light theme
    root.setAttribute("data-theme", "light-theme");
    logo.src = "./assets/images/logo-light-theme.svg";
    toggleBtn.src = "./assets/images/icon-moon.svg";
  }
});
