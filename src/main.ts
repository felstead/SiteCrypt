import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as crypto from 'crypto';
import commandLineArgs from 'command-line-args'

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
  // 600k is the recommended number of iterations for PBKDF2 as of 2023
  const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 6e5, hash: 'SHA-256' },
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

function showUsage() { 
  console.log();
  console.log("Command line options: ");
  console.log("  --input-path: The path to the directory containing the HTML files to encrypt.");
  console.log("  --output-path: The path to the directory to output the encrypted HTML files.");
  console.log("  --password: The password to use for encryption.");
  console.log("  --login-file: The name of the HTML file to use as the login page, relative to the input path, e.g. 'index.html'");
  console.log("  --login-redirect: The URL to redirect to if logins fail, usually just a path like '/' or '/login.html'");

  return -1;
}

async function main() {
  const optionDefinitions = [
    { name: "input-path", type: String },
    { name: "output-path", type: String },
    { name: "password", type: String },
    { name: "login-file", type: String },
    { name: "login-redirect", type: String },
  ];

  const options = commandLineArgs(optionDefinitions);

  const inputPath = options["input-path"];
  const outputPath = options["output-path"];
  const password = options["password"];
  const loginFile = options["login-file"];
  const loginRedirect = options["login-redirect"];

  // Check all params are set
  if (!inputPath || !outputPath || !password || !loginFile || !loginRedirect) { 
    let missingParams = [];
    if (!inputPath) missingParams.push("input-path");
    if (!outputPath) missingParams.push("output-path");
    if (!password) missingParams.push("password");
    if (!loginFile) missingParams.push("login-file");
    if (!loginRedirect) missingParams.push("login-redirect");
    
    console.error(`Missing required arguments: ${missingParams.join(", ")}`);

    return showUsage();
  }

  // Check if the input path exists and is a directory
  if (!fs.existsSync(inputPath) || !fs.lstatSync(inputPath).isDirectory()) {
    console.error(`Input path '${inputPath}' must be a directory.`);
    return showUsage();
  }

  const loginFileFullPath = `${outputPath}/${loginFile}`;

  // Create output dir
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath);
  }

  // Copy files recursively from input dir to output dir
  fs.cpSync(inputPath, outputPath, { recursive: true });

  // Ensure login-file exists in the directory
  if (!fs.existsSync(loginFileFullPath)) {
    console.error(`Login file '${loginFile}' does not exist in the directory.`);
    return showUsage();
  }

  // Setup our templates
  const style = fs.readFileSync('./assets/passwordFormDefaultStyle.css', 'utf8');
  const prompt = fs.readFileSync('./assets/_passwordPrompt.html', 'utf8');
  const decrypterCode = fs.readFileSync('./assets/decrypt.min.js', 'utf8');
  const license = fs.readFileSync('./LICENSE', 'utf8');

  // Iterate through all the .html files in the output dir
  const processDir = async (dir: string) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = `${dir}/${file}`;
      console.log("Processing file: ", fullPath);
      if (fs.lstatSync(fullPath).isDirectory()) {
        await processDir(fullPath);
      } else if (file.endsWith('.html') || file.endsWith('.htm')) {
        const html = fs.readFileSync(fullPath, 'utf8');
        let $ = cheerio.load(html);
        let output = null;

        if (fullPath === loginFileFullPath) {
          // Generate file as the login page
          let encryptedSections = [];

          let index = 0;
          for (const element of $('._siteCrypt-protected')) {
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

          $('head').append($(`<script>${decrypterCode};SiteCrypt.allEncryptedContentBase64 = ${JSON.stringify(encryptedSections)};</script>`));
          $('body').append($('<script>SiteCrypt.setupLoginPage()</script>'));

          output = $.html();
        } else {
          // Generate file as a sub-page
          let encrypted = await encryptToBase64(html, password);
          output = `<!DOCTYPE html><html><head><script>${decrypterCode};SiteCrypt.allEncryptedContentBase64 = ['${encrypted}'];SiteCrypt.setupSubPage('${loginRedirect}');</script></head><body></body></html>`;


          fs.writeFileSync(fullPath, output);
        }

        output += "\n<!--\n Page generated by SiteCrypt: https://github.com/felstead/SiteCrypt\n\n" + license + "\n-->";
        fs.writeFileSync(fullPath, output);
      }
    }
  };

  await processDir(outputPath);
}

main();