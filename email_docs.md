# Email Setup

Base Suite includes email capabilities for sending emails to users, and admins.

There are three types of emails:

- Admin emails: sent to a static admin email address, useful for monitoring app activity like new signups and contact-us form submissions.
- User emails: sent to the user's email address. For example: a welcome email.
- Auth emails: verifing the user's email address and magic links. Auth emails are covered in the main README setup docs, and not covered here.

## Set Up Email

To enable email capabilities, set the following environment variables:

**Important**: The template includes a welcome email, which will be enabled once you set your Resend API key. You should customize the email to fit your brand and content or remove it **BEFORE** you enable the email with environment variables. See below.

- `PRIVATE_RESEND_API_KEY`: a https://resend.com API key. Note, you'll need to verify your 'from' domain with them before you can use their service.
- `PRIVATE_ADMIN_EMAIL`: the email address to which admin emails will be sent. If unset, admin emails will not be sent.
  - `PRIVATE_FROM_ADMIN_EMAIL`: the email address to use as the from address for admin emails (defaults to `PRIVATE_ADMIN_EMAIL` if not set).

## Templates, sending and the log

Admin -> Email (admins only) has three tabs:

- Sent mail: every email the site sends, kept for 90 days, with its status (sent, failed, skipped), the error and the plain text body. Sign-in and password reset bodies are never kept, because they carry a login link.
- Templates: the built-in emails can be customized here without a code change, and reset to the file version. You can also add your own, or install them with an extension (see docs/EXTENDING.md, "Example: installing the Emailer package").
- Send an email: send any template except the sign-in and reset emails to up to 10 addresses.

A template saved in the admin wins over the file in src/lib/emails with the same name. In a customized built-in, `{{subject}}` is the subject the site would normally use.

Without `PRIVATE_RESEND_API_KEY`, nothing is sent and each attempt is logged as skipped.

## Customize Welcome Email

Base Suite includes a welcome email template that you can customize to fit your brand and content. The email is sent to the user's email address when create their profile.

To customize the email:

- edit the properties like company name, from email, and subject in the call to sendTemplatedEmail in src/routes/(admin)/account/api/+page.server.ts
- edit the plaintext email content in src/lib/emails/welcome_email_text.hbs
- edit the html email content in src/lib/emails/welcome_email_html.hbs - don't forget address and preheader text which won't render in a preview, but will in the client's email client.

**Note**: use triple braces for properties in plaintext emails, and double braces for html emails. See the [handlebars documentation](https://handlebarsjs.com/guide/expressions.html#html-escaping) for more information.

You can also delete the welcome email by removing the call to sendTemplatedEmail in src/routes/(admin)/account/api/+page.server.ts

## Adding Admin Emails

Anywhere you'd like to be notified of important events, you can sendan admin email.

Simply add a call to sendAdminEmail() in the appropriate place, passing a subject and body.

## Adding Additional User Emails

You can add more user emails. Create a template in src/lib/emails, using the welcome email as a guide. You should have both a plaintext and html version of the email (see welcome_email_text.hbs and welcome_email_html.hbs for examples), although it will work with just one.

When you want to send the email, call sendUserEmail() with the appropriate parameters, including the name of the email template.

You can also use sendTemplatedEmail() to send emails to any email address.
