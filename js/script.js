/* Constants */
const CART_KEY = 'museumCartV1';
const TAX_RATE = 0.102;
const MEMBER_DISCOUNT_RATE = 0.15;
const SHIPPING_RATE = 25.00;
const VOLUME_TIERS = [
  [0.00, 49.99, 0.00],
  [50.00, 99.99, 0.05],
  [100.00, 199.99, 0.10],
  [200.00, 9999999.99, 0.15]
];

/* Variables */
let cart = [];
let id, name, unitPrice, image;
let idx, line, itemTotal, volDisc, memDisc, taxable, taxAmt, invoice;
let tbody, summaryDiv, emptyMsg, cartTable, memberToggle;
let grid, card, badge;
let mt, clearBtn;

// Local storage
function readCart() {
  try { 
    return JSON.parse(localStorage.getItem(CART_KEY)) || []; 
  } catch { 
    return []; 
  }
}

function writeCart(cartData) {
  localStorage.setItem(CART_KEY, JSON.stringify(cartData));
}

// Number formatting
function money(n) {
  const s = '$' + Math.abs(n).toFixed(2);
  return n < 0 ? '(' + s + ')' : s;
}

// Discount rate
function volumeRate(total) {
  for (const [min, max, rate] of VOLUME_TIERS) {
    if (total >= min && total <= max) return rate;
  }
  return 0;
}

// Add items to cart
function addToCartFromButton(btn) {
  id = btn.dataset.id;
  name = btn.dataset.name;
  unitPrice = Number(btn.dataset.price);
  image = btn.dataset.image;

  if (!id || !name || !unitPrice || !image) {
    console.warn('Missing data-* on buy button', btn);
    return;
  }

  cart = readCart();
  idx = cart.findIndex(it => it.id === id);
  if (idx >= 0) {
    cart[idx].qty += 1;
  } else {
    cart.push({ id, name, unitPrice, qty: 1, image });
  }
  writeCart(cart);

  // Update badge
  card = btn.closest('.souvenir-item, .product-card');
  if (card) {
    badge = card.querySelector('.qty-badge');
    if (badge) {
      const item = cart.find(it => it.id === id);
      badge.textContent = item ? `Qty: ${item.qty}` : '';
    }
  }
}

// Initialize the shop page
function initShop() {
  grid = document.querySelector('.shop-grid');
  if (!grid) return;

  document.querySelectorAll('.buy-btn').forEach(btn => {
    btn.addEventListener('click', () => addToCartFromButton(btn));
  });

  cart = readCart();
  document.querySelectorAll('.souvenir-item, .product-card').forEach(card => {
    const itemId = card.dataset.id;
    badge = card.querySelector('.qty-badge');
    const found = cart.find(it => it.id === itemId);
    if (badge) badge.textContent = found ? `Qty: ${found.qty}` : '';
  });
}

// Remove single item
function removeItem(removeId) {
  const next = readCart().filter(it => it.id !== removeId);
  writeCart(next);
  render();
}

// Clear the entire cart
function clearCart() {
  writeCart([]);
  mt = document.getElementById('memberToggle');
  if (mt) mt.checked = false;
  render();
}

// Render the cart page
function render() {
  tbody = document.getElementById('cartBody');
  summaryDiv = document.getElementById('summary');
  emptyMsg = document.getElementById('emptyMsg');
  cartTable = document.getElementById('cartTable');
  memberToggle = document.getElementById('memberToggle');

  if (!tbody || !summaryDiv || !emptyMsg || !cartTable) return;

  cart = readCart().filter(it => it && typeof it === 'object' && it.id && it.unitPrice > 0 && it.qty > 0);

  if (cart.length === 0) {
    emptyMsg.hidden = false;
    cartTable.hidden = true;
    summaryDiv.hidden = true;
    return;
  }

  emptyMsg.hidden = true;
  cartTable.hidden = false;
  summaryDiv.hidden = false;

  tbody.innerHTML = '';
  itemTotal = 0;

  for (const it of cart) {
    line = it.unitPrice * it.qty;
    itemTotal += line;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><img src="${it.image}" alt="${it.name}" class="thumb"> ${it.name}</td>
      <td>${it.qty}</td>
      <td class="amount">${money(it.unitPrice)}</td>
      <td class="amount">${money(line)}</td>
      <td><button class="remove-btn" aria-label="Remove ${it.name}">Remove</button></td>
    `;
    tr.querySelector('.remove-btn').addEventListener('click', () => removeItem(it.id));
    tbody.appendChild(tr);
  }

  const isMember = !!(memberToggle && memberToggle.checked);
  const volR = volumeRate(itemTotal);
  volDisc = itemTotal * volR;
  memDisc = 0;

  if (isMember && volR > 0) {
    const choice = prompt("Only one discount may be applied.\nType 'M' for Member or 'V' for Volume:");
    if (choice && choice.toUpperCase() === 'M') {
      memDisc = itemTotal * MEMBER_DISCOUNT_RATE;
      volDisc = 0;
    } else {
      memDisc = 0;
    }
  } else if (isMember) {
    memDisc = itemTotal * MEMBER_DISCOUNT_RATE;
    volDisc = 0;
  }

  taxable = itemTotal - volDisc - memDisc + SHIPPING_RATE;
  taxAmt = taxable * TAX_RATE;
  invoice = taxable + taxAmt;

  summaryDiv.innerHTML = `
    <table class="summary-table">
      <tr><td>Subtotal of Items</td><td class="amount">${money(itemTotal)}</td></tr>
      <tr><td>Volume Discount</td><td class="amount">${money(-volDisc)}</td></tr>
      <tr><td>Member Discount</td><td class="amount">${money(-memDisc)}</td></tr>
      <tr><td>Shipping</td><td class="amount">${money(SHIPPING_RATE)}</td></tr>
      <tr><td><strong>Subtotal (Taxable)</strong></td><td class="amount"><strong>${money(taxable)}</strong></td></tr>
      <tr><td>Tax Rate</td><td class="amount">${(TAX_RATE*100).toFixed(1)}%</td></tr>
      <tr><td>Tax Amount</td><td class="amount">${money(taxAmt)}</td></tr>
      <tr><td><strong>Invoice Total</strong></td><td class="amount"><strong>${money(invoice)}</strong></td></tr>
    </table>
  `;
}

/* Initialize on Page Load */
document.addEventListener('DOMContentLoaded', () => {
  initShop();
  if (document.getElementById('cartBody')) {
    mt = document.getElementById('memberToggle');
    clearBtn = document.getElementById('clearBtn');
    if (mt) mt.addEventListener('change', render);
    if (clearBtn) clearBtn.addEventListener('click', clearCart);
    render();
  }
});
