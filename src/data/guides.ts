/**
 * The LeHart blog: buying guides and explainers, shown on the home page, at
 * /guides, and each at /guides/:slug.
 *
 * Every factual claim here must be true of the shop or of phones generally.
 * The figures that describe LeHart (70 checks in five groups, the grades, the
 * 85% iPhone battery minimum, the 12-month warranty, the 14- and 30-day
 * rights) are the ones the product pages and Terms already state; keep them
 * in step if those change. Never add numbers about the business that nobody
 * has measured — that is a misleading claim, however readable.
 */

export type GuideCategory = 'Buying guide' | 'Behind the scenes' | 'Refurbished' | 'Your rights' | 'Sustainability' | 'Help & fixes' | 'New releases';

/**
 * A rail of LeHart products inside an article, each linking to its product
 * page. It matches the live catalogue the same way a home page row does
 * (brand, words the model must contain, words that rule it out), so it only
 * ever shows products that exist and are in stock.
 */
export interface GuideProductsBlock {
  type: 'products';
  title: string;
  brand: string;
  include: string[];
  exclude: string[];
  /** Where "See all" goes: a filtered product list. */
  href: string;
}

export type GuideBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'ul'; items: string[] }
  | GuideProductsBlock;

export interface Guide {
  slug: string;
  title: string;
  summary: string;
  category: GuideCategory;
  readMinutes: number;
  /**
   * The day it goes live (YYYY-MM-DD). A future date schedules the article:
   * it stays off the site, the home page and the sitemap until that day.
   */
  publishedAt: string;
  /** Card tint on the home page. */
  accent: { from: string; to: string; ink: string };
  body: GuideBlock[];
}

const p = (text: string): GuideBlock => ({ type: 'p', text });
const h2 = (text: string): GuideBlock => ({ type: 'h2', text });
const ul = (...items: string[]): GuideBlock => ({ type: 'ul', items });
const shop = (title: string, brand: string, include: string[], href: string, exclude: string[] = []): GuideBlock =>
  ({ type: 'products', title, brand, include, exclude, href });

