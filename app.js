// ==========================================
// TRADIVO — APP.JS
// ==========================================

// Supabase connection
const SUPABASE_URL = "https://emtgjwrfxsainwmsgkr.supabase.co";
const SUPABASE_KEY = "sb_publishable_IEgj73XsD3_MG9DdDETZXg_Rjjjoy-2";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


// ==========================================
// APP STATE
// ==========================================

let allListings = [];
let selectedCategory = "all";


// ==========================================
// START APP
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {
  await loadMarketplace();
  await loadMarketStats();
  await loadRecentSales();

  const {
    data: { session }
  } = await db.auth.getSession();

  updateAuthButton(session);

  db.auth.onAuthStateChange((_event, session) => {
    updateAuthButton(session);
  });
});


// ==========================================
// AUTHENTICATION
// ==========================================

function openAuth() {
  document.getElementById("authModal").classList.add("open");
}

function closeAuth() {
  document.getElementById("authModal").classList.remove("open");
}

async function signUp() {
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;

  const message = document.getElementById("authMessage");

  if (!email || !password) {
    message.textContent = "Enter your email and password.";
    return;
  }

  if (password.length < 6) {
    message.textContent = "Password must be at least 6 characters.";
    return;
  }

  message.textContent = "Creating your account...";

  const { error } = await db.auth.signUp({
    email,
    password
  });

  if (error) {
    message.textContent = error.message;
    return;
  }

  message.textContent =
    "Account created. Check your email if confirmation is required.";
}

async function signIn() {
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;

  const message = document.getElementById("authMessage");

  if (!email || !password) {
    message.textContent = "Enter your email and password.";
    return;
  }

  message.textContent = "Signing in...";

  const { error } = await db.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    message.textContent = error.message;
    return;
  }

  message.textContent = "You're signed in.";

  setTimeout(() => {
    closeAuth();
  }, 700);
}

async function signOut() {
  await db.auth.signOut();
  location.reload();
}

function updateAuthButton(session) {
  const buttons = document.querySelectorAll(".nav-actions .btn");

  if (!buttons.length) return;

  const signInButton = buttons[0];

  if (session) {
    signInButton.textContent = "Sign out";
    signInButton.onclick = signOut;
  } else {
    signInButton.textContent = "Sign in";
    signInButton.onclick = openAuth;
  }
}


// ==========================================
// MARKETPLACE
// ==========================================

async function loadMarketplace() {
  const grid = document.getElementById("listingGrid");

  grid.innerHTML = `
    <div class="loading">
      Loading Tradivo marketplace...
    </div>
  `;

  const { data, error } = await db
    .from("listings")
    .select(`
      id,
      title,
      description,
      condition,
      price,
      status,
      created_at,
      seller_id,
      item_id,
      items (
        name,
        brand,
        model,
        categories (
          name
        )
      ),
      profiles (
        username,
        display_name
      ),
      listing_images (
        image_url,
        sort_order
      )
    `)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);

    grid.innerHTML = `
      <div class="empty">
        Unable to load listings right now.
      </div>
    `;

    return;
  }

  allListings = data || [];

  renderListings(allListings);
}

function renderListings(listings) {
  const grid = document.getElementById("listingGrid");

  if (!listings.length) {
    grid.innerHTML = `
      <div class="empty">
        No listings found yet.
        <br><br>
        Be one of the first people to list something on Tradivo.
      </div>
    `;

    return;
  }

  grid.innerHTML = listings.map(listing => {

    const category =
      listing.items?.categories?.name || "Other";

    const seller =
      listing.profiles?.display_name ||
      listing.profiles?.username ||
      "Tradivo seller";

    const image =
      listing.listing_images?.sort(
        (a, b) => a.sort_order - b.sort_order
      )[0]?.image_url;

    const emoji = getCategoryEmoji(category);

    return `
      <article class="listing-card">

        <div class="listing-image"
             ${image ? `style="background-image:url('${escapeAttribute(image)}'); background-size:cover; background-position:center;"` : ""}>
          ${image ? "" : emoji}
        </div>

        <div class="listing-content">

          <div class="listing-category">
            ${escapeHtml(category)}
          </div>

          <h3>
            ${escapeHtml(listing.title)}
          </h3>

          <div class="listing-condition">
            ${escapeHtml(listing.condition)}
          </div>

          <div class="listing-bottom">

            <div>
              <div class="listing-price">
                $${Number(listing.price).toFixed(2)}
              </div>

              <div class="listing-seller">
                @${escapeHtml(seller)}
              </div>
            </div>

            <button
              class="btn btn-outline"
              onclick="viewListing('${listing.id}')">
              View
            </button>

          </div>

        </div>

      </article>
    `;
  }).join("");
}


// ==========================================
// SEARCH
// ==========================================

function searchListings() {
  const query =
    document.getElementById("searchInput")
      .value
      .trim()
      .toLowerCase();

  let results = allListings;

  if (selectedCategory !== "all") {
    results = results.filter(listing => {
      return (
        listing.items?.categories?.name ===
        selectedCategory
      );
    });
  }

  if (query) {
    results = results.filter(listing => {

      const title =
        listing.title?.toLowerCase() || "";

      const description =
        listing.description?.toLowerCase() || "";

      const item =
        listing.items?.name?.toLowerCase() || "";

      const brand =
        listing.items?.brand?.toLowerCase() || "";

      return (
        title.includes(query) ||
        description.includes(query) ||
        item.includes(query) ||
        brand.includes(query)
      );
    });
  }

  renderListings(results);
}

function filterCategory(category, button) {
  selectedCategory = category;

  document
    .querySelectorAll(".category")
    .forEach(item => item.classList.remove("active"));

  button.classList.add("active");

  searchListings();
}


