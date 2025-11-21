// PWA Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker registration failed:', err));
    });
}

// State
let currentExchangeRate = 0;
const BANK_DATA = {
    'IOB': { name: 'Indian Overseas Bank', tax: 5.609986455320862 },
    'SBI': { name: 'State Bank of India', tax: 5.0 }, // Placeholder
    'HDFC': { name: 'HDFC Bank', tax: 4.5 }, // Placeholder
    'Custom': { name: 'Custom Bank', tax: 0 }
};

// DOM Elements
const elements = {
    lkrInput: document.getElementById('lkrAmount'),
    inrInput: document.getElementById('inrAmount'),
    taxInput: document.getElementById('taxRate'),
    bankSelector: document.getElementById('bankSelector'),
    settingsPanel: document.getElementById('settingsPanel'),
    toggleSettingsBtn: document.getElementById('toggleSettings'),
    convertBtn: document.getElementById('convertBtn'),
    results: document.getElementById('results'),
    lkrToInrRate: document.getElementById('lkrToInr'),
    inrToLkrRate: document.getElementById('inrToLkr'),
    themeToggle: document.getElementById('themeToggle'),
    shareBtn: document.getElementById('shareBtn')
};

// Initialize
async function init() {
    await updateRates();
    loadSettings();
    setupEventListeners();
    loadTheme();
}

function loadSettings() {
    const savedBank = localStorage.getItem('selectedBank') || 'IOB';
    const savedTax = localStorage.getItem('customTax');

    if (elements.bankSelector) {
        elements.bankSelector.value = savedBank;
    }

    if (savedBank === 'Custom' && savedTax) {
        elements.taxInput.value = savedTax;
    } else if (BANK_DATA[savedBank]) {
        elements.taxInput.value = BANK_DATA[savedBank].tax;
    }

    handleBankChange();
}

// Fetch Rates
async function updateRates() {
    try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/LKR');
        const data = await response.json();
        currentExchangeRate = data.rates.INR;

        if (elements.lkrToInrRate) elements.lkrToInrRate.textContent = `1 LKR = ${currentExchangeRate.toFixed(4)} INR`;
        if (elements.inrToLkrRate) elements.inrToLkrRate.textContent = `1 INR = ${(1 / currentExchangeRate).toFixed(4)} LKR`;
    } catch (error) {
        console.error('Error fetching rates:', error);
    }
}

// Event Listeners
function setupEventListeners() {
    elements.convertBtn.addEventListener('click', handleConversion);

    elements.lkrInput.addEventListener('input', () => elements.inrInput.value = '');
    elements.inrInput.addEventListener('input', () => elements.lkrInput.value = '');

    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.shareBtn.addEventListener('click', generateAndSharePDF);

    // Bank & Settings Logic
    if (elements.bankSelector) {
        elements.bankSelector.addEventListener('change', handleBankChange);
    }
    elements.taxInput.addEventListener('input', handleTaxChange);

    if (elements.toggleSettingsBtn) {
        elements.toggleSettingsBtn.addEventListener('click', () => {
            elements.settingsPanel.classList.toggle('hidden');
            elements.toggleSettingsBtn.textContent = elements.settingsPanel.classList.contains('hidden') ? 'Edit' : 'Close';
        });
    }
}

function handleBankChange() {
    const selectedBank = elements.bankSelector ? elements.bankSelector.value : 'IOB';
    localStorage.setItem('selectedBank', selectedBank);

    if (selectedBank !== 'Custom' && BANK_DATA[selectedBank]) {
        elements.taxInput.value = BANK_DATA[selectedBank].tax;
        elements.taxInput.readOnly = true;
        elements.taxInput.classList.add('opacity-70', 'cursor-not-allowed');
    } else {
        elements.taxInput.readOnly = false;
        elements.taxInput.classList.remove('opacity-70', 'cursor-not-allowed');
        elements.taxInput.focus();
    }
}

function handleTaxChange() {
    if (elements.bankSelector && elements.bankSelector.value === 'Custom') {
        localStorage.setItem('customTax', elements.taxInput.value);
    }
}

