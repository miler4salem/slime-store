import {
  STATIONS,
  CONTAINER_TYPES,
  SLIME_COLORS,
  MIXINS,
  NAME_ADJECTIVES,
  NAME_NOUNS,
} from './constants.js';
import {
  gameState,
  setGender,
  toggleShopOpen,
  craftSlime,
  placeSlimeOnStand,
  updateShelfItemPrice,
  removeSlimeFromStand,
  calculateSlimeEconomics,
  getNetProfit,
  getPriceEvaluation,
  formatMoney,
  resetSession,
} from './state.js';
import { drawSlimeItem, createSlimeThumbCanvas } from './slimeRenderer.js';
import { drawShopkeeperPreview } from './worldRenderer.js';

// Draft state for the Slime Creator UI
const creatorDraft = {
  containerType: 'jar',
  primaryColor: SLIME_COLORS[0].hex,
  secondaryColor: SLIME_COLORS[1].hex,
  mixRatio: 35,
  mixins: ['glitter'],
  seed: 777,
};

const els = {};

export function initUI() {
  // Cache DOM references
  els.hudCash = document.getElementById('hud-cash');
  els.hudProfit = document.getElementById('hud-profit');
  els.hudTray = document.getElementById('hud-tray');
  els.btnOpenCreator = document.getElementById('btn-open-creator');
  els.btnOpenAccounting = document.getElementById('btn-open-accounting');
  els.btnToggleShop = document.getElementById('btn-toggle-shop');
  els.btnChangeChar = document.getElementById('btn-change-character');
  els.interactHint = document.getElementById('interact-hint');
  els.toastContainer = document.getElementById('toast-container');

  // Modals
  els.modalChar = document.getElementById('modal-character');
  els.modalCreator = document.getElementById('modal-creator');
  els.modalStand = document.getElementById('modal-stand');
  els.modalAccounting = document.getElementById('modal-accounting');

  // Character previews
  els.previewFemale = document.getElementById('preview-female');
  els.previewMale = document.getElementById('preview-male');

  // Creator elements
  els.slimePreviewCanvas = document.getElementById('slime-preview-canvas');
  els.slimeNameInput = document.getElementById('slime-name-input');
  els.btnRandomName = document.getElementById('btn-random-name');
  els.creatorCost = document.getElementById('creator-cost');
  els.creatorSuggested = document.getElementById('creator-suggested');
  els.btnCraftSlime = document.getElementById('btn-craft-slime');
  els.containerOptions = document.getElementById('container-options');
  els.primarySwatches = document.getElementById('primary-swatches');
  els.secondarySwatches = document.getElementById('secondary-swatches');
  els.primaryCustom = document.getElementById('primary-custom-color');
  els.secondaryCustom = document.getElementById('secondary-custom-color');
  els.mixRatioSlider = document.getElementById('color-mix-ratio');
  els.mixRatioLabel = document.getElementById('mix-ratio-label');
  els.mixinOptions = document.getElementById('mixin-options');

  // Stand modal elements
  els.standTitle = document.getElementById('stand-modal-title');
  els.standSubtitle = document.getElementById('stand-modal-subtitle');
  els.standSlotsList = document.getElementById('stand-slots-list');
  els.trayItemsList = document.getElementById('tray-items-list');
  els.btnQuickMix = document.getElementById('btn-quick-mix-from-stand');

  // Accounting elements
  els.accCash = document.getElementById('acc-cash');
  els.accRevenue = document.getElementById('acc-revenue');
  els.accExpenses = document.getElementById('acc-expenses');
  els.accProfit = document.getElementById('acc-profit');
  els.accCrafted = document.getElementById('acc-crafted');
  els.accSold = document.getElementById('acc-sold');
  els.ledgerTbody = document.getElementById('ledger-tbody');
  els.btnResetSession = document.getElementById('btn-reset-session');

  bindEvents();
  buildCreatorControls();
  generateRandomSlimeName();
  updateHUD();

  // Pose the Female/Male question if user hasn't picked in this session
  if (!gameState.persisted.gender) {
    openModal(els.modalChar);
  } else {
    closeModal(els.modalChar);
  }
}

