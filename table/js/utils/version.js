const regexCache = new Map();

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getOsDisplayName(os) {
    if (os === 'win') return 'Windows';
    if (os === 'mac') return 'macOS';
    if (os === 'linux') return 'Linux';
    return os;
}

export function highlight(text, term) {
    if (!term) return text;

    if (!regexCache.has(term)) {
        regexCache.set(term, new RegExp(`(${escapeRegExp(term)})`, 'gi'));
    }

    return String(text).replace(regexCache.get(term), '<mark>$1</mark>');
}

export function compareVersions(version1, version2) {
    const parts1 = String(version1).split('.').map(p => parseInt(p || '0', 10) || 0);
    const parts2 = String(version2).split('.').map(p => parseInt(p || '0', 10) || 0);
    const minLength = Math.min(parts1.length, parts2.length);

    for (let i = 0; i < minLength; i++) {
        if (parts1[i] > parts2[i]) return 1;
        if (parts1[i] < parts2[i]) return -1;
    }

    return 0;
}

export function parseSizeToBytes(sizeStr) {
    if (sizeStr == null || sizeStr === '' || sizeStr === '—') return 0;

    if (typeof sizeStr === 'number') {
        return sizeStr;
    }

    const match = String(sizeStr).match(/^([\d.]+)\s*(MB|GB|KB|B)?$/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = (match[2] || 'B').toUpperCase();

    const multipliers = {
        B: 1,
        KB: 1024,
        MB: 1024 * 1024,
        GB: 1024 * 1024 * 1024
    };

    return value * (multipliers[unit] || 1);
}

export function compareSearchMatch(left, right, term, accessors) {
    const normalizedTerm = String(term || '').toLowerCase();
    const shortA = String(accessors.getShort(left) || '').toLowerCase();
    const shortB = String(accessors.getShort(right) || '').toLowerCase();
    const fullA = String(accessors.getFull(left) || '').toLowerCase();
    const fullB = String(accessors.getFull(right) || '').toLowerCase();
    const reExact = new RegExp(`(^|\\.|\\s)${escapeRegExp(normalizedTerm)}($|\\.|\\s)`);

    const exactMatchA = reExact.test(shortA) || reExact.test(fullA);
    const exactMatchB = reExact.test(shortB) || reExact.test(fullB);

    if (exactMatchA && !exactMatchB) return -1;
    if (!exactMatchA && exactMatchB) return 1;

    const mainPartA = fullA.split('g')[0];
    const mainPartB = fullB.split('g')[0];
    const inMainA = mainPartA.includes(normalizedTerm);
    const inMainB = mainPartB.includes(normalizedTerm);

    if (inMainA && !inMainB) return -1;
    if (!inMainA && inMainB) return 1;

    const fallbackA = String(accessors.getFallback ? accessors.getFallback(left) : accessors.getShort(left));
    const fallbackB = String(accessors.getFallback ? accessors.getFallback(right) : accessors.getShort(right));

    return -1 * fallbackA.localeCompare(fallbackB, undefined, accessors.localeOptions || { numeric: true, sensitivity: 'base' });
}
