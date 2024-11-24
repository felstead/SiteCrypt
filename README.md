# SiteCrypt

Password protect static sites purely on the client side - no backend required!  This allows you to host password protected content anywhere you can host HTML, like AWS S3, Render, Cloudflare, etc.

> TODO: Add example

Inspired by [PageCrypt](https://pagecrypt.maxlaumeister.com/) by Maximillian Laumeister. 

## Get Started

SiteCrypt will take your static HTML content and password protect it using the client side webcrypto framework.

It expects that you will have a "login" page and that all other pages under that will redirect back to that page when the password has not been supplied.

To run it:
`npm sitecrypt --base_dir "./built_html" --login-page "index.html" --encrypt-pages "*.html" --redirect-path "/"

1. Install
2. Mark up your landing page by adding an HTML class to the main content you want to password protect.  This will replace that content with the login form, e.g.

```html
    <html>
      <head>
        <title>SiteCrypt Protected Page</title>
      </head>
      <body>
        <!-- The header and footer will NOT be password protected -->
        <header>
          <h1>Welcome to my secret site!</h1>
        </header>
        <!-- The content of this div will be replaced with a login form prompting the user for the password -->
        <div id="main" class="_protected">
          <section>
            <h2>Secret plans for world domination!!!</h2>
            <ul>
              <!-- Each of these pages will be password protected, and if you try to navigate to them directly, you'll be redirected back to the landing page -->
              <li>Step 1: <a href="/step1.html">Open a coffee shop</a></li>
              <li>Step 2: <a href="/step2.html">TBD</a></li>
              <li>Step 3: <a href="/step3.html">Achieve world domination!</a></li>
            </ul>
          </section>
        </div>
        <footer class="_protected">
          <p>&copy; 2024 - Definitely Not World Domination Inc.</p>
        </footer>
      </body>
    </html>
```

## How does it work?
When you build your site with SiteCrypt, all of the protected HTML content is encrypted based on a password that is run through a key derivation function, specifically [PBKDF2](https://en.wikipedia.org/wiki/PBKDF2) with [SHA-256](https://en.wikipedia.org/wiki/SHA-2), by default with 600k iterations, as [recommended by OWASP in 2023](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#pbkdf2).  The encrypted data is stored in embedded Javascript variables, and if the correct password is provided, it is decrypted entirely in the browser and the page content is replaced with the decrypted content.  No decrypted data ever leaves the users' machine!

## Is it secure?
### Short answer
**Yes**, as long as your password is strong and you protect your credentials and devices.

### Longer answer

There are really only three main attack vectors for decrypting the content encrypted with SiteCrypt:

1. **Brute-forcing the password**

The password is encrypted with [PBKDF2](https://en.wikipedia.org/wiki/PBKDF2)-HMAC-[SHA-256](https://en.wikipedia.org/wiki/SHA-2), by default with 600k iterations, as [recommended by OWASP in 2023](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#pbkdf2).  This is considered a secure way to store passwords and provides resistance against brute-force attacks given the high computational cost of each "guess" due to the large number of iterations.  That said, if your password is weak (e.g. it is short, or is a dictionary word, or a common password) it will be much easier to brute-force.  A [strong, unique password](https://www.lastpass.com/features/password-generator) will be effectively impossible to brute-force.

2. **Stealing the key from local storage after decryption**

After a user logs into the site, to avoid them having to re-enter the password on every sub-page and every subseqeuent revisit to the site, the derived key is stored in local storage in the user's browser.  If this is accessible (e.g. if an attacked has physical access to the device on which the key is stored) then the key could be retrieved.  

However, bear in mind that this is the case for logging into more or less any online service.  The major (and important) difference is that the credentials cannot be revoked without redeploying the site with a different password, and even if that were the case, the encrypted content could have already be saved by an attacker.

3. **Compromising the password in some other way**

If someone gets the password, they can decrypt the content, assuming they have a copy of it.  Protect your credentials!


## License

[MIT](LICENSE)
