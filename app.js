const SUPABASE_URL = "https://emtgjwrfxsxainwmsgkr.supabase.co/rest/v1/";
const SUPABASE_KEY = "sb_publishable_lEgj73XsD3_MG9DdDETZXg_Rjjjoy-2";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


// =========================
// AUTH
// =========================

async function signIn() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const message = document.getElementById("authMessage");

  const { error } = await db.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    message.textContent = error.message;
    return;
  }

  message.textContent = "Signed in successfully.";

  await updateUserUI();
  closeAuth();
}


async function createAccount() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const message = document.getElementById("authMessage");

  const { error } = await db.auth.signUp({
    email,
    password
  });

  if (error) {
    message.textContent = error.message;
    return;
  }

  message.textContent =
    "Account created! Check your email to verify your account.";
}


async function signOut() {
  await db.auth.signOut();
  await updateUserUI();
}


async function updateUserUI() {
  const {
    data: { user }
  } = await db.auth.getUser();

  const accountButton =
    document.getElementById("accountButton");

  if (!accountButton) return;

  if (user) {
    accountButton.textContent = "Account";
  } else {
    accountButton.textContent = "Sign In";
  }
}


// =========================
// AUTH MODAL
// =========================

function openAuth() {
  const modal = document.getElementById("authModal");

  if (modal) {
    modal.classList.add("active");
  }
}


function closeAuth() {
  const modal = document.getElementById("authModal");

  if (modal) {
    modal.classList.remove("active");
  }
}


// =========================
// LISTING MODAL
// =========================

function openListing() {
  const modal =
    document.getElementById("listingModal");

  if (modal) {
    modal.classList.add("active");
  }
}


function closeListing() {
  const modal =
    document.getElementById("listingModal");

  if (modal) {
    modal.classList.remove("active");
  }
}


// =========================
// MARKETPLACE
// =========================

async function loadMarketplace() {
  const container =
    document.getElementById("marketplace");

  if (!container) return;

  const {
    data,
    error
  } = await db
    .from("listings")
    .select("*")
    .eq("status", "active")
    .order("created_at", {
      ascending: false
    });

  if (error) {
    console.error(error);
    return;
  }

  container.innerHTML = "";

  if (!data || data.length === 0) {
    container.innerHTML =
      "<p>No listings yet.</p>";
    return;
  }

  data.forEach(listing => {

    const card =
      document.createElement("div");

    card.className = "listing-card";

    card.innerHTML = `
      <div class="listing-image">
        <span>📦</span>
      </div>

      <div class="listing-info">
        <h3>${escapeHTML(listing.title || "Item")}</h3>

        <p class="listing-condition">
          ${escapeHTML(listing.condition || "")}
        </p>

        <strong>
          $${Number(listing.price || 0).toFixed(2)}
        </strong>
      </div>
    `;

    container.appendChild(card);
  });
}


// =========================
// CREATE LISTING
// =========================

async function createListing() {

  const message =
    document.getElementById("listingMessage");

  const title =
    document.getElementById("listingTitle")
      ?.value.trim();

  const category =
    document.getElementById("listingCategory")
      ?.value;

  const condition =
    document.getElementById("listingCondition")
      ?.value;

  const price =
    Number(
      document.getElementById("listingPrice")
        ?.value
    );

  const description =
    document.getElementById("listingDescription")
      ?.value.trim();


  if (!title || !price) {
    if (message) {
      message.textContent =
        "Please enter an item name and price.";
    }

    return;
  }


  const {
    data: { user }
  } = await db.auth.getUser();


  if (!user) {
    if (message) {
      message.textContent =
        "Please sign in before creating a listing.";
    }

    return;
  }


  if (message) {
    message.textContent =
      "Creating your listing...";
  }


  // Find category
  let categoryId = null;

  if (category) {

    const {
      data: categoryData,
      error: categoryError
    } = await db
      .from("categories")
      .select("id")
      .eq("name", category)
      .maybeSingle();


    if (categoryError) {
      console.error(categoryError);
    } else if (categoryData) {
      categoryId = categoryData.id;
    }
  }


  // Create item
  const {
    data: item,
    error: itemError
  } = await db
    .from("items")
    .insert({
      category_id: categoryId,
      name: title,
      description: description,
      created_by: user.id
    })
    .select()
    .single();


  if (itemError) {
    console.error(itemError);

    if (message) {
      message.textContent =
        itemError.message;
    }

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

    if (message) {
      message.textContent =
        listingError.message;
    }

    return;
  }


  // Save initial price history
  const {
    error: priceError
  } = await db
    .from("price_history")
    .insert({
      item_id: item.id,
      price: price,
      source: "tradivo"
    });


  if (priceError) {
    console.warn(
      "Price history could not be saved:",
      priceError
    );
  }


  if (message) {
    message.textContent =
      "Your listing is live on Tradivo!";
  }


  // Clear form
  const titleInput =
    document.getElementById("listingTitle");

  const priceInput =
    document.getElementById("listingPrice");

  const descriptionInput =
    document.getElementById("listingDescription");


  if (titleInput) {
    titleInput.value = "";
  }

  if (priceInput) {
    priceInput.value = "";
  }

  if (descriptionInput) {
    descriptionInput.value = "";
  }


  await loadMarketplace();


  setTimeout(() => {
    closeListing();
  }, 1000);
}


// =========================
// HELPERS
// =========================

function escapeHTML(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// =========================
// STARTUP
// =========================

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    await updateUserUI();

    await loadMarketplace();
  }
);