// ==========================================
// CREATE LISTING
// ==========================================

function openListing() {
  document.getElementById("listingModal").classList.add("open");
}

function closeListing() {
  document.getElementById("listingModal").classList.remove("open");
}

async function createListing() {

  const message =
    document.getElementById("listingMessage");

  const title =
    document.getElementById("listingTitle")
      .value
      .trim();

  const category =
    document.getElementById("listingCategory")
      .value;

  const condition =
    document.getElementById("listingCondition")
      .value;

  const price =
    Number(
      document.getElementById("listingPrice").value
    );

  const description =
    document.getElementById("listingDescription")
      .value
      .trim();


  if (!title || !price) {
    message.textContent =
      "Please enter an item name and price.";

    return;
  }


  const {
    data: { user }
  } = await db.auth.getUser();


  if (!user) {
    message.textContent =
      "Please sign in before creating a listing.";

    return;
  }


  message.textContent =
    "Creating your listing...";


  // Find category
  const {
    data: categoryData,
    error: categoryError
  } = await db
    .from("categories")
    .select("id")
    .eq("name", category)
    .single();


  if (categoryError) {
    console.error(categoryError);

    message.textContent =
      "Could not find that category.";

    return;
  }


  // Create item
  const {
    data: item,
    error: itemError
  } = await db
    .from("items")
    .insert({
      category_id: categoryData.id,
      name: title,
      description: description,
      created_by: user.id
    })
    .select()
    .single();


  if (itemError) {
    console.error(itemError);

    message.textContent =
      itemError.message;

    return;
  }


  // Create listing
  const {
    data: listing,
    error: listingError
  } = await db
    .from("listings")
    .insert({
      item_id: item.id,
      seller_id: user.id,
      title: title,
      description: description,
      condition: condition,
      price: price,
      status: "active"
    })
    .select()
    .single();


  if (listingError) {
    console.error(listingError);

    message.textContent =
      listingError.message;

    return;
  }


  // Add initial price to Tradivo price history
  await db
    .from("price_history")
    .insert({
      item_id: item.id,
      price: price,
      source: "tradivia"
    });


  message.textContent =
    "Your listing is live on Tradivo!";


  document.getElementById("listingTitle").value = "";
  document.getElementById("listingPrice").value = "";
  document.getElementById("listingDescription").value = "";


  await loadMarketplace();
  await loadMarketStats();


  setTimeout(() => {
    closeListing();
  }, 1000);
}


// ==========================================
// MARKET STATISTICS
// ==========================================

async function loadMarketStats() {

  const { count: activeCount } =
    await db
      .from("listings")
      .select("*", {
        count: "exact",
        head: true
      })
      .eq("status", "active");


  const { count: salesCount } =
    await db
      .from("sales")
      .select("*", {
        count: "exact",
        head: true
      });


  document.getElementById("activeCount")
    .textContent = activeCount || 0;

  document.getElementById("salesCount")
    .textContent = salesCount || 0;
}


// ==========================================
// SALES HISTORY
// ==========================================

async function loadRecentSales() {

  const container =
    document.getElementById("recentSales");


  const { data, error } =
    await db
      .from("sales")
      .select(`
        sold_price,
        sold_at,
        items (
          name
        )
      `)
      .order("sold_at", {
        ascending: false
      })
      .limit(6);


  if (error) {
    console.error(error);

    container.innerHTML = `
      <div class="empty">
        Unable to load sales history.
      </div>
    `;

    return;
  }


  if (!data?.length) {

    container.innerHTML = `
      <div class="empty">
        Tradivo's sales history will grow as users complete sales.
      </div>
    `;

    return;
  }


  container.innerHTML =
    data.map(sale => {

      return `
        <div class="sale-row">

          <div>
            <strong>
              ${escapeHtml(
                sale.items?.name ||
                "Tradivo item"
              )}
            </strong>

            <small>
              ${formatDate(sale.sold_at)}
            </small>
          </div>

          <div class="sale-price">
            $${Number(sale.sold_price).toFixed(2)}
          </div>

        </div>
      `;

    }).join("");
}


// ==========================================
// VIEW LISTING
// ==========================================

function viewListing(id) {

  const listing =
    allListings.find(item => item.id === id);

  if (!listing) return;


  const seller =
    listing.profiles?.display_name ||
    listing.profiles?.username ||
    "Tradivo seller";


  alert(
    `${listing.title}\n\n` +
    `Price: $${Number(listing.price).toFixed(2)}\n` +
    `Condition: ${listing.condition}\n` +
    `Seller: ${seller}\n\n` +
    `${listing.description || "No description provided."}`
  );
}


// ==========================================
// HELPERS
// ==========================================

function getCategoryEmoji(category) {

  const emojis = {
    "Shoes": "👟",
    "Trading Cards": "🃏",
    "Clothing": "👕",
    "Comics": "📕",
    "Electronics": "🎮",
    "Collectibles": "⭐",
    "Other": "📦"
  };

  return emojis[category] || "📦";
}


function formatDate(date) {

  return new Date(date).toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
      year: "numeric"
    }
  );
}


function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function escapeAttribute(value) {
  return escapeHtml(value);
}


function scrollToMarketplace() {

  document
    .getElementById("marketplace")
    .scrollIntoView({
      behavior: "smooth"
    });
}


// ==========================================
// CLOSE MODALS WHEN CLICKING OUTSIDE
// ==========================================

document.addEventListener("click", event => {

  if (
    event.target.classList.contains("modal")
  ) {
    event.target.classList.remove("open");
  }

});