export const GUIDES: Guide[] = [
  {
    slug: 'seventy-point-inspection',
    title: 'The 70-point inspection that decides whether a phone goes on sale',
    summary: 'Every device is checked across battery, display, cameras, connectivity and data before it is listed. Here is what each of the 70 checks is for.',
    category: 'Behind the scenes',
    readMinutes: 4,
    publishedAt: '2026-10-08',
    accent: { from: '#1a1f2c', to: '#2d3a52', ink: '#e8edf6' },
    body: [
      p('A refurbished phone is only as good as the checks it passed. Before a device is listed on LeHart, it goes through 70 checks in five groups. A device that fails one is repaired and checked again, or it does not go on sale.'),
      h2('Battery and power: 12 checks'),
      p('We measure the battery\'s capacity against when it was new, test charging, and check it holds up under load. iPhones must read at least 85% battery health to be sold; for other phones the reading is recorded for the unit.'),
      h2('Display and touch: 14 checks'),
      p('Every zone of the touchscreen is tested, including multi-touch. We look for dead or stuck pixels, check brightness and colour, and confirm features like True Tone or high refresh rates work where the model has them.'),
      h2('Cameras and sensors: 16 checks'),
      p('Each lens is checked for focus and image stabilisation, front and back. Face ID or the fingerprint sensor, the proximity and ambient-light sensors, speakers and microphones are all tested.'),
      h2('Connectivity and SIM: 10 checks'),
      p('Mobile data, Wi-Fi and Bluetooth are tested, the phone is confirmed network-unlocked, and the IMEI is checked so you are not buying a device reported lost or stolen.'),
      h2('Data and cleaning: 18 checks'),
      p('The previous owner\'s data is erased, account locks such as Find My or Google account protection are confirmed removed, and the device is cleaned and graded on its cosmetic condition.'),
      h2('What it means for you'),
      p('Every grade is fully working; the grade only describes how the phone looks. And because a test cannot promise the future, every device also carries our 12-month warranty.'),
    ],
  },
  {
    slug: 'battery-health',
    title: 'Battery health: what the percentage actually tells you',
    summary: 'What "battery health" measures, why 85% is our minimum for iPhones, and when a battery is worth replacing.',
    category: 'Buying guide',
    readMinutes: 4,
    publishedAt: '2026-10-08',
    accent: { from: '#0e3d5a', to: '#1a6c8e', ink: '#dff3fb' },
    body: [
      p('Battery health is the battery\'s maximum capacity compared with when it was new. A phone at 90% holds about nine-tenths of the charge it held out of the box. It is not how full the battery is right now.'),
      h2('Why it drops'),
      p('Lithium-ion batteries lose capacity a little with every charge cycle and with heat. The drop is gradual: a well-treated battery typically loses a few percent a year, faster if it is often run flat or kept hot.'),
      h2('Our minimum'),
      p('Every iPhone we sell reads at least 85% battery health. For Android phones, where the reading is not always available in the same way, we record it for the unit where we can, and the product page shows it.'),
      h2('What the numbers feel like'),
      ul(
        '90% and above: close to new for most people.',
        '85–89%: a full day for typical use; heavy users may top up in the evening.',
        'Below 80%: Apple\'s own threshold for recommending a service. We do not sell iPhones this low.',
      ),
      h2('Making it last'),
      ul(
        'Avoid leaving the phone in heat, such as on a car dashboard.',
        'You do not need to run it flat; topping up is fine.',
        'Use optimised or limited charging if your phone offers it.',
      ),
      p('If a battery fails because of a fault within 12 months, it is covered by our warranty.'),
    ],
  },
  {
    slug: 'refurb-grades',
    title: 'Pristine, Excellent, Good: what each grade means',
    summary: 'Every grade works perfectly. The grade describes how the phone looks, and here is exactly what you will see.',
    category: 'Buying guide',
    readMinutes: 3,
    publishedAt: '2026-10-08',
    accent: { from: '#3a2a52', to: '#5b3f7a', ink: '#efe5fa' },
    body: [
      p('Our grades describe cosmetic condition only. A Good phone passes the same 70 checks and carries the same 12-month warranty as a Pristine one. You are choosing how it looks, and paying less for marks you can live with.'),
      h2('Pristine'),
      p('No visible signs of use on the screen or the body. If you want something that looks new, this is it.'),
      h2('Excellent'),
      p('Light signs of use. The screen may have micro-scratches you cannot see from about 20 cm away. Most people put a case on it and never notice.'),
      h2('Good'),
      p('Visible signs of use, such as scratches or scuffs on the body. The screen may show light marks that do not affect use. The best value if the phone lives in a case.'),
      h2('Which should you pick?'),
      ul(
        'Buying a gift, or keeping it without a case: Pristine.',
        'Want it to look near-new for less: Excellent.',
        'Want the lowest price and use a case: Good.',
      ),
      p('Whatever the grade, if the phone is not as described you can reject it within 30 days, and you can change your mind within 14 days of delivery.'),
    ],
  },
  {
    slug: 'which-iphone',
    title: 'Which iPhone is right for you in 2026?',
    summary: 'Size, camera, battery and features across the iPhone 13 to 17 ranges, and where you can save without regretting it.',
    category: 'Buying guide',
    readMinutes: 5,
    publishedAt: '2026-10-08',
    accent: { from: '#1e3d5a', to: '#3a708e', ink: '#dff0fa' },
    body: [
      p('The right refurbished iPhone is usually not the newest one. Apple supports its phones with software updates for many years, so a two- or three-year-old model is often the best value.'),
      h2('iPhone 13 and 14: the budget pick'),
      p('Fast, reliable and well supported, with excellent cameras for everyday photos. They charge with Lightning rather than USB-C. Ideal if you want an iPhone for the lowest price.'),
      h2('iPhone 15: USB-C and the Dynamic Island'),
      p('The 15 range moved to USB-C, so one cable charges your phone, laptop and earbuds. The standard 15 gained the Dynamic Island and a 48 MP main camera. A strong middle ground.'),
      h2('iPhone 16: the Camera Control and Apple Intelligence'),
      p('Every iPhone 16, including the 16e, supports Apple Intelligence, and all but the 16e add the Camera Control button. If those features matter to you, start here; the iPhone 15 Pro also supports Apple Intelligence.'),
      h2('iPhone 17: the newest'),
      p('The standard iPhone 17 brings a smoother high-refresh-rate display, previously limited to the Pro models, and starts at 256 GB. Choose it if you want the longest support ahead.'),
      h2('Pro or not?'),
      p('Pro models add a telephoto camera, better low-light photos and, on most generations, a smoother display. If you mainly message, browse and take everyday photos, the standard model is enough. If you shoot a lot of photos or video, the Pro is worth it.'),
      h2('Size'),
      ul(
        'Smaller hands or one-handed use: the mini (13) or standard models.',
        'Bigger screen and battery: the Plus or Pro Max.',
      ),
      p('Not sure? Every grade is fully working and covered for 12 months, so choosing an older model or a lower grade only changes the price, not the reliability.'),
    ],
  },
  {
    slug: 'android-vs-ios',
    title: 'Android vs iOS: the practical comparison',
    summary: 'What actually changes day to day when you choose an ecosystem, and how easy it is to switch.',
    category: 'Buying guide',
    readMinutes: 4,
    publishedAt: '2026-10-08',
    accent: { from: '#1f4633', to: '#3a7a52', ink: '#e3f4e8' },
    body: [
      p('Both are excellent. The real question is which other devices you use and how much you like to customise.'),
      h2('Choose iPhone if…'),
      ul(
        'You use a Mac, iPad, Apple Watch or AirPods: they work together with almost no setup.',
        'Your family uses iMessage and FaceTime.',
        'You want long software support and resale value; older iPhones hold their value well.',
      ),
      h2('Choose Android if…'),
      ul(
        'You want more choice of shapes, sizes and prices, from Samsung, Google and others.',
        'You like to customise your home screen, default apps and settings.',
        'You use Windows or Google services heavily.',
      ),
      h2('Switching'),
      p('Moving from Android to iPhone, Apple\'s Move to iOS app transfers contacts, photos and messages. Moving the other way, Google and Samsung have their own transfer tools. Paid apps generally do not transfer between the two, and some chat histories need extra steps.'),
      h2('Software updates'),
      p('Recent Pixel and Samsung flagships come with long update promises, and iPhones are typically supported for many years. Check the model: an older budget Android phone may already be near the end of its updates.'),
    ],
  },
  {
    slug: 'refurbished-vs-new',
    title: 'Refurbished isn\'t a dirty word any more. It\'s the smart one.',
    summary: 'What you get, what you give up, and why a checked, warrantied refurbished phone is often the better buy.',
    category: 'Refurbished',
    readMinutes: 3,
    publishedAt: '2026-10-08',
    accent: { from: '#1f4633', to: '#3a7a52', ink: '#e3f4e8' },
    body: [
      p('A refurbished phone is a used phone that has been tested, fixed where needed, wiped and graded before it is sold again. Bought from a seller who stands behind it, it is a very different thing from a private second-hand sale.'),
      h2('What you get'),
      ul(
        'A lower price, often a large saving on the new price shown on each product.',
        'A phone that passed 70 checks, with its battery health stated.',
        'A 12-month warranty, plus your full legal rights as a consumer.',
        'A lower environmental cost, because no new phone was made.',
      ),
      h2('What you give up'),
      ul(
        'Some cosmetic wear, depending on the grade you choose.',
        'The very newest model, usually; refurbished stock is typically a generation or more behind.',
        'The original box and accessories, in most cases.',
      ),
      h2('How it compares with a private sale'),
      p('Buying from a person, you usually have no warranty, no inspection and limited comeback if something goes wrong. Buying from a shop, the Consumer Rights Act 2015 applies: the phone must be as described and fit for purpose, and you can change your mind within 14 days of delivery.'),
    ],
  },
  {
    slug: 'warranty-and-your-rights',
    title: 'Your 12-month warranty and your legal rights, explained',
    summary: 'What our warranty covers, what UK law gives you on top, and how to use either.',
    category: 'Your rights',
    readMinutes: 4,
    publishedAt: '2026-10-08',
    accent: { from: '#1f3a5b', to: '#3a5a8e', ink: '#e0eaf8' },
    body: [
      p('You have two sets of protection when you buy from us: your legal rights, which no shop can take away, and our 12-month warranty on top.'),
      h2('Changing your mind: 14 days'),
      p('Under the Consumer Contracts Regulations 2013 you can cancel for any reason within 14 days of the day you receive the phone, and we refund the price and standard delivery.'),
      h2('If it is faulty: your legal rights'),
      ul(
        'Within 30 days of delivery you can reject a faulty phone for a full refund.',
        'After that, we repair or replace it; if we cannot, you can claim a price reduction or refund.',
        'In the first 6 months, a fault is presumed to have been there at delivery unless we show otherwise.',
      ),
      h2('Our 12-month warranty'),
      p('Every device is covered against technical faults for 12 months from delivery. It does not cover accidental damage, liquid damage, or faults caused by third-party repairs or software changes.'),
      h2('How to make a claim'),
      p('Email us or start a return from your account. Tell us what is wrong and, if you can, include a photo or short video. Remember to back up your data and remove your account lock before sending the phone back.'),
    ],
  },
  {
    slug: 'data-wipe',
    title: 'How a refurbished phone is wiped, and what is left on it',
    summary: 'Why the previous owner\'s data is gone, how account locks are cleared, and what to do before you sell or return a phone.',
    category: 'Refurbished',
    readMinutes: 3,
    publishedAt: '2026-10-08',
    accent: { from: '#3a1f3a', to: '#6b3a6b', ink: '#f1dcef' },
    body: [
      p('Every phone we sell is erased before it is listed. Modern iPhones and Android phones encrypt everything stored on them; a full erase discards the encryption key, which leaves the old data unreadable.'),
      h2('Account locks'),
      p('Find My iPhone (Activation Lock) and Google\'s factory reset protection tie a phone to its owner\'s account. A phone with either still on cannot be set up by anyone else, so we confirm both are removed before a device goes on sale.'),
      h2('The IMEI check'),
      p('We also check each phone\'s IMEI, its unique identity number, so we do not sell a device that has been reported lost or stolen.'),
      h2('Selling or returning a phone yourself?'),
      ul(
        'Back up your photos, messages and contacts.',
        'Sign out of your Apple ID or Google account, which also turns off the account lock.',
        'Erase all content and settings from the phone\'s settings menu.',
        'Remove your SIM card and any memory card.',
      ),
    ],
  },
  {
    slug: 'first-time-buyer',
    title: 'A first-time refurbished buyer\'s four-question shortcut',
    summary: 'If the choice of models and grades feels overwhelming, answer these four questions and you will land on the right phone.',
    category: 'Buying guide',
    readMinutes: 3,
    publishedAt: '2026-10-08',
    accent: { from: '#1e3d5a', to: '#3a708e', ink: '#dff0fa' },
    body: [
      h2('1. iPhone or Android?'),
      p('If you already use Apple devices or iMessage, stay with iPhone. If you use Windows, Google services or want more choice, look at Samsung and Pixel. Our Android vs iOS guide goes deeper.'),
      h2('2. What is your budget?'),
      p('Set a number first. An older generation in a better grade often costs less than a newer one in a lower grade, and every option is fully working.'),
      h2('3. How much storage?'),
      p('Check how much your current phone uses in its settings, and allow room to grow. Photos and video take the most space; 128 GB suits most people, more if you shoot a lot of video.'),
      h2('4. How much does appearance matter?'),
      p('If it will live in a case, Good grade saves the most. If you want it to look new, choose Pristine. Excellent sits in between.'),
      p('Then check the battery health on the product page, and remember you have 14 days to change your mind after delivery.'),
    ],
  },
  {
    slug: 'refurbished-myths',
    title: 'Five myths about refurbished phones',
    summary: '"The battery is shot." "It\'s only cleaned." "There\'s no comeback." Here is what is actually true.',
    category: 'Refurbished',
    readMinutes: 3,
    publishedAt: '2026-10-08',
    accent: { from: '#1a1f2c', to: '#3a3f5b', ink: '#e8edf6' },
    body: [
      h2('"Refurbished just means cleaned"'),
      p('Not here. Each phone goes through 70 functional checks across battery, display, cameras, connectivity and data, and anything that fails is repaired or the phone is not sold.'),
      h2('"The battery will be worn out"'),
      p('Every iPhone we sell has at least 85% battery health, and the figure is shown for the unit you buy.'),
      h2('"It might still have someone else\'s data"'),
      p('Every device is fully erased and checked for account locks before it is listed.'),
      h2('"There\'s no comeback if it goes wrong"'),
      p('You get a 12-month warranty plus your full consumer rights, including 30 days to reject a faulty phone and 14 days to change your mind.'),
      h2('"It might be stolen"'),
      p('We check every phone\'s IMEI so we do not sell devices reported lost or stolen.'),
    ],
  },
  {
    slug: 'carbon-savings',
    title: 'Why a refurbished phone saves around 70 kg of CO₂',
    summary: 'Most of a phone\'s lifetime carbon is spent making it. Keeping one in use avoids most of that.',
    category: 'Sustainability',
    readMinutes: 3,
    publishedAt: '2026-10-08',
    accent: { from: '#173d2e', to: '#2c6648', ink: '#dceee2' },
    body: [
      p('Manufacturers\' own environmental reports show that most of a smartphone\'s lifetime carbon footprint comes from making it: mining the materials, producing the chips and assembling the phone. Charging and using it for years accounts for much less.'),
      p('So the greenest phone is usually the one that already exists. Buying refurbished instead of new avoids the manufacturing emissions of a new device, which we put at around 70 kg of CO₂ per phone, the figure we use across the site.'),
      h2('Beyond carbon'),
      p('A new phone also needs raw materials and water to produce. Extending the life of an existing phone keeps those resources in use rather than starting the cycle again.'),
      h2('What you can do'),
      ul(
        'Choose refurbished for your next phone.',
        'Keep your current phone longer: a new battery is far cheaper than a new phone.',
        'Recycle or trade in phones you no longer use instead of leaving them in a drawer.',
      ),
    ],
  },
  {
    slug: 'first-hour-checklist',
    title: 'Your refurbished phone has arrived: 9 checks for the first hour',
    summary: 'A short, practical checklist to run the day it arrives, while you are well inside your 30-day return window.',
    category: 'Help & fixes',
    readMinutes: 5,
    publishedAt: '2026-10-10',
    accent: { from: '#1f3b2d', to: '#2f6b4c', ink: '#e3f6ea' },
    body: [
      p('The commonest complaints about refurbished phones, across every seller, are the same handful: the condition is not what the grade suggested, the battery drains faster than expected, a camera or button misbehaves, or the phone will not work on the buyer\'s network. Almost all of them show up in the first hour of use. Running these checks on day one means anything wrong is found while it is quick and free to sort out.'),
      h2('1. Look at it in daylight'),
      p('Compare the body and screen with the grade you ordered. Every LeHart grade is fully working; the grade only describes how the phone looks. If the marks are worse than the grade describes, tell us.'),
      h2('2. Check the battery reading'),
      p('On an iPhone, go to Settings › Battery › Battery Health & Charging. Every iPhone we sell reads at least 85%. On Android the reading is not always shown in the same place; the product page records it for the unit where we can.'),
      h2('3. Test every camera'),
      p('Take a photo of a plain white wall or sheet of paper with each rear lens and the front camera. Spots, haze or a lens that will not focus show up clearly against white.'),
      h2('4. Test the screen'),
      p('Open a plain white page and a plain black one at full brightness. Look for dead pixels, faint marks or uneven patches. Then drag a finger slowly across every part of the screen in an app like Notes to check touch everywhere.'),
      h2('5. Put your SIM in and make a call'),
      p('Insert your SIM or add your eSIM, make a call, send a text and load a web page on mobile data with Wi-Fi off. Every phone we sell is network-unlocked.'),
      h2('6. Speakers, microphone and buttons'),
      p('Record a short voice memo and play it back, use speakerphone on a call, and press every button, including the volume rocker and the silent switch or Action button.'),
      h2('7. Face ID, Touch ID or fingerprint'),
      p('Set it up and use it a few times. Problems here usually show at setup, not weeks later.'),
      h2('8. On an iPhone, look at Parts and Service History'),
      p('Settings › General › About shows Parts and Service History when a part has been replaced. Our guide to the "unknown part" message explains what the entries mean.'),
      h2('9. Charge it to full'),
      p('Charge with a cable you trust and note how it holds up over the first full day. A new owner often uses a phone more on day one than any other day, so judge it on the second day.'),
      h2('If anything is wrong'),
      p('Contact us. You have 14 days to change your mind and 30 days to reject a faulty phone for a refund, and every phone carries our 12-month warranty after that.'),
      shop('Phones in stock now', '', [], '/products'),
    ],
  },
  {
    slug: 'iphone-unknown-part-message',
    title: '"Unknown part" or "Important battery message" on an iPhone: what it means',
    summary: 'Why some refurbished iPhones show a parts message, what it does and does not tell you, and how to check a phone\'s repair history yourself.',
    category: 'Help & fixes',
    readMinutes: 4,
    publishedAt: '2026-10-10',
    accent: { from: '#2a2440', to: '#4b3f78', ink: '#ece8fb' },
    body: [
      p('Since the iPhone XS, iOS notices when the battery, screen or camera has been replaced and records it. Depending on the part and who fitted it, you may see a notice such as "Important Battery Message" or "Unknown Part". It is one of the most searched worries about refurbished iPhones, so here is what it actually means.'),
      h2('What the message is'),
      p('It is a record that a part was changed, not a fault in itself. Apple lists the history in Settings › General › About › Parts and Service History. Parts Apple fitted, or genuine parts fitted using Apple\'s own repair process, are labelled "Genuine Apple Part". Others are labelled "Unknown Part".'),
      h2('What it changes in practice'),
      ul(
        'After a battery replacement that iOS cannot verify, the Battery Health percentage may not be shown.',
        'The notice appears on the lock screen for a few days after setup, then stays listed in Settings.',
        'It can affect what a buyer will pay if you sell the phone on later, because it is visible to them too.',
      ),
      h2('What it does not mean'),
      p('It does not mean the phone is unsafe or about to fail. It also does not prove the part is poor: the label is about how the part was fitted and paired, not how well it works. The reliable test is how the phone performs.'),
      h2('How we handle replaced parts'),
      p('Replacement parts in our devices are OEM originals or OEM-grade equivalents from certified suppliers, never counterfeit. Every phone passes the same 70 checks whatever was replaced, and every phone carries our 12-month warranty.'),
      h2('Want to know before you buy?'),
      p('Ask us about a specific unit before you buy. And if a message appears that you were not expecting, you have 30 days to return a phone you are not happy with.'),
      shop('iPhones in stock', 'Apple', ['iPhone'], '/products?brand=Apple'),
    ],
  },
  {
    slug: 'software-updates-how-long',
    title: 'How long will my phone get updates? iPhone, Galaxy and Pixel compared',
    summary: 'Security updates matter more than any spec. Here is how long each maker supports its phones, and which older models are nearly out of support.',
    category: 'Buying guide',
    readMinutes: 5,
    publishedAt: '2026-10-10',
    accent: { from: '#14324a', to: '#25587e', ink: '#dcecf8' },
    body: [
      p('A phone without security updates still works, but it becomes steadily riskier for banking, email and anything you log in to. When you buy refurbished, the date that matters most is not when the phone came out, but when its updates stop.'),
      h2('Google Pixel'),
      p('Pixel 8 and newer get seven years of Android and security updates, counted from when each model first went on sale. Older Pixels had shorter windows: Which? notes that support for the Pixel 6 ends in October 2026.'),
      shop('Pixels in stock', 'Google', ['Pixel'], '/products?brand=Google', ['Watch', 'Buds']),
      h2('Samsung Galaxy S'),
      p('The Galaxy S24, S25 and S26 families are promised seven years of security updates and seven Android upgrades. Earlier Galaxy S models had shorter promises, and Which? flags the Galaxy S21 as reaching the end of its security support in 2026. Galaxy A models usually get fewer years than the S range.'),
      shop('Galaxy S phones in stock', 'Samsung', ['Galaxy S'], '/products?brand=Samsung', ['Tab']),
      h2('iPhone'),
      p('Apple commits to at least five years of security updates for its iPhones, and in practice iPhones usually get new versions of iOS for longer than that. A recent iPhone bought refurbished today has years of support left.'),
      shop('Recent iPhones in stock', 'Apple', ['iPhone 15', 'iPhone 16', 'iPhone 17'], '/products?brand=Apple'),
      h2('How to use this when you choose'),
      ul(
        'If you keep a phone for four years or more, pick a model whose updates run at least that long.',
        'For banking and work apps, avoid models whose support ends within the next year.',
        'A newer mid-range phone often outlasts an older flagship on updates, and costs less.',
      ),
      p('Not sure which model fits? Ask us, and we will help you pick a model that will be supported for as long as you plan to keep it.'),
    ],
  },
  {
    slug: 'network-lock-imei-esim',
    title: 'Network locks, blacklisted IMEIs and eSIM: buying a used phone safely in the UK',
    summary: 'The three things that stop a second-hand phone working on your network, how to check each one, and what we check before a phone is sold.',
    category: 'Your rights',
    readMinutes: 5,
    publishedAt: '2026-10-10',
    accent: { from: '#3b2a1a', to: '#6e4b27', ink: '#f7ead9' },
    body: [
      p('"No service" on a new-to-you phone is one of the most frustrating problems a buyer can hit. It almost always comes down to one of three things: the phone is locked to another network, its IMEI has been blocked, or it is a model that does not suit UK networks.'),
      h2('1. Network lock'),
      p('A locked phone only works with the network that sold it. On an iPhone, Settings › General › About shows "No SIM restrictions" when it is unlocked. The simplest test is a SIM from a different network: a locked phone asks for an unlock code. Every phone we sell is network-unlocked.'),
      h2('2. Blocked (blacklisted) IMEI'),
      p('When a phone is reported lost or stolen, UK networks can block its IMEI, the number that identifies it. A blocked phone will not connect to any UK network, even unlocked. You can find the IMEI by dialling *#06#. We check every IMEI before a phone goes on sale, so you are not buying a device reported lost or stolen.'),
      h2('3. The right model for the UK'),
      p('A phone can be unlocked and still be a poor fit. iPhones sold in the USA from the iPhone 14 onwards have no SIM tray at all and work with eSIM only, and some models built for other regions miss mobile bands UK networks use. Check the model number if you buy anywhere other than a UK seller.'),
      h2('eSIM on a refurbished phone'),
      p('Refurbishment does not affect eSIM. If the model supports eSIM, your network can transfer or issue one in the usual way, from their app or by a QR code. If you are moving from an old phone, start the transfer with both phones to hand.'),
      h2('Account locks'),
      p('Find My iPhone and Google\'s factory reset protection tie a phone to its previous owner\'s account. We confirm both are removed before a phone is listed, so the phone sets up with your account and nobody else\'s.'),
      shop('Unlocked phones in stock', '', [], '/products'),
    ],
  },
  {
    slug: 'reading-reviews-refurbished',
    title: 'Reading reviews before you buy refurbished: what actually matters',
    summary: 'Star ratings hide the detail. Here is what to look for in Google and Trustpilot reviews of any refurbished seller, and the questions to ask before you buy.',
    category: 'Refurbished',
    readMinutes: 4,
    publishedAt: '2026-10-10',
    accent: { from: '#3a1f2b', to: '#6a3550', ink: '#f8e6ee' },
    body: [
      p('Reviews are the best free research you can do before buying a refurbished phone. Read across review sites and the same few complaints come up for many sellers: a phone that looked worse than its grade, a weak battery, slow delivery, and a hard time getting a fault fixed under warranty. Those are the things to look for.'),
      h2('Read the one- and two-star reviews'),
      p('Five-star reviews tell you deliveries usually go well. The low ones tell you what happens when something goes wrong, and that is when a seller earns its rating. Look at how the seller replied, and whether the problem was put right.'),
      h2('Look for the four patterns'),
      ul(
        'Condition: did the phone match its grade? Look for photos.',
        'Battery: did buyers get a reading, and was it what was promised?',
        'Delivery: did it arrive when the seller said?',
        'After-sales: were returns and warranty claims honoured without a fight?',
      ),
      h2('Check who you are buying from'),
      p('On marketplaces, the shop name on the page is often not the business that tested and ships the phone. Reviews of the marketplace may say little about the seller you actually get.'),
      h2('Questions worth asking any seller'),
      ul(
        'What is the minimum battery health, and is it shown for my unit?',
        'Has any part been replaced, and with what?',
        'How long is the warranty, and who handles a claim?',
        'Is the phone unlocked, and has the IMEI been checked?',
      ),
      h2('Our answers'),
      p('iPhones at least 85% battery health. Replacement parts OEM or OEM-grade from certified suppliers. 12-month warranty handled by us. Every phone unlocked and IMEI-checked. 14 days to change your mind and 30 days to reject a faulty phone. If you have bought from us, a review, good or bad, helps the next buyer decide.'),
      shop('Shop with those promises', '', [], '/products'),
    ],
  },
  {
    slug: 'paying-monthly-refurbished',
    title: 'Can I pay monthly for a refurbished phone? Pay in 3, credit and what to watch',
    summary: 'Buy now, pay later and phone finance explained plainly: what is a credit check, what is not, and how to avoid paying more than the phone is worth.',
    category: 'Your rights',
    readMinutes: 4,
    publishedAt: '2026-10-10',
    accent: { from: '#1f2c3a', to: '#384e66', ink: '#e4edf6' },
    body: [
      p('Spreading the cost of a phone is common, and many refurbished sellers offer it. Before you choose a plan anywhere, it helps to know what each type is and what it can cost you.'),
      h2('Pay in 3 and other buy now, pay later plans'),
      p('These split a purchase into a few payments, usually interest-free. They are still a form of credit: missing a payment can bring fees and can affect your credit record, and some providers run a soft credit check when you apply. Only use one if you are sure you can make every payment.'),
      h2('Longer finance'),
      p('Plans over 12 to 36 months may charge interest. Compare the total you will pay with the cash price. On a refurbished phone, a long plan can mean still paying when the phone is due for a battery or an upgrade.'),
      h2('Soft and hard credit checks'),
      p('A soft check lets a lender see whether you are likely to be accepted and does not affect your credit score. A hard check is recorded on your file. Ask which one applies before you apply.'),
      h2('How you can pay at LeHart'),
      p('We do not currently offer instalments, Klarna or Clearpay. You pay securely through PayPal or by debit or credit card, and the price you see is the full price: no plan, no interest, no extra fees. A refurbished phone already costs much less than new, which for many people removes the need to spread the cost at all.'),
      shop('Phones in stock', '', [], '/products'),
    ],
  },
  {
    slug: 'iphone-18-pro-or-refurbished-17-pro',
    title: 'iPhone 18 Pro is out: buy it new, or a refurbished iPhone 17 Pro?',
    summary: 'The iPhone 18 Pro starts at £1,199 new. Here is who should buy it, and who gets almost everything they want from a refurbished 17 Pro for far less.',
    category: 'New releases',
    readMinutes: 4,
    publishedAt: '2026-10-10',
    accent: { from: '#2b2118', to: '#5a4128', ink: '#f6ebdd' },
    body: [
      p('Apple announced the iPhone 18 Pro and Pro Max on 9 September 2026, and they went on sale in the UK on 18 September, from £1,199 for the 18 Pro and £1,299 for the 18 Pro Max. Every new iPhone launch is also the moment last year\'s Pro models become much better value.'),
      h2('Buy the 18 Pro new if'),
      ul(
        'You want the newest camera and chip and plan to keep the phone for five years or more.',
        'You use features that only the newest models support.',
        'You want the full Apple warranty from day one and are happy to pay for it.',
      ),
      h2('Choose a refurbished 17 Pro or 16 Pro if'),
      ul(
        'You want a Pro camera, a fast high-refresh-rate display and years of iOS updates for hundreds less.',
        'You are upgrading from an iPhone 13, 14 or older: the jump is huge either way.',
        'You would rather keep the difference in your pocket.',
      ),
      shop('iPhone 17 Pro and Pro Max in stock', 'Apple', ['iPhone 17 Pro'], '/products?brand=Apple'),
      shop('iPhone 16 Pro and Pro Max in stock', 'Apple', ['iPhone 16 Pro'], '/products?brand=Apple'),
      h2('Prefer the 18 Pro itself?'),
      p('We also stock refurbished iPhone 18 Pro and Pro Max when they come in, tested to the same 70 checks and covered for 12 months.'),
      shop('iPhone 18 Pro in stock', 'Apple', ['iPhone 18 Pro'], '/products?brand=Apple'),
    ],
  },
  {
    slug: 'galaxy-s26-or-refurbished-s25',
    title: 'Galaxy S26 or a refurbished Galaxy S25?',
    summary: 'The Galaxy S26 starts at £879 new. A refurbished S25 shares most of what matters, including seven years of promised updates, for much less.',
    category: 'New releases',
    readMinutes: 4,
    publishedAt: '2026-10-10',
    accent: { from: '#14223f', to: '#28407a', ink: '#e0e8fb' },
    body: [
      p('Samsung launched the Galaxy S26 range in February 2026, and it went on sale in the UK in March from £879 for the 256GB S26. The Galaxy S25 it replaced is now one of the best-value phones you can buy refurbished.'),
      h2('What the S25 keeps'),
      p('Samsung promises the S25 family the same seven years of security updates and seven Android upgrades as the S26, so a refurbished S25 bought today is supported well into the 2030s. It is still a flagship: bright, smooth screen, strong cameras and all-day battery for most people.'),
      shop('Galaxy S25 range in stock', 'Samsung', ['Galaxy S25'], '/products?brand=Samsung'),
      h2('Who should buy the S26'),
      ul(
        'You want the newest chip and camera processing.',
        'You want the longest possible support from today.',
        'You are buying on a contract anyway and want the newest model.',
      ),
      h2('Want even more value?'),
      p('The Galaxy S24 is also promised seven years of updates, and the S23 is still well supported. Both are excellent choices refurbished.'),
      shop('Galaxy S24 and S23 in stock', 'Samsung', ['Galaxy S24', 'Galaxy S23'], '/products?brand=Samsung'),
    ],
  },
  {
    slug: 'pixel-6-updates-ending',
    title: 'Pixel 6 updates end in October 2026: what to do next',
    summary: 'What end of support means for a Pixel 6 owner, how long you can keep using it safely, and the Pixels with years of updates left.',
    category: 'Help & fixes',
    readMinutes: 3,
    publishedAt: '2026-10-14',
    accent: { from: '#183a33', to: '#2c6a5d', ink: '#def5ef' },
    body: [
      p('Google\'s support for the Pixel 6, Pixel 6 Pro and Pixel 6a runs out in October 2026. After that, they stop receiving Android and security updates.'),
      h2('What changes'),
      p('Nothing stops working on the day. But each month without security fixes, the phone is more exposed to newly found weaknesses, and over time some banking and work apps stop supporting older Android versions.'),
      h2('What to do'),
      ul(
        'Keep it for light use for now, but avoid using it as your main phone for banking.',
        'Back up your photos and messages so you are ready to move.',
        'Choose a replacement with years of updates ahead: Pixel 8 and newer are promised seven years.',
      ),
      shop('Pixels with years of updates left', 'Google', ['Pixel 8', 'Pixel 9', 'Pixel 10'], '/products?brand=Google', ['Watch', 'Buds']),
      p('Moving from a Pixel 6 to a refurbished Pixel 8 or 9 is simple: Google\'s setup copies your apps, photos and messages across with a cable or over Wi-Fi.'),
    ],
  },
  {
    slug: 'which-ipad',
    title: 'Which refurbished iPad? School, work, drawing and everyday use',
    summary: 'iPad, iPad Air, iPad mini or iPad Pro: what each one is best at, and where a refurbished model saves the most.',
    category: 'Buying guide',
    readMinutes: 5,
    publishedAt: '2026-10-17',
    accent: { from: '#2b2f3a', to: '#4a5263', ink: '#eceff4' },
    body: [
      p('Most people need far less iPad than they think. For streaming, browsing, video calls and schoolwork, the standard iPad does it all. The other models are for specific jobs.'),
      h2('iPad: the everyday choice'),
      p('The best value for most homes and students. Pair it with a keyboard case and it handles essays and email comfortably.'),
      shop('iPads in stock', 'Apple', ['iPad'], '/products?category=tablets&brand=Apple', ['Air', 'mini', 'Pro']),
      h2('iPad Air: more power, lighter'),
      p('A step up in speed and screen, popular with students who take handwritten notes with Apple Pencil, and with anyone who edits photos.'),
      shop('iPad Air in stock', 'Apple', ['iPad Air'], '/products?category=tablets&brand=Apple'),
      h2('iPad mini: the one you carry everywhere'),
      p('Small enough for a coat pocket or one hand. Great for reading, travel and as a handheld notebook.'),
      shop('iPad mini in stock', 'Apple', ['iPad mini'], '/products?category=tablets&brand=Apple'),
      h2('iPad Pro: for creative work'),
      p('The best screen and the most power, for illustrators, video editors and people replacing a laptop. Overkill for watching TV.'),
      shop('iPad Pro in stock', 'Apple', ['iPad Pro'], '/products?category=tablets&brand=Apple'),
      h2('Before you buy'),
      ul(
        'Check which Apple Pencil works with the model you choose; they are not all interchangeable.',
        'Wi-Fi models suit most people; choose cellular only if you will use it away from Wi-Fi often.',
        'Choose more storage if you will download films or keep large photo libraries on it.',
      ),
    ],
  },
  {
    slug: 'which-apple-watch',
    title: 'Which refurbished Apple Watch: SE, Series or Ultra?',
    summary: 'The differences that matter day to day, which sizes fit which wrists, and why a refurbished watch is one of the smartest Apple buys.',
    category: 'Buying guide',
    readMinutes: 4,
    publishedAt: '2026-10-21',
    accent: { from: '#2e1c1c', to: '#5e3434', ink: '#f8e4e4' },
    body: [
      p('An Apple Watch needs an iPhone to set up, and the right model depends mostly on how much health tracking you want and how rough you are on it.'),
      h2('Apple Watch SE: the essentials'),
      p('Notifications, activity rings, workout tracking, fall detection and Apple Pay. The best value, and plenty for most first-time owners.'),
      shop('Apple Watch SE in stock', 'Apple', ['Watch SE'], '/products?category=watches&brand=Apple'),
      h2('Apple Watch Series: more health features'),
      p('Adds health sensors and an always-on display on most generations, so the time shows without lifting your wrist.'),
      shop('Apple Watch Series in stock', 'Apple', ['Watch Series'], '/products?category=watches&brand=Apple'),
      h2('Apple Watch Ultra: for the outdoors'),
      p('A bigger, tougher titanium case, the longest battery life and extra features for diving, hiking and endurance sport.'),
      shop('Apple Watch Ultra in stock', 'Apple', ['Watch Ultra'], '/products?category=watches&brand=Apple'),
      h2('Size and finish'),
      ul(
        'The smaller case suits smaller wrists and is lighter to sleep in; the larger one has a bigger screen and battery.',
        'Aluminium is lighter and cheaper; stainless steel and titanium are tougher and look dressier.',
        'Cellular models make calls without your iPhone nearby; most people do not need it.',
      ),
    ],
  },
  {
    slug: 'galaxy-tab-or-ipad',
    title: 'Galaxy Tab or iPad: which refurbished tablet suits you?',
    summary: 'If you already use an Android phone, a Galaxy Tab can be the easier and cheaper choice. Here is how the two compare in everyday use.',
    category: 'Buying guide',
    readMinutes: 4,
    publishedAt: '2026-10-24',
    accent: { from: '#152b3f', to: '#2a4e70', ink: '#deebf7' },
    body: [
      p('The best tablet for you usually depends on the phone already in your pocket. Messages, photos and passwords move across most easily when they match.'),
      h2('Choose a Galaxy Tab if'),
      ul(
        'You use an Android or Samsung phone.',
        'You want a memory card slot on many models for films and photos.',
        'You want the lowest price for a big, bright screen for streaming.',
      ),
      shop('Galaxy Tab in stock', 'Samsung', ['Tab'], '/products?category=tablets&brand=Samsung'),
      h2('Choose an iPad if'),
      ul(
        'You use an iPhone and want messages, photos and AirDrop to just work.',
        'You want the widest choice of tablet apps, especially for drawing and music.',
        'You want long software support: iPads are supported for many years.',
      ),
      shop('iPads in stock', 'Apple', ['iPad'], '/products?category=tablets&brand=Apple'),
      p('Either way, every tablet we sell passes the same checks as our phones and carries a 12-month warranty.'),
    ],
  },
];

