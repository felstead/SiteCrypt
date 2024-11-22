# SiteCrypt

Password protect static sites purely on the client side - no backend required!

> TODO: Add example

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
        <footer>
          <p>&copy; 2024 - Definitely Not World Domination Inc.</p>
        </footer>
      </body>
    </html>
```



## License

[MIT](LICENSE)
