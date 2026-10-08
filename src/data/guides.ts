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

export type GuideCategory = 'Buying guide' | 'Behind the scenes' | 'Refurbished' | 'Your rights' | 'Sustainability';

export type GuideBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'ul'; items: string[] };

export interface Guide {
  slug: string;
  title: string;
  summary: string;
  category: GuideCategory;
  readMinutes: number;
  publishedAt: string;
  /** Card tint on the home page. */
  accent: { from: string; to: string; ink: string };
  body: GuideBlock[];
}

const p = (text: string): GuideBlock => ({ type: 'p', text });
const h2 = (text: string): GuideBlock => ({ type: 'h2', text });
const ul = (...items: string[]): GuideBlock => ({ type: 'ul', items });

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
];

export function guideBySlug(slug: string | undefined): Guide | undefined {
  return GUIDES.find(g => g.slug === slug);
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
