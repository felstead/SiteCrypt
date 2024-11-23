async function decrypt(encryptedContentBase64, password) {
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
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
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
}

async function decryptLoginPage(password) {
  let decryptedContent = [];
  try {
    for (encrypted of encryptedContent) {
      const decrypted = await decrypt(encrypted, password);
      decryptedContent.push(decrypted);
    }
    for (element of document.getElementsByClassName('_protected')) {
      element.innerHTML = decryptedContent.shift();
    };
  } catch (e) {
    console.log(e);
    showError('Incorrect password');
  }
}

async function doSubmit(e) {
  hideError();
  e.preventDefault();
  decryptLoginPage(document.getElementById('_sitecryptPassword').value);
}

function hideError() {
  document.getElementById('_sitecryptPasswordError').style.display = 'none';
}

function showError(errorMessage) {
  let errorElement = document.getElementById('_sitecryptPasswordError');
  errorElement.style.display = '';
  errorElement.textContent = errorMessage;
}

function setupLoginPage() {
  // Sanity checks
  let passwordForm = document.getElementById('_sitecryptPasswordForm');

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
    showError("This browser does not support the Web Crypto API");
    return;
  }

  document.getElementById('_sitecryptPasswordForm').addEventListener('submit', doSubmit);
}

async function setupSubPage(redir) {
  if (window.location.hash.startsWith('#key=')) {
    try {
      let key = window.location.hash.substring(5);
      const decrypted = await decrypt(encryptedContent, key);
      document.write(decrypted);
    } catch(e) {
      // Password was incorrect
      window.location.href = redir + '#from=' + window.location.pathname;
    }
  }
}