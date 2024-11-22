import * as cheerio from 'cheerio';
import * as fs from 'fs';

async function encryptToBase64(content: string, password: string) : Promise<string> {
  const encoder = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(32))
  const baseKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey'],
  )
  const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 1e5, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt'],
  )

  const iv = crypto.getRandomValues(new Uint8Array(16))
  const ciphertext = new Uint8Array(
      await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv },
          key,
          encoder.encode(content),
      ),
  )
  const totalLength = salt.length + iv.length + ciphertext.length
  const mergedData = new Uint8Array(totalLength)
  mergedData.set(salt)
  mergedData.set(iv, salt.length)
  mergedData.set(ciphertext, salt.length + iv.length)

  const base64 = btoa(String.fromCharCode.apply(null, mergedData));

  return base64;
}

async function main() {
  const html = fs.readFileSync('./example_site/index.html', 'utf8');
  const style = fs.readFileSync('./assets/passwordFormDefaultStyle.css', 'utf8');
  const prompt = fs.readFileSync('./assets/_passwordPrompt.html', 'utf8');
  const decrypterCode = fs.readFileSync('./assets/decrypt.js', 'utf8');

  let $ = cheerio.load(html);

  // Replace the SiteCrypt content
  const password = "yeet";
  let encryptedSections = [];

  let index = 0;
  for (const element of $('._protected')) {
    let encrypted = await encryptToBase64($(element).html(), password);
    encryptedSections.push(encrypted);

    if (index == 0) {
      $(element).html(prompt);
    } else {
      $(element).html("<!-- ENCRYPTED SECTION -->");
    }
    index++;
  }

  // Insert the HTML/CSS/JS
  $('head').append($('<style>').text(style));

  $(`
<script>
  ${decrypterCode}
  const encryptedContent = ${JSON.stringify(encryptedSections)};
</script>`).insertBefore('body');

  $('<script>setup()</script>').insertAfter('body');

  console.log("Writing content...");
  fs.writeFileSync('./test.html', $.html());
}

main();