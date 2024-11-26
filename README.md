# SiteCrypt

Password protect static sites purely on the client side - no backend required!  This allows you to host password protected content anywhere you can host static web content like [AWS S3 Static Websites](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html), [Render Static Sites](https://render.com/docs/static-sites), [Cloudflare Pages](https://pages.cloudflare.com/), etc.

Try it out here! <a href="https://felstead.github.io/SiteCrypt/">Example site protected by SiteCrypt</a>. <i>Hint: the password is <b>secret123</b></i>

Inspired by [PageCrypt](https://pagecrypt.maxlaumeister.com/) by Maximillian Laumeister. 

## How to use SiteCrypt
SiteCrypt will take your static HTML content and password protect it using the client side webcrypto framework.  Note that **ONLY THE HTML PAGES ARE ENCRYPTED** - any linked data like your javascript, CSS, images, etc, are all stored unencrypted.  If you want to encrypt these as well, I recommend inlining them using `<style>` and `<script>` tags, and using [Data URLs](https://developer.mozilla.org/en-US/docs/Web/URI/Schemes/data) for images such that this external content is embedded in your page.

It expects that you will have a "login" page and that all other pages under that will redirect back to that page when the password has not been supplied.

1. Install SiteCrypt: `npm i sitecrypt -g`
2. Mark up your login page by adding an HTML class `_siteCrypt-protected` to the sections you want to protect.  By default, the first element with that class will have its content replaced with the login form.  If you want a different element to contain the login form, add both classes `_siteCrypt-protected _siteCrypt-protected-login` to the class.

An example is below.

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
        <!-- The content of this tag will be removed and replaced during the decryption phase -->
        <h2 id="intro" class="_siteCrypt-protected">Introducing...</h2>
        <!-- The content of this div will be replaced with a login form prompting the user for the password since it has _siteCrypt-protected-login on it along with _siteCrypt-protected-->
        <div id="main" class="_siteCrypt-protected _siteCrypt-protected-login">
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
        <footer class="_siteCrypt-protected">
            <p>&copy; 2024 - Definitely Not World Domination Inc.</p>
        </footer>
    </body>
</html>
```
3. Encrypt your site
To run the encryption, point sitecrypt at the directory you want to encrypt, and it will process all the HTML pages in there, outputting them to `output-path`:

```
sitecrypt --input-path=PATH_TO_YOUR_SITE --output-path=SOME_OUTPUT_PATH --password=A_STRONG_PASSWORD --login-file=YOUR_LANDING_PAGE.html --login-redirect=/PATH_TO_YOUR_LOGIN_PAGE_ON_YOUR_SITE
```

4. Deploy your encrypted pages!
Simply deploy the built pages specified in `output-path` to your hosting provider!

### Permalinks
If you want to auto-login someone, you can provide a link to your site with the password already embedded by appending it to the URI, for example:

```
https://mystaticsite.com/page.html#pw=MY_PASSWORD
```

Here is an example permalink to the example site: https://felstead.github.io/SiteCrypt/#pw=secret123

### Logging out
You can logout simply by calling `SiteCrypt.logout()` on any of the encrypted pages.  Or embed a button, like so:

```html
<button onclick="SiteCrypt.logout()">Logout</button>
```

## How does it work?
When you build your site with SiteCrypt, all of the protected HTML content is encrypted based on a password that is run through a key derivation function, specifically [PBKDF2](https://en.wikipedia.org/wiki/PBKDF2) with [SHA-256](https://en.wikipedia.org/wiki/SHA-2), by default with 600k iterations, as [recommended by OWASP in 2023](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#pbkdf2).  This derived key is then use to symmetrically encrypt the HTML content using [AES](https://en.wikipedia.org/wiki/Advanced_Encryption_Standard) in [Galois/Counter Mode](https://en.wikipedia.org/wiki/Galois/Counter_Mode), aka AES-GCM, and the encrypted data is stored in embedded Javascript variables embedded within the page. If the correct password is provided, it is decrypted entirely in the browser and the page content is replaced with the decrypted content.  No decrypted data ever leaves the users' machine!

The password is stored in local session storage for the duration of the users' session such that they do not need to enter their password for every sub page.

## Is it secure?
### Short answer
**Yes**, as long as your password is strong and you protect your credentials and devices.

### Longer answer

There are really only three main attack vectors for decrypting the content encrypted with SiteCrypt, assuming that AES-GCM and PBKDF2 with SHA256 remain unbroken which is the case as of 2024 and is expected to be for the foreseeable future.

1. **Brute-forcing the password**

The password is derived with [PBKDF2](https://en.wikipedia.org/wiki/PBKDF2)-HMAC-[SHA-256](https://en.wikipedia.org/wiki/SHA-2), by default with 600k iterations, as [recommended by OWASP in 2023](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#pbkdf2).  This is considered a secure way to store passwords and provides resistance against brute-force attacks given the high computational cost of each "guess" due to the large number of iterations.  That said, if your password is weak (e.g. it is short, or is a dictionary word, or a common password) it will be much easier to brute-force.  A [strong, unique password](https://www.lastpass.com/features/password-generator) will be effectively impossible to brute-force.

2. **Stealing the key from local storage after decryption**

After a user logs into the site, to avoid them having to re-enter the password on every sub-page and every subseqeuent revisit to the site, the derived key is stored in local storage in the user's browser.  If this is accessible (e.g. if an attacked has physical access to the device on which the key is stored) then the key could be retrieved.  

However, bear in mind that this is the case for logging into more or less any online service.  The major (and important) difference is that the credentials cannot be revoked without redeploying the site with a different password, and even if that were the case, the encrypted content could have already be saved by an attacker.

3. **Compromising the password in some other way**

If someone gets the password, they can decrypt the content, assuming they have a copy of it.  Protect your credentials!

## License

[MIT](LICENSE)
