export function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return String(date.getDate()).padStart(2, '0') + '.' +
        String(date.getMonth() + 1).padStart(2, '0') + '.' +
        date.getFullYear();
}

export function formatSize(sizeInBytes) {
    const bytes = Number(sizeInBytes);
    if (!Number.isFinite(bytes) || bytes <= 0) return '—';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

export function normalizeMetaDate(dateValue) {
    if (!dateValue) return '—';
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(String(dateValue))) {
        return String(dateValue);
    }
    return formatDate(dateValue);
}

export function normalizeMetaSize(sizeValue) {
    if (sizeValue == null || sizeValue === '') return '—';
    if (typeof sizeValue === 'number' || /^\d+$/.test(String(sizeValue))) {
        return formatSize(sizeValue);
    }
    return String(sizeValue);
}

export function formatDownloadCount(count) {
    count = parseInt(count, 10);

    const suffix = count === 1 ? 'download' : 'downloads';

    if (count < 1000) {
        return `${count} ${suffix}`;
    }

    const unit = count < 1000000 ? 'k' : 'm';
    const value = count < 1000000 ? count / 1000 : count / 1000000;
    let formatted = value.toFixed(1);

    if (formatted.endsWith('.0')) {
        formatted = formatted.slice(0, -2);
    }

    return `${formatted}${unit} ${suffix}`;
}

export function renderDownloadCounter(count) {
    return String(count) === '0'
        ? ''
        : `<span class="download-counter">${formatDownloadCount(count)}</span>`;
}

export function formatCommentCount(count) {
    const numeric = Number(count || 0);
    if (numeric <= 0) return '';
    if (numeric > 99) return '99+';
    return `+${numeric}`;
}

export function escapeToastText(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
