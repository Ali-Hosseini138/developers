import Link from 'next/link'
import { ArrowRight, ExternalLink, Info } from 'lucide-react'

function Code({ children }: { children: React.ReactNode }) {
  return <pre dir="ltr" className="overflow-x-auto rounded-xl bg-zinc-950 p-4 text-left text-sm leading-7 text-zinc-100"><code>{children}</code></pre>
}

export default function SsoIntegrationPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <Link href="/integrations" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="size-4" />
        بازگشت به راهنمای یکپارچه‌سازی
      </Link>

      <header className="mt-8">
        <p className="text-sm font-semibold text-primary">Netbox SSO</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">مراحل پیاده سازی ورود یکپارچه</h1>
        <p className="mt-4 leading-8 text-muted-foreground">
          SDK ورود یکپارچه نت‌باکس برای اپلیکیشن‌های شخص ثالث طراحی شده تا کاربر بتواند با حساب نت‌باکس وارد اپ شود و بدون ورود مجدد بین سرویس‌های متصل جابه‌جا شود. امکان ساخت دکمه ورود اختصاصی یا استفاده از LoginButton آماده نیز وجود دارد.
        </p>
      </header>

      <div className="mt-6 flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-7">
        <Info className="mt-1 size-4 shrink-0 text-primary" />
        <p>برای استفاده از Netbox SSO، اپلیکیشن شما باید در whitelist نت‌باکس قرار گرفته باشد.</p>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-bold">۱. اضافه کردن dependency</h2>
        <p className="mt-3 leading-8 text-muted-foreground">
          ابتدا dependency مربوط به SSO را به پروژه Android خود اضافه کنید. مستندات و مثال‌ها در repository زیر قرار دارند.
        </p>
        <a href="https://github.com/NetBox-Platform/sso" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          https://github.com/NetBox-Platform/sso
          <ExternalLink className="size-4" />
        </a>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">۲. شروع جریان ورود</h2>
        <p className="mt-3 leading-8 text-muted-foreground">
          بعد از فشردن دکمه “Login with netbox” در اپلیکیشن شما، SsoActivity اجرا می‌شود. در این مرحله نت‌باکس برای اعتبارسنجی اپلیکیشن، package name و apk signing public key را همراه اطلاعات کاربر بررسی می‌کند.
        </p>

        <div className="mt-5 rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold">Request</h3>
          <dl className="mt-4 grid gap-3 text-sm">
            <div><dt className="text-muted-foreground">method</dt><dd dir="ltr" className="mt-1 font-mono">POST</dd></div>
            <div><dt className="text-muted-foreground">url</dt><dd dir="ltr" className="mt-1 font-mono">api.netbox/**/sso-confirmation/</dd></div>
            <div><dt className="text-muted-foreground">headers</dt><dd dir="ltr" className="mt-1 font-mono">Content-Type: application/json<br />session-key: &lt;netbox-user-session-key&gt;</dd></div>
            <div><dt className="text-muted-foreground">payload</dt><dd dir="ltr" className="mt-1 font-mono">packageName: &lt;your-apk-package-name&gt;<br />publicKey: &lt;your apk public key SHA-256 digest&gt;</dd></div>
          </dl>
        </div>

        <p className="mt-4 rounded-xl bg-secondary/60 p-4 text-sm leading-7 text-muted-foreground">
          نکته: این API از سمت Netbox فراخوانی می‌شود و اپلیکیشن شما نیازی به فراخوانی مستقیم Netbox API ندارد. نتیجه در قالب Intent به اپ شما برگردانده می‌شود.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">۳. دریافت نتیجه از Intent</h2>
        <p className="mt-3 leading-8 text-muted-foreground">
          نتیجه ورود شامل شماره تلفن کاربر، status message، status code و signature است. نمونه‌های زیر بدون تغییر از مستند فنی نگه داشته شده‌اند.
        </p>

        <h3 className="mt-6 mb-2 font-semibold">Get user phone number</h3>
        <Code>{`resultIntent.getStringExtra(NetboxClient.PHONE_NUMBER_ARG_KEY)?.let {
Log.d("NetboxClient", "Phone number: $it")}`}</Code>

        <h3 className="mt-6 mb-2 font-semibold">Get status message</h3>
        <Code>{`resultIntent. getStringExtra(NetboxClient.STATUS_CODE_MESSAGE_ARG_KEY)?.let {
 Log.d("NetboxClient", "Status message: $it")}`}</Code>

        <h3 className="mt-6 mb-2 font-semibold">Get status code</h3>
        <Code>{`resultIntent.getIntExtra(NetboxClient.STATUS_CODE_ARG_KEY, -1).let {
 Log.d("NetboxClient", "Status code: $it")
 when (findSSOConfirmationStatusByCode(it)) {
 SSOConfirmationStatus.OK -> TODO()
 SSOConfirmationStatus.PACKAGE_NAME_NOT_FOUND -> TODO()
 SSOConfirmationStatus.PUBLIC_KEY_INVALID -> TODO()
 SSOConfirmationStatus.KID_PROFILE_NOT_ACCESS -> TODO()
 SSOConfirmationStatus.REGULAR_PROFILE_WITH_OUT_PHONE_NUMBER -> TODO()
 SSOConfirmationStatus.REJECT -> TODO()
 SSOConfirmationStatus.NOT_ACCESS -> TODO()
 SSOConfirmationStatus.BACK_PRESSED -> TODO()
 else -> TODO()
}
}`}</Code>

        <h3 className="mt-6 mb-2 font-semibold">Get the signature</h3>
        <Code>{`resultIntent.getStringExtra(NetboxClient.SIGNATURE_ARG_KEY)?.let {
 Log.d("NetboxClient", "signature: $it")
}`}</Code>

        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          signature یک JSON Web Token است که شامل username، packageName، issued_at time و expiration time می‌شود.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">۴. اعتبارسنجی token</h2>
        <p className="mt-3 leading-8 text-muted-foreground">
          بعد از دریافت signature، می‌توانید token را با کلید عمومی منتشرشده توسط نت‌استور اعتبارسنجی کنید.
        </p>
        <div className="mt-5 rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Request</p>
          <p dir="ltr" className="mt-2 font-mono text-sm">method: GET</p>
          <p dir="ltr" className="mt-1 break-all font-mono text-sm">url: https://netstore.net-box.ir/.well-known/jwks.json</p>
        </div>
        <h3 className="mt-6 mb-2 font-semibold">Response</h3>
        <Code>{`{
 "keys": [
  {
   "kty": "RSA",
   "n": "<public-key-modulus>",
   "e": "AQAB",
   "kid": "sso"
  }
 ]
}`}</Code>
      </section>

      <section className="mt-10 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xl font-bold">۵. ساخت یا شناسایی کاربر</h2>
        <p className="mt-3 leading-8 text-muted-foreground">
          بعد از اعتبارسنجی موفق token، می‌توانید با شماره تلفن دریافت‌شده کاربر را در سیستم خود ایجاد یا شناسایی کنید.
        </p>
      </section>
    </main>
  )
}
