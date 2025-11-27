// Lightweight currency converter using Frankfurter API (no API key required)
const apiBase = 'https://api.frankfurter.app';

const amountInput = document.getElementById('amountInput');
const fromCurrency = document.getElementById('fromCurrency');
const toCurrency = document.getElementById('toCurrency');
const convertBtn = document.getElementById('convertBtn');
const swapBtn = document.getElementById('swapBtn');
const resultValue = document.getElementById('resultValue');
const resultInfo = document.getElementById('resultInfo');
const lastUpdated = document.getElementById('lastUpdated');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const fromFlag = document.getElementById('fromFlag');
const toFlag = document.getElementById('toFlag');
const popularRatesEl = document.getElementById('popularRates');

// Minimal flag map for common currencies (extendable)
const flagMap = {
    USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵', AUD: '🇦🇺', CAD: '🇨🇦',
    CHF: '🇨🇭', CNY: '🇨🇳', INR: '🇮🇳', RUB: '🇷🇺', BRL: '🇧🇷', ZAR: '🇿🇦',
    SEK: '🇸🇪', NOK: '🇳🇴', DKK: '🇩🇰', MXN: '🇲🇽', SGD: '🇸🇬', HKD: '🇭🇰'
};

function showLoading(show) {
    if (!loadingEl) return;
    if (show) loadingEl.classList.remove('hidden');
    else loadingEl.classList.add('hidden');
}

function showError(msg) {
    if (!errorEl) return;
    if (!msg) {
        errorEl.classList.add('hidden');
        errorEl.textContent = '';
        return;
    }
    errorEl.classList.remove('hidden');
    errorEl.textContent = msg;
}

function updateFlag(selectEl, flagEl) {
    if (!selectEl || !flagEl) return;
    const code = selectEl.value;
    flagEl.textContent = flagMap[code] || '';
}

async function loadCurrencies() {
    showLoading(true);
    try {
        const res = await fetch(`${apiBase}/currencies`);
        if (!res.ok) throw new Error(`Failed to fetch currencies: ${res.status}`);
        const data = await res.json(); // { USD: 'United States dollar', EUR: 'Euro', ... }

        // Create sorted entries, but prioritize some popular currencies
        const popular = ['USD','EUR','GBP','JPY','AUD','CAD','CHF','CNY','INR','RUB'];
        const allCodes = Object.keys(data).sort();

        // Clear selects
        fromCurrency.innerHTML = '';
        toCurrency.innerHTML = '';

        // Add popular first
        const added = new Set();
        popular.forEach(code => {
            if (data[code]) {
                const opt = document.createElement('option');
                opt.value = code;
                opt.textContent = `${code} - ${data[code]}`;
                fromCurrency.appendChild(opt.cloneNode(true));
                toCurrency.appendChild(opt.cloneNode(true));
                added.add(code);
            }
        });

        // Add remaining currencies
        allCodes.forEach(code => {
            if (added.has(code)) return;
            const opt = document.createElement('option');
            opt.value = code;
            opt.textContent = `${code} - ${data[code]}`;
            fromCurrency.appendChild(opt.cloneNode(true));
            toCurrency.appendChild(opt.cloneNode(true));
        });

        // Set sensible defaults
        fromCurrency.value = (data['USD'] ? 'USD' : allCodes[0]);
        toCurrency.value = (data['EUR'] ? 'EUR' : (allCodes.length > 1 ? allCodes[1] : allCodes[0]));

        updateFlag(fromCurrency, fromFlag);
        updateFlag(toCurrency, toFlag);
    } catch (err) {
        showError('Не удалось загрузить список валют.');
        console.error(err);
    } finally {
        showLoading(false);
    }
}

function parseAmountInput() {
    if (!amountInput) return 0;
    // allow comma or dot as decimal separator
    const raw = amountInput.value.trim().replace(',', '.');
    const parsed = parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : 0;
}

async function convert() {
    const amount = parseAmountInput();
    const from = fromCurrency.value;
    const to = toCurrency.value;

    if (amount <= 0) {
        resultValue.textContent = '0.00';
        resultInfo.textContent = '';
        lastUpdated.textContent = '';
        return;
    }

    showError('');
    showLoading(true);
    try {
        // Frankfurter: /latest?amount=AMOUNT&from=USD&to=EUR
        const url = `${apiBase}/latest?amount=${encodeURIComponent(amount)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`API error ${res.status}`);
        const data = await res.json();
        const rate = data.rates && data.rates[to];
        if (rate == null) throw new Error('Rate not available');
        const unitRate = rate / amount;
        resultValue.textContent = Number(rate).toLocaleString(undefined, {maximumFractionDigits: 4, minimumFractionDigits: 2});
        resultInfo.textContent = `1 ${from} = ${Number(unitRate).toLocaleString(undefined, {maximumFractionDigits: 6})} ${to}`;
        lastUpdated.textContent = `Updated: ${data.date || new Date().toLocaleDateString()}`;
    } catch (err) {
        showError('Ошибка получения курса.');
        resultValue.textContent = '0.00';
        resultInfo.textContent = '';
        console.error(err);
    } finally {
        showLoading(false);
    }
}

// Populate popular rates from Frankfurter
async function loadPopularRates() {
    if (!popularRatesEl) return;
    const base = fromCurrency.value || 'USD';
    const symbols = ['EUR','GBP','JPY','AUD','CAD','CHF','CNY','INR','RUB'].filter(s => s !== base);
    if (symbols.length === 0) {
        popularRatesEl.innerHTML = '';
        return;
    }

    try {
        const url = `${apiBase}/latest?from=${encodeURIComponent(base)}&to=${encodeURIComponent(symbols.join(','))}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        popularRatesEl.innerHTML = '';
        symbols.forEach(sym => {
            const rate = data.rates && data.rates[sym];
            if (rate == null) return;
            const item = document.createElement('div');
            item.className = 'rate-item';
            item.innerHTML = `
                <div class="rate-pair">${base} → ${sym}</div>
                <div class="rate-value">${Number(rate).toLocaleString(undefined, {maximumFractionDigits: 6})}</div>
                <div class="rate-change">${flagMap[sym] || ''} ${sym}</div>
            `;
            popularRatesEl.appendChild(item);
        });
    } catch (err) {
        console.error('Failed to load popular rates', err);
    }
}

// Event listeners
fromCurrency.addEventListener('change', () => { updateFlag(fromCurrency, fromFlag); loadPopularRates(); convert(); });
toCurrency.addEventListener('change', () => { updateFlag(toCurrency, toFlag); convert(); });
amountInput.addEventListener('input', convert);
amountInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') convert(); });
convertBtn.addEventListener('click', (e) => { e.preventDefault(); convert(); });
swapBtn.addEventListener('click', () => {
    const a = fromCurrency.value;
    fromCurrency.value = toCurrency.value;
    toCurrency.value = a;
    updateFlag(fromCurrency, fromFlag);
    updateFlag(toCurrency, toFlag);
    loadPopularRates();
    convert();
});

// Init
(async function init() {
    await loadCurrencies();
    await loadPopularRates();
    // initial convert with default amount
    convert();
})();