function bindEvents() {
  // HUD buttons
  els.btnOpenCreator.addEventListener('click', () => openCreatorModal());
  els.btnOpenAccounting.addEventListener('click', () => openAccountingModal());
  els.btnChangeChar.addEventListener('click', () => openModal(els.modalChar));
  els.btnToggleShop.addEventListener('click', () => {
    const isOpen = toggleShopOpen();
    updateHUD();
    showToast(isOpen ? 'Shop is now OPEN for customers!' : 'Shop is now CLOSED.', isOpen ? 'success' : 'warn');
  });

  // Character selection
  document.getElementById('choose-female').addEventListener('click', () => {
    setGender('female');
    closeModal(els.modalChar);
    showToast('Welcome! Playing as Female Shopkeeper.', 'success');
  });
  document.getElementById('choose-male').addEventListener('click', () => {
    setGender('male');
    closeModal(els.modalChar);
    showToast('Welcome! Playing as Male Shopkeeper.', 'success');
  });

  // Close buttons & backdrop clicks
  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-close');
      closeModal(document.getElementById(targetId));
    });
  });

  [els.modalCreator, els.modalStand, els.modalAccounting].forEach((backdrop) => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal(backdrop);
    });
  });

  // Creator actions
  els.btnRandomName.addEventListener('click', generateRandomSlimeName);
  els.primaryCustom.addEventListener('input', (e) => {
    creatorDraft.primaryColor = e.target.value;
    syncSwatchHighlights();
  });
  els.secondaryCustom.addEventListener('input', (e) => {
    creatorDraft.secondaryColor = e.target.value;
    syncSwatchHighlights();
  });
  els.mixRatioSlider.addEventListener('input', (e) => {
    creatorDraft.mixRatio = Number(e.target.value);
    els.mixRatioLabel.textContent = `${creatorDraft.mixRatio}%`;
  });
  els.btnCraftSlime.addEventListener('click', handleCraftSlime);

  // Stand quick mix
  els.btnQuickMix.addEventListener('click', () => {
    closeModal(els.modalStand);
    openCreatorModal();
  });

  // Reset session
  els.btnResetSession.addEventListener('click', () => {
    if (confirm('Reset your session cash, shelves, and accounting ledger?')) {
      resetSession();
      closeModal(els.modalAccounting);
      updateHUD();
      openModal(els.modalChar);
      showToast('Session reset!', 'warn');
    }
  });
}

function buildCreatorControls() {
  // Container types
  els.containerOptions.innerHTML = '';
  for (const c of CONTAINER_TYPES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `choice-pill ${creatorDraft.containerType === c.id ? 'active' : ''}`;
    btn.dataset.containerId = c.id;
    btn.innerHTML = `
      <span class="pill-icon">${c.icon}</span>
      <span class="pill-title">${c.name}</span>
      <span class="pill-sub">${formatMoney(c.cost)} cost</span>
    `;
    btn.addEventListener('click', () => {
      creatorDraft.containerType = c.id;
      els.containerOptions.querySelectorAll('.choice-pill').forEach((el) => {
        el.classList.toggle('active', el.dataset.containerId === c.id);
      });
      updateCreatorSummary();
    });
    els.containerOptions.appendChild(btn);
  }

  // Primary & Secondary color swatches
  const renderSwatches = (containerEl, isPrimary) => {
    containerEl.innerHTML = '';
    for (const col of SLIME_COLORS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'swatch-btn';
      btn.style.background = col.hex;
      btn.title = col.name;
      btn.dataset.hex = col.hex;
      btn.addEventListener('click', () => {
        if (isPrimary) {
          creatorDraft.primaryColor = col.hex;
          els.primaryCustom.value = col.hex;
        } else {
          creatorDraft.secondaryColor = col.hex;
          els.secondaryCustom.value = col.hex;
        }
        syncSwatchHighlights();
      });
      containerEl.appendChild(btn);
    }
  };
  renderSwatches(els.primarySwatches, true);
  renderSwatches(els.secondarySwatches, false);
  syncSwatchHighlights();

  // Mix-ins
  els.mixinOptions.innerHTML = '';
  for (const m of MIXINS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `mixin-card ${creatorDraft.mixins.includes(m.id) ? 'active' : ''}`;
    btn.dataset.mixinId = m.id;
    btn.innerHTML = `
      <span class="mixin-emoji">${m.emoji}</span>
      <span class="mixin-name">${m.name}</span>
      <span class="mixin-cost">+${formatMoney(m.cost)}</span>
    `;
    btn.addEventListener('click', () => {
      const idx = creatorDraft.mixins.indexOf(m.id);
      if (idx >= 0) creatorDraft.mixins.splice(idx, 1);
      else creatorDraft.mixins.push(m.id);
      btn.classList.toggle('active', creatorDraft.mixins.includes(m.id));
      updateCreatorSummary();
    });
    els.mixinOptions.appendChild(btn);
  }

  updateCreatorSummary();
}

