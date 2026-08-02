const precedence = { '+': 1, '-': 1, '*': 2, '/': 2 };

export function evaluateCalculation(expression) {
    const source = String(expression || '').replace(/\s/g, '');
    if (!source || !/^\d+(?:[+\-*/]\d+)*$/.test(source)) throw new Error('Perhitungan belum lengkap.');
    const tokens = source.match(/\d+|[+\-*/]/g); const numbers = []; const operators = [];
    const apply = () => { const operator = operators.pop(); const right = numbers.pop(); const left = numbers.pop(); if (operator === '/' && right === 0) throw new Error('Tidak dapat membagi dengan nol.'); const value = operator === '+' ? left + right : operator === '-' ? left - right : operator === '*' ? left * right : left / right; numbers.push(value); };
    for (const token of tokens) {
        if (/^\d+$/.test(token)) numbers.push(Number(token));
        else { while (operators.length && precedence[operators.at(-1)] >= precedence[token]) apply(); operators.push(token); }
    }
    while (operators.length) apply();
    const result = Math.round(numbers[0]);
    if (!Number.isSafeInteger(result) || result < 0) throw new Error('Hasil nominal harus nol atau lebih besar.');
    return result;
}

export function appendCalculatorKey(expression, key) {
    let value = String(expression || '');
    if (/^\d{1,3}$/.test(key)) return `${value}${key}`.replace(/^0+(?=\d)/, '').slice(0, 60);
    if (['+', '-', '*', '/'].includes(key)) return value && !/[+\-*/]$/.test(value) ? `${value}${key}` : value.replace(/[+\-*/]$/, key);
    if (key === 'backspace') return value.slice(0, -1);
    if (key === 'clear') return '';
    return value;
}
