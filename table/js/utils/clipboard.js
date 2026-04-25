export function showToast(message, duration = 2000, type = null) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.innerHTML = String(message).replace(/\n/g, '<br>');

    if (type === 'error') {
        toast.style.background = '#6f1611';
        toast.style.color = '#fff';
    } else if (type === 'success') {
        toast.style.background = '#1db954';
        toast.style.color = '#000000';
    } else {
        toast.style.background = '#333';
        toast.style.color = '#fff';
    }

    toast.style.textAlign = 'center';
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.style.background = '';
            toast.style.color = '';
            toast.style.textAlign = '';
        }, 300);
    }, duration);
}

export function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        document.execCommand('copy');
        showToast('Copied to clipboard');
    } catch (err) {
        showToast('Error while copying');
        console.error('Error while copying:', err);
    }

    document.body.removeChild(textArea);
}

export async function copyTextToClipboard(text, successMessage = 'Copied to clipboard') {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            showToast(successMessage);
        } else {
            fallbackCopyTextToClipboard(text);
        }
    } catch (err) {
        console.error('Error while copying:', err);
        fallbackCopyTextToClipboard(text);
    }
}