function syncSwatchHighlights() {
  els.primarySwatches.querySelectorAll('.swatch-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.hex.toLowerCase() === creatorDraft.primaryColor.toLowerCase());
  });
  els.secondarySwatches.querySelectorAll('.swatch-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.hex.toLowerCase() === creatorDraft.secondaryColor.toLowerCase());
  });
}

function generateRandomSlimeName() {
  const adj = NAME_ADJECTIVES[Math.floor(Math.random() * NAME_ADJECTIVES.length)];
  const noun = NAME_NOUNS[Math.floor(Math.random() * NAME_NOUNS.length)];
  els.slimeNameInput.value = `${adj} ${noun}`;
}

function updateCreatorSummary() {
  const { cost, suggestedPrice } = calculateSlimeEconomics(
    creatorDraft.containerType,
    creatorDraft.mixins
  );
  els.creatorCost.textContent = formatMoney(cost);
  els.creatorSuggested.textContent = formatMoney(suggestedPrice);
}

function handleCraftSlime() {
  const res = craftSlime({
    name: els.slimeNameInput.value,
    containerType: creatorDraft.containerType,
    primaryColor: creatorDraft.primaryColor,
    secondaryColor: creatorDraft.secondaryColor,
    mixRatio: creatorDraft.mixRatio,
    mixins: creatorDraft.mixins,
  });

  if (!res.ok) {
    showToast(res.reason, 'warn');
    return;
  }

  creatorDraft.seed = Math.floor(Math.random() * 99999);
  generateRandomSlimeName();
  updateHUD();
  showToast(`Crafted "${res.item.name}"! Click any stand to place it.`, 'success');
}

export function openCreatorModal() {
  updateCreatorSummary();
  openModal(els.modalCreator);
}

export function openStandModal(standId) {
  const station = STATIONS.find((s) => s.id === standId);
  if (!station) return;
  gameState.activeStandId = standId;
  els.standTitle.textContent = station.name;
  els.standSubtitle.textContent =
    station.placement === 'middle'
      ? 'Center Island Stand — Place slimes and adjust prices'
      : 'Wall Display Shelf — Place slimes and adjust prices';
  renderStandModalContent();
  openModal(els.modalStand);
}

export function refreshStandModalIfOpen() {
  if (!els.modalStand.classList.contains('hidden') && gameState.activeStandId) {
    renderStandModalContent();
  }
}

