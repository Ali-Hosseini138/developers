import Link from 'next/link'
import { ArrowRight, ExternalLink, Info } from 'lucide-react'

function Code({ children }: { children: React.ReactNode }) {
  return <pre dir="ltr" className="overflow-x-auto rounded-xl bg-zinc-950 p-4 text-left text-sm leading-7 text-zinc-100"><code>{children}</code></pre>
}

function Param({ name, children }: { name: string; children: React.ReactNode }) {
  return <div className="rounded-xl border border-border bg-card p-4"><code dir="ltr" className="text-sm font-semibold text-primary">{name}</code><p className="mt-2 text-sm leading-7 text-muted-foreground">{children}</p></div>
}

export default function PaymentIntegrationPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <Link href="/integrations" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="size-4" />
        بازگشت به راهنمای یکپارچه‌سازی
      </Link>

      <header className="mt-8">
        <p className="text-sm font-semibold text-primary">Netbox Payment System</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">مراحل پیاده سازی خرید درون‌برنامه‌ای</h1>
        <p className="mt-4 leading-8 text-muted-foreground">
          Netbox Payment System یک SDK برای پیاده‌سازی پرداخت درون‌برنامه‌ای و صورتحساب در اپلیکیشن‌های شخص ثالث است. این سیستم از خرید اشتراک و خرید یک‌باره پشتیبانی می‌کند و پرداخت را از طریق سرویس‌های نت‌باکس انجام می‌دهد.
        </p>
      </header>

      <div className="mt-6 flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-7">
        <Info className="mt-1 size-4 shrink-0 text-primary" />
        <p>اپلیکیشن شما باید در whitelist نت‌باکس قرار داشته باشد و Netstore نیز روی دستگاه کاربر نصب و به نسخه موردنیاز به‌روزرسانی شده باشد.</p>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-bold">۱. اضافه کردن Payment SDK</h2>
        <p className="mt-3 leading-8 text-muted-foreground">
          dependency مربوط به PAYMENT را به پروژه Android اضافه کنید. مستندات و مثال‌ها در repository زیر قرار دارند.
        </p>
        <a href="https://github.com/NetBox-Platform/payment-sdk" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          https://github.com/NetBox-Platform/payment-sdk
          <ExternalLink className="size-4" />
        </a>

        <h3 className="mt-6 mb-2 font-semibold">بررسی نصب و نسخه Netstore</h3>
        <Code>{`/**
 * Checks the installation of the Netstore.
 */
if (!AppManager.isNetstoreInstalled(Context)) {
 // Netstore is not installed yet, so you can not use the netbox payment service
 return
}

/**
 * You can check for updates to the netstore that supports the payment service
 */
if (AppManager.shouldUpdateNetstore(Context, AppManager.MINIMUM_STORE_VERSION)) {
 // Show a dialog to the user to update the netstore
 AppManager.updateNetstore(Context)
 return
}`}</Code>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">۲. انتخاب روش یکپارچه‌سازی</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-semibold text-primary">Method 1</p>
            <h3 className="mt-1 font-bold">Display Shopping Items in Netstore</h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              با استفاده از <code dir="ltr">purchaseProductViaNetbox</code> محصولات مانند پلن‌های اشتراک در Netstore نمایش داده می‌شوند. لیست محصولات از API شما دریافت شده و کاربر می‌تواند با اعتبار نت‌باکس یا پرداخت آنلاین خرید کند.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-semibold text-primary">Method 2</p>
            <h3 className="mt-1 font-bold">In-App Product Selection and Purchase</h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              محصول داخل اپلیکیشن خودتان نمایش داده و انتخاب می‌شود؛ سپس با متد <code dir="ltr">purchaseProduct</code> فرایند خرید از طریق Netbox آغاز می‌شود.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">۳. نحوه انجام پرداخت</h2>
        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold">Online Payments</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              برای پرداخت آنلاین، یک WebSocket connection با server برقرار می‌شود. بعد از تکمیل خرید، اطلاعات transaction شامل purchase token، SKU، user ID و payload به server شما ارسال می‌شود. server شما transaction را پردازش و نتیجه را تأیید می‌کند؛ سپس WebSocket بسته شده و نتیجه به client برگردانده می‌شود.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold">Credit Payments</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              در خرید با اعتبار، server موجودی کاربر را بررسی می‌کند و اگر اعتبار کافی باشد transaction تکمیل شده و نتیجه به client ارسال می‌شود.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">۴. پارامترهای Method 1</h2>
        <p className="mt-2 text-sm text-muted-foreground"><code dir="ltr">purchaseProductViaNetbox</code></p>
        <div className="mt-5 grid gap-3">
          <Param name="userId">شناسه یکتای کاربر برای هماهنگی داده با APIهای شما. می‌تواند شماره تلفن، یک شناسه قابل اتصال به کاربر یا hash شماره تلفن باشد.</Param>
          <Param name="purchaseToken">token یکتای درخواست خرید برای verification. می‌تواند token دلخواه، token دارای expiration time یا order id شما باشد.</Param>
          <Param name="identifier">مقداری که در UI خرید به کاربر نمایش داده می‌شود؛ مانند masked phone number یا email. مثال: <span dir="ltr">0912xxx6789</span></Param>
          <Param name="payload">یک string تصادفی برای شناسایی request که با key به نام <code dir="ltr">payload</code> برگردانده می‌شود. مثال: <code dir="ltr">my-payload</code> یا <code dir="ltr">payload_1520</code>.</Param>
          <Param name="callback">callback دریافت نتیجه عملیات خرید. پس از موفقیت یا شکست، اطلاعات لازم مانند دلیل failure را برمی‌گرداند تا UI اپلیکیشن به‌روزرسانی شود.</Param>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">۵. پارامترهای Method 2</h2>
        <p className="mt-2 text-sm text-muted-foreground"><code dir="ltr">purchaseProduct</code></p>
        <div className="mt-5 grid gap-3">
          <Param name="sourceSku">SKU محصولی که قرار است خریداری شود؛ مانند <code dir="ltr">plan-3-months</code> یا <code dir="ltr">filmland-plan2</code>.</Param>
          <Param name="userId">شناسه یکتای کاربر؛ می‌تواند شماره تلفن، شناسه داخلی یا hash شماره تلفن باشد.</Param>
          <Param name="purchaseToken">token یکتای request برای verification یا شناسایی transaction.</Param>
          <Param name="identifier">مقداری برای نمایش در purchase page/UI؛ مانند masked phone number یا email.</Param>
          <Param name="payload">string شناسایی request که در نتیجه برگردانده می‌شود.</Param>
          <Param name="callback">callback نتیجه خرید برای success یا failure.</Param>
          <Param name="price">قیمت کل محصول به تومان، شامل VAT.</Param>
          <Param name="discount">مقدار تخفیف این کاربر به تومان.</Param>
          <Param name="productType"><code dir="ltr">ir.net_box.paymentclient.payment.ProductType.SUBSCRIPTION</code></Param>
          <Param name="titleFa">عنوان فارسی محصول و الزامی است.</Param>
          <Param name="titleEn">عنوان انگلیسی محصول؛ اختیاری اما برای پشتیبانی چندزبانه strongly recommended است.</Param>
          <Param name="titleAr">عنوان عربی محصول؛ برای کاربرانی با Arabic locale پیشنهاد می‌شود.</Param>
          <Param name="titleTr">عنوان ترکی محصول؛ برای نمایش صحیح عنوان بر اساس app locale پیشنهاد می‌شود.</Param>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">۶. فرایند Backend بعد از شروع خرید</h2>
        <ol className="mt-5 space-y-4">
          <li className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold">۱. Order Creation and Link Generation</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Netstore اطلاعات لازم مانند product SKU، user information و purchase token را برای Netbox server می‌فرستد. server یک order ایجاد می‌کند و لینک خرید تولید می‌شود. در این مرحله transaction با وضعیت <code dir="ltr">PENDING</code> ثبت می‌شود.
            </p>
          </li>
          <li className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold">۲. Successful Payment</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              در صورت موفقیت پرداخت، Netbox server، API مربوط به <code dir="ltr">subscription/provisioning</code> شما را با اطلاعاتی مانند user ID و purchase token فراخوانی می‌کند. اگر پاسخ شما موفق باشد transaction با وضعیت <code dir="ltr">SUCCESS</code> ثبت شده و success callback برای SDK ارسال می‌شود؛ در صورت پاسخ ناموفق، وضعیت <code dir="ltr">FAILED</code> خواهد بود.
            </p>
          </li>
          <li className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold">۳. Failed Payment</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              اگر کاربر پرداخت را تکمیل نکند، پرداخت decline شود یا فرایند را cancel کند، transaction با وضعیت <code dir="ltr">FAILED</code> ثبت می‌شود و failure callback از طریق SDK ارسال خواهد شد.
            </p>
          </li>
        </ol>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">۷. APIهای موردنیاز برای Integration</h2>
        <div className="mt-5 grid gap-4">
          <div className="rounded-xl border border-border bg-card p-5"><h3 className="font-semibold">Plans List API (Required)</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">لیست پلن‌های قابل خرید درون‌برنامه‌ای مانند گزینه‌های اشتراک و اطلاعات محصول را ارائه می‌کند.</p></div>
          <div className="rounded-xl border border-border bg-card p-5"><h3 className="font-semibold">Subscription Provisioning API (Required)</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">بعد از transaction موفق، خرید اشتراک را پردازش و پلن انتخاب‌شده را برای کاربر فعال می‌کند.</p></div>
          <div className="rounded-xl border border-border bg-card p-5"><h3 className="font-semibold">Subscription Status API</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">وضعیت فعلی اشتراک کاربر را برای بررسی دسترسی یا eligibility سرویس برمی‌گرداند.</p></div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">۸. ساختار Plans List API</h2>
        <p className="mt-3 leading-8 text-muted-foreground">
          Plans List API باید لیست پلن‌های محصول را همراه اطلاعات ضروری زیر برگرداند. مستندات API شامل success result و errors نیز باید ارائه شود.
        </p>
        <div className="mt-5 grid gap-3">
          <Param name="id (string)">شناسه یکتای plan.</Param>
          <Param name="title (object)">نام localized پلن.</Param>
          <Param name="fee (object)">اطلاعات قیمت شامل base price، VAT و currency symbol.</Param>
          <Param name="discount (object)">اطلاعات تخفیف شامل percentage، amount و display text.</Param>
        </div>

        <h3 className="mt-6 mb-2 font-semibold">Example Result</h3>
        <Code>{`{
  "status": true,
  "data": [
    {
      "id": "1",
      "title": {
        "main": "یک ماهه"
      },
      "fee": {
        "main": 165000,
        "vat": 16500,
        "currency_symbol": "تومان"
      },
      "discount": {
        "percent": 15,
        "text": "15% تخفیف",
        "main": 24750
      }
    },
    {
      "id": "4",
      "title": {
        "main": "سه ماهه"
      },
      "fee": {
        "main": 396000,
        "vat": 39600,
        "currency_symbol": "تومان"
      },
      "discount": {
        "percent": 20,
        "text": "ماهانه 132 هزار تومان",
        "main": 79200
      }
    },
    {
      "id": "13",
      "title": {
        "main": "شش ماهه"
      },
      "fee": {
        "main": 693000,
        "vat": 69300,
        "currency_symbol": "تومان"
      },
      "discount": {
        "percent": 30,
        "text": "ماهانه 132 هزار تومان",
        "main": 207900
      }
    }
  ]
}`}</Code>
      </section>
    </main>
  )
}
