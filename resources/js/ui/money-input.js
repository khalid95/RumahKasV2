const formatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

export function sanitizeMoney(value, allowNegative = false) {
    const text = String(value ?? '');
    const negative = allowNegative && text.trim().startsWith('-');
    const digits = text.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
    if (!digits) return negative ? '-' : '';
    return `${negative ? '-' : ''}${digits}`;
}

export function formatMoney(value, allowNegative = false) {
    const raw = sanitizeMoney(value, allowNegative);
    if (!raw) return '';
    if (raw === '-') return '-Rp ';
    const amount = Number(raw);
    return `${amount < 0 ? '-Rp ' : 'Rp '}${formatter.format(Math.abs(amount))}`;
}

export function setMoneyValue(input, value) {
    const element = input instanceof Element ? input : input?.[0];
    if (!element) return;
    const allowNegative = element.dataset.allowNegative === 'true';
    const raw = sanitizeMoney(value, allowNegative);
    element.dataset.rawValue = raw;
    element.value = formatMoney(raw, allowNegative);
}

export function getMoneyValue(input) {
    const element = input instanceof Element ? input : input?.[0];
    if (!element) return '';
    return element.dataset.rawValue || '';
}

export function setMoneyNegativeAllowed(input, allowed) {
    const element = input instanceof Element ? input : input?.[0];
    if (!element) return;
    const previous = getMoneyValue(element);
    element.dataset.allowNegative = allowed ? 'true' : 'false';
    setMoneyValue(element, previous);
}

export function bindMoneyInput(input) {
    const element = input instanceof Element ? input : input?.[0];
    if (!element || element.dataset.moneyBound === 'true') return;
    element.dataset.moneyBound = 'true';

    element.addEventListener('input', () => {
        setMoneyValue(element, element.value);
        element.setSelectionRange(element.value.length, element.value.length);
    });
    element.addEventListener('focus', () => element.select());
    setMoneyValue(element, element.value);
}