function renderStandModalContent() {
  const standId = gameState.activeStandId;
  const slots = gameState.persisted.shelves[standId] || [];

  // Render slots on this stand
  els.standSlotsList.innerHTML = '';
  slots.forEach((item, slotIndex) => {
    const card = document.createElement('div');
    card.className = `slot-card ${item ? 'occupied' : ''}`;

    if (!item) {
      card.innerHTML = `<div class="slot-empty-label">Slot ${slotIndex + 1} — Empty</div>`;
    } else {
      const thumb = createSlimeThumbCanvas(item, 68);
      card.appendChild(thumb);

      const title = document.createElement('div');
      title.className = 'slot-item-name';
      title.textContent = item.name;
      card.appendChild(title);

      // Price input editor
      const evalInfo = getPriceEvaluation(item.price, item.suggestedPrice);
      const priceWrap = document.createElement('div');
      priceWrap.className = 'price-editor';
      priceWrap.innerHTML = `<span>$</span>`;
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '1';
      input.max = '99';
      input.step = '0.5';
      input.value = item.price.toFixed(2);

      const badge = document.createElement('span');
      badge.className = `price-tag-hint ${evalInfo.cls}`;
      badge.textContent = `${evalInfo.label} (est. ${formatMoney(item.suggestedPrice)})`;

      input.addEventListener('change', () => {
        const val = Math.max(1, Number(input.value) || item.suggestedPrice);
        input.value = val.toFixed(2);
        updateShelfItemPrice(standId, slotIndex, val);
        const updatedEval = getPriceEvaluation(val, item.suggestedPrice);
        badge.className = `price-tag-hint ${updatedEval.cls}`;
        badge.textContent = `${updatedEval.label} (est. ${formatMoney(item.suggestedPrice)})`;
      });

      priceWrap.appendChild(input);
      card.appendChild(priceWrap);
      card.appendChild(badge);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'small-btn';
      removeBtn.textContent = 'Take Back to Tray';
      removeBtn.addEventListener('click', () => {
        removeSlimeFromStand(standId, slotIndex);
        updateHUD();
        renderStandModalContent();
      });
      card.appendChild(removeBtn);
    }

    els.standSlotsList.appendChild(card);
  });

  // Render player's Tray
  els.trayItemsList.innerHTML = '';
  const tray = gameState.persisted.tray;
  const firstEmptyIdx = slots.findIndex((s) => s === null);

  if (tray.length === 0) {
    els.trayItemsList.innerHTML = `
      <div class="tray-empty">
        Your tray is empty. Click <strong>+ Mix New Slime</strong> to craft more slimes!
      </div>
    `;
    return;
  }

  for (const item of tray) {
    const card = document.createElement('div');
    card.className = 'tray-card';

    card.appendChild(createSlimeThumbCanvas(item, 56));

    const nameEl = document.createElement('div');
    nameEl.className = 'slot-item-name';
    nameEl.textContent = item.name;
    card.appendChild(nameEl);

    // Price input before placing
    const priceWrap = document.createElement('div');
    priceWrap.className = 'price-editor';
    priceWrap.innerHTML = `<span>$</span>`;
    const priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.min = '1';
    priceInput.max = '99';
    priceInput.step = '0.5';
    priceInput.value = item.suggestedPrice.toFixed(2);
    priceWrap.appendChild(priceInput);
    card.appendChild(priceWrap);

    const placeBtn = document.createElement('button');
    placeBtn.className = 'small-btn primary-outline';
    placeBtn.textContent = firstEmptyIdx === -1 ? 'Stand Full' : `Place on Slot ${firstEmptyIdx + 1}`;
    placeBtn.disabled = firstEmptyIdx === -1;
    placeBtn.addEventListener('click', () => {
      const chosenPrice = Math.max(1, Number(priceInput.value) || item.suggestedPrice);
      if (placeSlimeOnStand(standId, firstEmptyIdx, item.id, chosenPrice)) {
        updateHUD();
        renderStandModalContent();
        showToast(`Placed "${item.name}" for ${formatMoney(chosenPrice)}!`, 'success');
      }
    });
    card.appendChild(placeBtn);

    els.trayItemsList.appendChild(card);
  }
}

export function openAccountingModal() {
  refreshAccountingModal();
  openModal(els.modalAccounting);
}

