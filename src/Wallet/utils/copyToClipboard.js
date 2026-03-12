import useToastStore from "../store/toaststore";


// With the utility, write logic once and call it from anywhere
export function copyToClipboard(text, showToast) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    
    // Use provided showToast or fall back to store's showToast
    if (showToast) {
        showToast("Copied To Clipboard");
    } else {
        useToastStore.getState().showToast("Copied To Clipboard");
    }
}