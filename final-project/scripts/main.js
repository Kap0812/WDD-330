// Smart Meal Planner – with Spoonacular API Integration

document.addEventListener("DOMContentLoaded", () => {
  const recipeResults = document.getElementById("recipeResults");
  const searchInput = document.getElementById("searchInput");
  const dietFilter = document.getElementById("dietFilter");

  const API_KEY = "e88cafb2750b4bd5adbd58a53d8a0f48";

  async function fetchRecipes(query = "", diet = "") {
    const url = `https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(query)}&diet=${encodeURIComponent(diet)}&number=12&addRecipeInformation=true&apiKey=${API_KEY}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      const recipes = data.results.map(recipe => ({
        id: recipe.id,
        title: recipe.title,
        image: recipe.image,
      }));

      renderRecipes(recipes);
    } catch (error) {
      console.error("Error fetching recipes:", error);
      recipeResults.innerHTML = "<p>Error loading recipes. Try again later.</p>";
    }
  }

  function renderRecipes(recipes) {
    recipeResults.innerHTML = "";
    recipes.forEach(recipe => {
      const card = document.createElement("div");
      card.className = "recipe-card";
      card.innerHTML = `
        <img src="${recipe.image}" alt="${recipe.title}">
        <div class="info">
          <h4>${recipe.title}</h4>
          <button onclick="addToPlanner('${recipe.title}')">Add to Planner</button>
          <button class="view-nutrients-btn" data-title="${recipe.title}">View Nutrients</button>
          <div class="nutrients-output" style="margin-top: 8px;"></div>
        </div>
      `;
      recipeResults.appendChild(card);
    });

    const nutrientButtons = document.querySelectorAll(".view-nutrients-btn");
    nutrientButtons.forEach(button => {
      button.addEventListener("click", async () => {
        const title = button.getAttribute("data-title");
        const output = button.parentElement.querySelector(".nutrients-output");
        output.innerHTML = "Loading...";

        const nutrients = await getNutritionData(title);

        if (nutrients.length === 0) {
          output.innerHTML = "<em>No data found.</em>";
          return;
        }

        output.innerHTML = `
          <ul class="nutrients-list">
            ${nutrients.map(n => `<li>${n.name}: ${n.amount} ${n.unit}</li>`).join("")}
          </ul>
        `;
      });
    });
  }

  function filterRecipes() {
    const keyword = searchInput.value.trim();
    const diet = dietFilter.value === "all" ? "" : dietFilter.value;
    fetchRecipes(keyword, diet);
  }

  window.addToPlanner = function (mealTitle) {
    const days = document.querySelectorAll(".mealList");
    const randomDay = days[Math.floor(Math.random() * days.length)];
    const li = document.createElement("li");
    li.textContent = mealTitle;
    randomDay.appendChild(li);
    updateGroceryList();
    savePlanner(); // Save to localStorage
  };

  function updateGroceryList() {
    const groceryItems = document.getElementById("groceryItems");
    groceryItems.innerHTML = "";
    const allMeals = document.querySelectorAll(".mealList li");
    const ingredientsSet = new Set();

    allMeals.forEach(meal => {
      ingredientsSet.add(meal.textContent + " - Sample Ingredient");
    });

    ingredientsSet.forEach(item => {
      const li = document.createElement("li");
      li.textContent = item;
      groceryItems.appendChild(li);
    });
  }

  function savePlanner() {
    const planner = [];
    document.querySelectorAll(".mealList").forEach(day => {
      const meals = Array.from(day.querySelectorAll("li")).map(li => li.textContent);
      planner.push(meals);
    });
    localStorage.setItem("weeklyPlanner", JSON.stringify(planner));
  }

  function loadPlanner() {
    const plannerData = JSON.parse(localStorage.getItem("weeklyPlanner"));
    if (!plannerData) return;

    const days = document.querySelectorAll(".mealList");
    plannerData.forEach((meals, index) => {
      meals.forEach(meal => {
        const li = document.createElement("li");
        li.textContent = meal;
        days[index].appendChild(li);
      });
    });

    updateGroceryList();
  }

  // Event listeners
  searchInput.addEventListener("input", filterRecipes);
  dietFilter.addEventListener("change", filterRecipes);

  // Load planner on page load
  loadPlanner();
  fetchRecipes();
});

// USDA API integration for nutrient data
async function getNutritionData(query) {
  const USDA_API_KEY = "rlVghhwe3ZO3aTMQZiKxOKWzGQkkHYRynnyXdWES";

  const searchUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&api_key=${USDA_API_KEY}`;

  try {
    const response = await fetch(searchUrl);
    const data = await response.json();

    if (!data.foods || data.foods.length === 0) {
      throw new Error("No results found");
    }

    const foodId = data.foods[0].fdcId;
    const detailUrl = `https://api.nal.usda.gov/fdc/v1/food/${foodId}?api_key=${USDA_API_KEY}`;
    const detailRes = await fetch(detailUrl);
    const foodDetail = await detailRes.json();

    const importantNutrients = ["Protein", "Fiber", "Vitamin C", "Calcium", "Iron", "Vitamin D"];

    const nutrients = foodDetail.foodNutrients
      .filter(n => importantNutrients.includes(n.nutrientName))
      .map(n => ({
        name: n.nutrientName,
        amount: n.value,
        unit: n.unitName,
      }));

    return nutrients;
  } catch (err) {
    console.error("Nutrition fetch failed:", err);
    return [];
  }
}
