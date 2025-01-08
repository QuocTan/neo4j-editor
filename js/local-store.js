async function initToken() {
    console.log(`initToken()`);
    //user
    setLocalStorage('zS5IQnPer43SoiBBW2Hr9g==', "mpiaUWMnKZl2eVzvyKbP9yW7zO9bgw0qh7NbNsaoizB5zav4/0jv5ZAu4NK0x6BzSTn0V3HWfyDXyBPI/AVVTw==");
    setLocalStorage('JUGmfalqehorNbYyOzvklg==', "onI1yCMxYOThm53odHJNpSMNJYB6LpoMqOU3qWuhn/qOzINbK43MQORbyxfhM/IkJRD7ck4rlwgXv7Fl6986cQ==");
}

function setLocalStorage(key, value) {
    if (!key || value === undefined) {
        console.error("Key và Value không được để trống!");
        return;
    }
    localStorage.setItem(key, JSON.stringify(value));
}

function getLocalStorage(key) {
    if (!key) {
        console.error("Key không được để trống!");
        return null;
    }
    const value = localStorage.getItem(key);
    if (value) {
        return JSON.parse(value);
    } else {
        return null;
    }
}

function encryptData(data, secretKey) {
    if (!data || !secretKey) {
        console.error("data or secretKey null");
        return null;
    }

    const jsonData = JSON.stringify(data);
    const iv = CryptoJS.enc.Hex.parse("00000000000000000000000000000000");
    const encrypted = CryptoJS.AES.encrypt(jsonData, CryptoJS.enc.Utf8.parse(secretKey), {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
    });

    return encrypted.toString();
}

function decryptData(encryptedData, secretKey) {
    try {
        if (!encryptedData || !secretKey) {
            console.warn("encryptedData or secretKey null!");
            return null;
        }

        const iv = CryptoJS.enc.Hex.parse("00000000000000000000000000000000");
        const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, CryptoJS.enc.Utf8.parse(secretKey), {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7,
        });

        return JSON.parse(decryptedBytes.toString(CryptoJS.enc.Utf8));
    } catch (error) {
        console.warn("Giải mã thất bại!", encryptedData, secretKey);
        console.log(error);
        return null;
    }
}


async function hashData(data) {
    if (!data) {
        console.error("data null!");
        return null;
    }

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);

    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');

    return hashHex;
}