// Conversion Logic
async function handleConversion() {
    const lkrAmount = parseFloat(elements.lkrInput.value);
    const inrAmount = parseFloat(elements.inrInput.value);
    const taxPercentage = parseFloat(elements.taxInput.value) || 0;
    const taxRate = taxPercentage / 100;

    if ((isNaN(lkrAmount) && isNaN(inrAmount)) || (!isNaN(lkrAmount) && !isNaN(inrAmount))) {
        alert('Please enter an amount in only one currency');
        return;
    }

    setLoading(true);
    await new Promise(r => setTimeout(r, 800)); // UX Delay

    let result = {};

    if (!isNaN(lkrAmount) && lkrAmount > 0) {
        // Gross LKR -> Net INR
        const convertedINR = lkrAmount * currentExchangeRate;
        const taxINR = convertedINR * taxRate;
        const taxLKR = lkrAmount * taxRate;
        const netLKR = lkrAmount - taxLKR;
        const netINR = convertedINR - taxINR;

        result = {
            exchangeRate: `1 LKR = ${currentExchangeRate.toFixed(4)} INR`,
            convertedAmount: `₹${netINR.toFixed(2)}`,
            taxINR: `₹${taxINR.toFixed(2)}`,
            taxLKR: `Rs.${taxLKR.toFixed(2)}`,
            totalDedINR: `₹${convertedINR.toFixed(2)}`,
            totalDedLKR: `Rs.${lkrAmount.toFixed(2)}`,
            netLKR: `Rs.${netLKR.toFixed(2)}`,
            netINR: `₹${netINR.toFixed(2)}`,
            summaryLKR: `-Rs.${lkrAmount.toFixed(2)}`,
            summaryINR: `₹${netINR.toFixed(2)}`
        };
    } else {
        // Net INR -> Gross LKR
        const netINR = inrAmount;
        const grossINR = netINR / (1 - taxRate);
        const taxINR = grossINR - netINR;
        const grossLKR = grossINR / currentExchangeRate;
        const taxLKR = grossLKR * taxRate;
        const netLKR = grossLKR - taxLKR;

        result = {
            exchangeRate: `1 INR = ${(1 / currentExchangeRate).toFixed(4)} LKR`,
            convertedAmount: `Gross: ₹${grossINR.toFixed(2)}`,
            taxINR: `₹${taxINR.toFixed(2)}`,
            taxLKR: `Rs.${taxLKR.toFixed(2)}`,
            totalDedINR: `₹${grossINR.toFixed(2)}`,
            totalDedLKR: `Rs.${grossLKR.toFixed(2)}`,
            netLKR: `Rs.${netLKR.toFixed(2)}`,
            netINR: `₹${netINR.toFixed(2)}`,
            summaryLKR: `-Rs.${grossLKR.toFixed(2)}`,
            summaryINR: `₹${netINR.toFixed(2)}`
        };
    }

    updateUI(result);
    setLoading(false);
}

function updateUI(data) {
    document.getElementById('exchangeRate').textContent = data.exchangeRate;
    document.getElementById('convertedAmount').textContent = data.convertedAmount;
    document.getElementById('taxInINR').textContent = data.taxINR;
    document.getElementById('taxInLKR').textContent = data.taxLKR;
    document.getElementById('totalDeductionINR').textContent = data.totalDedINR;
    document.getElementById('totalDeductionLKR').textContent = data.totalDedLKR;
    document.getElementById('netINR').textContent = data.netINR;
    document.getElementById('netLKR').textContent = data.netLKR;

    document.getElementById('totalDetectedLKRDisplay').textContent = data.summaryLKR;
    document.getElementById('cashInHandINRDisplay').textContent = data.summaryINR;

    elements.results.classList.remove('hidden');
    elements.results.classList.add('animate-fade-in');
}

function setLoading(isLoading) {
    elements.convertBtn.disabled = isLoading;
    elements.convertBtn.innerHTML = isLoading
        ? `<i class="ri-loader-line animate-spin mr-2"></i> Calculating...`
        : `<i class="ri-calculator-line align-middle mr-2"></i> Calculate Conversion 🔄`;
}

// Theme Handling
function toggleTheme() {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon(isDark);
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        updateThemeIcon(true);
    }
}

function updateThemeIcon(isDark) {
    const icon = elements.themeToggle.querySelector('i');
    icon.className = isDark ? 'ri-sun-line' : 'ri-moon-line';
}

// PDF Generation
function generateAndSharePDF() {
    const element = document.body;
    const opt = {
        margin: 0.5,
        filename: 'conversion-result.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).outputPdf('blob').then((pdfBlob) => {
        const file = new File([pdfBlob], 'conversion-result.pdf', { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            navigator.share({
                files: [file],
                title: 'Conversion Result',
                text: 'Here is the conversion result.'
            });
        } else {
            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'conversion-result.pdf';
            a.click();
        }
    });
}

init();