/** Today in the UK, as YYYY-MM-DD: the day a scheduled article goes live. */
export function todayInUk(now: Date = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
}

/** The articles that are live, newest first (ties keep their listed order). */
export function publishedGuides(today: string = todayInUk()): Guide[] {
  return GUIDES
    .map((g, i) => ({ g, i }))
    .filter(({ g }) => g.publishedAt <= today)
    .sort((a, b) => b.g.publishedAt.localeCompare(a.g.publishedAt) || a.i - b.i)
    .map(({ g }) => g);
}

/** A live article by its slug; a scheduled one reads as not found until its day. */
export function guideBySlug(slug: string | undefined, today: string = todayInUk()): Guide | undefined {
  return GUIDES.find(g => g.slug === slug && g.publishedAt <= today);
}

/** Old links that used to point here, mapped to the article that replaced them. */
export const GUIDE_REDIRECTS: Record<string, string> = {
  'thirty-point-inspection': 'seventy-point-inspection',
  'battery-health-92-percent': 'battery-health',
  'pristine-excellent-good-fair': 'refurb-grades',
  'refurbished-not-a-dirty-word': 'refurbished-vs-new',
  'twelve-month-warranty-not-marketing': 'warranty-and-your-rights',
  'six-owners-of-memory': 'data-wipe',
  'first-time-buyer-decision-tree': 'first-time-buyer',
  'five-myths-busted-by-engineer': 'refurbished-myths',
  'pixel-7-saved-70kg-co2': 'carbon-savings',
};