export function refreshAccountingModal() {
  const p = gameState.persisted;
  const profit = getNetProfit();

  els.accCash.textContent = formatMoney(p.cash);
  els.accRevenue.textContent = formatMoney(p.totalRevenue);
  els.accExpenses.textContent = formatMoney(p.totalExpenses);
  els.accProfit.textContent = formatMoney(profit);
  els.accProfit.className = `kpi-val ${profit >= 0 ? 'income-text' : 'expense-text'}`;
  els.accCrafted.textContent = String(p.slimesCrafted);
  els.accSold.textContent = String(p.slimesSold);

  els.ledgerTbody.innerHTML = '';
  for (const tx of p.ledger) {
    const tr = document.createElement('tr');
    const badge =
      tx.type === 'sale'
        ? '<span class="badge-sale">Sale</span>'
        : tx.type === 'expense'
          ? '<span class="badge-expense">Expense</span>'
          : '<span class="badge-sale">Opening</span>';
    const amtClass = tx.amount >= 0 ? 'income-text' : 'expense-text';
    const sign = tx.amount >= 0 ? '+' : '';
    tr.innerHTML = `
      <td>${tx.time}</td>
      <td>${badge}</td>
      <td>${escapeHtml(tx.description)}</td>
      <td class="num-col ${amtClass}">${sign}${formatMoney(tx.amount)}</td>
      <td class="num-col">${formatMoney(tx.balance)}</td>
    `;
    els.ledgerTbody.appendChild(tr);
  }
}

export function updateHUD() {
  const p = gameState.persisted;
  const profit = getNetProfit();
  els.hudCash.textContent = formatMoney(p.cash);
  els.hudProfit.textContent = formatMoney(profit);
  els.hudProfit.style.color = profit >= 0 ? '#15803d' : '#dc2626';
  els.hudTray.textContent = String(p.tray.length);

  if (p.shopOpen) {
    els.btnToggleShop.textContent = '🟢 Shop Open';
    els.btnToggleShop.classList.remove('closed');
  } else {
    els.btnToggleShop.textContent = '🔴 Shop Closed';
    els.btnToggleShop.classList.add('closed');
  }

  // Keep open accounting modal fresh when sales happen
  if (!els.modalAccounting.classList.contains('hidden')) {
    refreshAccountingModal();
  }
}

export function updateUIAnimations(time) {
  // Animate character select previews while modal is visible
  if (!els.modalChar.classList.contains('hidden')) {
    const fCtx = els.previewFemale.getContext('2d');
    const mCtx = els.previewMale.getContext('2d');
    drawShopkeeperPreview(fCtx, 'female', 70, 128, 1.75, time);
    drawShopkeeperPreview(mCtx, 'male', 70, 128, 1.75, time);
  }

  // Animate slime creator preview while modal is visible
  if (!els.modalCreator.classList.contains('hidden')) {
    const sCtx = els.slimePreviewCanvas.getContext('2d');
    sCtx.clearRect(0, 0, sCtx.canvas.width, sCtx.canvas.height);
    drawSlimeItem(sCtx, creatorDraft, 120, 130, 1.25, time);
  }

  // Update floating interact hint
  const anyModalOpen = isAnyModalOpen();
  if (!anyModalOpen && gameState.nearbyStationId) {
    const st = STATIONS.find((s) => s.id === gameState.nearbyStationId);
    if (st) {
      els.interactHint.innerHTML = `Press <kbd>E</kbd> or Click to open <strong>${st.name}</strong>`;
      els.interactHint.classList.remove('hidden');
      return;
    }
  }
  els.interactHint.classList.add('hidden');
}

export function isAnyModalOpen() {
  return (
    !els.modalChar.classList.contains('hidden') ||
    !els.modalCreator.classList.contains('hidden') ||
    !els.modalStand.classList.contains('hidden') ||
    !els.modalAccounting.classList.contains('hidden')
  );
}

function openModal(el) {
  el.classList.remove('hidden');
}

function closeModal(el) {
  el.classList.add('hidden');
  if (el === els.modalStand) {
    gameState.activeStandId = null;
  }
}

export function closeTopModal() {
  if (!els.modalCreator.classList.contains('hidden')) closeModal(els.modalCreator);
  else if (!els.modalStand.classList.contains('hidden')) closeModal(els.modalStand);
  else if (!els.modalAccounting.classList.contains('hidden')) closeModal(els.modalAccounting);
}

export function showToast(msg, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  els.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.25s ease';
    setTimeout(() => toast.remove(), 260);
  }, 2600);
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[m]));
}
