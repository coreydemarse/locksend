# locksend

A simple, secure node.js endpoint for sending PGP encrypted emails 🔐🚀

SMTP_RECEIVERS requires an email provider that supports encryption, such as [protonmail](https://proton.me/mail)

### Deploy locksend as a simple & secure contact-me form HTTP POST endpoint

You can use locksend as a secure, quick email sending solution for your contact-me form on your personal website, splash pages, blogs or marketing lead pages  

locksend allows you to secure the emails being sent by your API to your inbox using PGP encryption. This increases the difficulty for bad actors to compromise the information being received and stored in your email mailbox.
   
locksend uses pino.js to log only errors and successful requests with no user data included such as ip addresses or message contents (by default)

optionally filter spam and bots using [hCaptcha](https://hcaptcha.com)

## Getting started

clone the repo

`git clone https://github.com/coreydemarse/locksend.git`

install dependencies

`yarn install`

create .env file 

```
SMTP_HOST=example.example.com // must be a TLS-capable host
SMTP_PORT=465
SMTP_USER=exampleuser
SMTP_PASS=examplepassword
SMTP_RECEIVERS=a@example.com
SITE_NAME=domainexample
API_PORT=3000 // port to run locksend on
ORIGIN=https://domainexample.com the domain origin you will be serving locksend from
CAPTCHA_ENABLED=false // enable hCaptcha
CAPTCHA_SECRET= // only required if CAPTCHA_ENABLED is set to true
```

### copy your PGP public key files to `./keys/`

rename your key file to publickey.asc

`./keys/publickey.asc`

### compile typescript

`tsc`

### run locksend

`yarn run locksend`

### run locksend in a docker container

`docker-compose up`

## Using locksend

You now have a secure mail endpoint for your contact form. Let's try it out:

```bash
curl --data "name=bob&email=bob@example.com&message=hello world" https://example.com/send
```
  
For best practices, use locksend behind a reverse-proxy like Caddy or NGINX with a valid SSL certificate  

## API

### POST /send

Sends an email.

#### Arguments:

Required:

 - `name:string` The name of the sender
 - `email:string` The return address of the sender
 - `message:string` The body of the email message

Optional (hCaptcha enabled):

 - `captcha:string` hCaptcha token