let SiteCrypt = {
  allEncryptedContentBase64: [],
  decrypt: async function decrypt(encryptedContentBase64, password) {
    const buffer = window.atob(encryptedContentBase64);
    const len = buffer.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = buffer.charCodeAt(i);
    }
    const decodedEncryptedContent = bytes.buffer;
  
    const salt = decodedEncryptedContent.slice(0, 32)
    const iv = decodedEncryptedContent.slice(32, 32 + 16)
    const ciphertext = decodedEncryptedContent.slice(32 + 16)
  
    const encoder = new TextEncoder()
    const baseKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey'],
    )
  
    // 600k is the recommended number of iterations for PBKDF2 as of 2023
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      true,
      ['decrypt'],
    )
  
    const decryptedArray = new Uint8Array(
      await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
    );
  
    let decrypted = new TextDecoder().decode(decryptedArray);
  
    return decrypted;
  },
  decryptLoginPage: async function decryptLoginPage(password) {
    let decryptedContent = [];
    try {
      for (encrypted of SiteCrypt.allEncryptedContentBase64) {
        const decrypted = await SiteCrypt.decrypt(encrypted, password);
        decryptedContent.push(decrypted);
      }
      for (element of document.getElementsByClassName('_siteCrypt-protected')) {
        element.innerHTML = decryptedContent.shift();
      };
      SiteCrypt.storePassword(password);
    } catch (e) {
      console.log(e);
      SiteCrypt.showError('Incorrect password');
    }
  },
  doSubmit: async function doSubmit(e) {
    SiteCrypt.hideError();
    e.preventDefault();
    SiteCrypt.decryptLoginPage(document.getElementById('_siteCrypt-password').value);
  },
  hideError: function hideError() {
    document.getElementById('_siteCrypt-passwordError').style.display = 'none';
  },  
  showError: function showError(errorMessage) {
    let errorElement = document.getElementById('_siteCrypt-passwordError');
    errorElement.style.display = '';
    errorElement.textContent = errorMessage;
  },
  setupLoginPage: function setupLoginPage() {
    // Sanity checks
    let passwordForm = document.getElementById('_siteCrypt-passwordForm');
  
    if (!passwordForm) {
      alert("Password form not found!  Please ensure the page is set up correctly.");
      return;
    }
  
    if (!isSecureContext) {
      // If the page is not served over HTTPS, we can't use the Web Crypto API
      // TODO: ERROR
      showError("This page must be served over HTTPS to use SiteCrypt");
      return;
    }
  
    if (!crypto.subtle) {
      // TODO: ERROR
      SiteCrypt.showError("This browser does not support the Web Crypto API");
      return;
    }

    let password = null;
    if (window.location.hash.startsWith('#pw=')) {
      password = window.location.hash.substring(4);
    } else {
      password = SiteCrypt.getStoredPassword();
    }
  
    passwordForm.addEventListener('submit', SiteCrypt.doSubmit);
    if (password) {
      document.getElementById('_siteCrypt-password').value = password;
      passwordForm.requestSubmit();
    }
  },
  setupSubPage: async function setupSubPage(redir) {
    let password = SiteCrypt.getStoredPassword();
    if (password) {
      try {
        const decrypted = await SiteCrypt.decrypt(SiteCrypt.allEncryptedContentBase64, password);
        document.write(decrypted);
        SiteCrypt.storePassword(password);
        return;
      } catch(e) {
        // Password was incorrect
        console.log("Password was incorrect, redirecting to login page");
      }
    }
    window.location.href = redir + '#from=' + window.location.pathname;
  },
  storePassword: function storePassword(password) {
    sessionStorage.setItem('_siteCrypt-password', password);
  },
  getStoredPassword: function getStoredPassword() {
    let password = null;
    if (window.location.hash.startsWith('#pw=')) {
      password = window.location.hash.substring(4);
    } else {
      password = sessionStorage.getItem('_siteCrypt-password');
    }
  
    return password;
  },
  logout: function logout() {
    sessionStorage.removeItem('_siteCrypt-password');
    window.location.reload();
  }
};
