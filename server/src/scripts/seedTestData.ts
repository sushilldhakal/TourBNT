import bcrypt from 'bcrypt';
import { config as dotenvConfig } from 'dotenv';
import path from 'path';
import {
  db,
  users,
  globalCategories,
  globalDestinations,
  facts,
  faqs,
  tours,
  tourCategories,
  tourAuthors,
  reviews,
  reviewReplies,
  posts,
  comments,
} from '@tourbnt/db';
import { sql } from 'drizzle-orm';

dotenvConfig({ path: path.resolve(__dirname, '../../.env') });

/**
 * One-shot demo dataset: sellers, categories, destinations, three fully
 * populated tours, reviews, and a couple of blog posts with comments.
 * Meant for a Neon dev branch, not production — see the DATABASE_URL this
 * process actually connects to before running.
 */
async function seed() {
  const PASSWORD_HASH = await bcrypt.hash('TestPass123!', 10);
  console.log('Seeding against:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'));

  // ---------------------------------------------------------------------
  // Users: two sellers, three end users
  // ---------------------------------------------------------------------
  const [sellerAlpine, sellerHimalaya, customerAmy, customerBen, customerChloe] = await db
    .insert(users)
    .values([
      {
        name: 'Alpine Trails Co.',
        email: 'seller.alpine@example.com',
        password: PASSWORD_HASH,
        role: 'seller',
        verified: true,
        phone: '+61-400-111-222',
        avatar: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=256&h=256&fit=crop',
        sellerInfo: {
          companyName: 'Alpine Trails Co.',
          category: ['adventure', 'trekking'],
          isApproved: true,
          bio: 'Boutique trekking operator running small-group treks across the Himalayas and the Alps since 2012.',
          yearsOfExperience: 12,
          website: 'https://alpinetrails.example.com',
        },
      },
      {
        name: 'Himalaya Journeys',
        email: 'seller.himalaya@example.com',
        password: PASSWORD_HASH,
        role: 'seller',
        verified: true,
        phone: '+61-400-333-444',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=256&h=256&fit=crop',
        sellerInfo: {
          companyName: 'Himalaya Journeys',
          category: ['cultural', 'wildlife'],
          isApproved: true,
          bio: 'Locally owned tour operator based in Kathmandu, specializing in cultural tours and wildlife safaris across Nepal.',
          yearsOfExperience: 8,
          website: 'https://himalayajourneys.example.com',
        },
      },
      {
        name: 'Amy Chen',
        email: 'customer.amy@example.com',
        password: PASSWORD_HASH,
        role: 'user',
        verified: true,
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=256&h=256&fit=crop',
      },
      {
        name: 'Ben Okafor',
        email: 'customer.ben@example.com',
        password: PASSWORD_HASH,
        role: 'user',
        verified: true,
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=256&h=256&fit=crop',
      },
      {
        name: 'Chloe Martin',
        email: 'customer.chloe@example.com',
        password: PASSWORD_HASH,
        role: 'user',
        verified: true,
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=256&h=256&fit=crop',
      },
    ])
    .returning();
  console.log('✅ Users:', [sellerAlpine, sellerHimalaya, customerAmy, customerBen, customerChloe].map((u) => u.email).join(', '));

  // ---------------------------------------------------------------------
  // Global categories (approved)
  // ---------------------------------------------------------------------
  const [catTrekking, catCultural, catWildlife] = await db
    .insert(globalCategories)
    .values([
      {
        name: 'Trekking & Hiking',
        description: 'Multi-day treks and day hikes through mountains, hills, and national parks.',
        imageUrl: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&h=600&fit=crop',
        slug: 'trekking-hiking',
        isApproved: true,
        approvalStatus: 'approved',
        createdBy: sellerAlpine.id,
        approvedBy: sellerAlpine.id,
        approvedAt: new Date(),
        popularity: 87,
        usageCount: 2,
        metadata: { keywords: ['trek', 'hike', 'mountain'] },
      },
      {
        name: 'Cultural Tours',
        description: 'Guided tours through historic sites, temples, and local communities.',
        imageUrl: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=600&fit=crop',
        slug: 'cultural-tours',
        isApproved: true,
        approvalStatus: 'approved',
        createdBy: sellerHimalaya.id,
        approvedBy: sellerHimalaya.id,
        approvedAt: new Date(),
        popularity: 64,
        usageCount: 1,
        metadata: { keywords: ['culture', 'heritage', 'temple'] },
      },
      {
        name: 'Wildlife Safari',
        description: 'Jungle safaris and wildlife spotting tours in national parks and reserves.',
        imageUrl: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&h=600&fit=crop',
        slug: 'wildlife-safari',
        isApproved: true,
        approvalStatus: 'approved',
        createdBy: sellerHimalaya.id,
        approvedBy: sellerHimalaya.id,
        approvedAt: new Date(),
        popularity: 41,
        usageCount: 1,
        metadata: { keywords: ['wildlife', 'safari', 'jungle'] },
      },
    ])
    .returning();
  console.log('✅ Categories:', [catTrekking, catCultural, catWildlife].map((c) => c.name).join(', '));

  // ---------------------------------------------------------------------
  // Global destinations (approved)
  // ---------------------------------------------------------------------
  const [destEverest, destKathmandu, destChitwan] = await db
    .insert(globalDestinations)
    .values([
      {
        name: 'Everest Region',
        description: 'Home to the world’s highest peak, Sherpa villages, and the iconic Everest Base Camp trek.',
        coverImage: 'https://images.unsplash.com/photo-1544198365-f5d60b6d8190?w=1200&h=800&fit=crop',
        country: 'Nepal',
        region: 'Province No. 1',
        city: 'Namche Bazaar',
        latitude: 27.9881,
        longitude: 86.925,
        isActive: true,
        isApproved: true,
        approvalStatus: 'approved',
        createdBy: sellerAlpine.id,
        approvedBy: sellerAlpine.id,
        approvedAt: new Date(),
        popularity: 92,
        usageCount: 1,
        sellerCount: 1,
        metadata: { timezone: 'Asia/Kathmandu', currency: 'NPR', bestTimeToVisit: ['March-May', 'Sept-Nov'] },
      },
      {
        name: 'Kathmandu Valley',
        description: 'UNESCO World Heritage temples, palaces, and vibrant local markets in Nepal’s capital.',
        coverImage: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=1200&h=800&fit=crop',
        country: 'Nepal',
        region: 'Bagmati',
        city: 'Kathmandu',
        latitude: 27.7172,
        longitude: 85.324,
        isActive: true,
        isApproved: true,
        approvalStatus: 'approved',
        createdBy: sellerHimalaya.id,
        approvedBy: sellerHimalaya.id,
        approvedAt: new Date(),
        popularity: 78,
        usageCount: 1,
        sellerCount: 1,
        metadata: { timezone: 'Asia/Kathmandu', currency: 'NPR', bestTimeToVisit: ['Oct-Dec'] },
      },
      {
        name: 'Chitwan National Park',
        description: 'Lowland jungle famous for one-horned rhinos, Bengal tigers, and elephant-back safaris.',
        coverImage: 'https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=1200&h=800&fit=crop',
        country: 'Nepal',
        region: 'Bagmati',
        city: 'Sauraha',
        latitude: 27.5291,
        longitude: 84.3542,
        isActive: true,
        isApproved: true,
        approvalStatus: 'approved',
        createdBy: sellerHimalaya.id,
        approvedBy: sellerHimalaya.id,
        approvedAt: new Date(),
        popularity: 55,
        usageCount: 1,
        sellerCount: 1,
        metadata: { timezone: 'Asia/Kathmandu', currency: 'NPR', bestTimeToVisit: ['Oct-Mar'] },
      },
    ])
    .returning();
  console.log('✅ Destinations:', [destEverest, destKathmandu, destChitwan].map((d) => d.name).join(', '));

  // ---------------------------------------------------------------------
  // Facts & FAQs (owned by sellerAlpine, reused across tours)
  // ---------------------------------------------------------------------
  const [factDifficulty, factAltitude, factGroupType, factBestSeason] = await db
    .insert(facts)
    .values([
      { userId: sellerAlpine.id, name: 'Difficulty', fieldType: 'Single Select', value: ['Moderate'], icon: 'fa/FaMountain' },
      { userId: sellerAlpine.id, name: 'Max Altitude', fieldType: 'Plain Text', value: ['5,364 m'], icon: 'fa/FaChartLine' },
      { userId: sellerAlpine.id, name: 'Group Type', fieldType: 'Multi Select', value: ['Solo', 'Family', 'Group'], icon: 'fa/FaUsers' },
      { userId: sellerAlpine.id, name: 'Best Season', fieldType: 'Multi Select', value: ['Spring', 'Autumn'], icon: 'fa/FaSun' },
    ])
    .returning();

  const [faqRefund, faqFitness, faqPermit] = await db
    .insert(faqs)
    .values([
      { userId: sellerAlpine.id, question: 'What is your cancellation policy?', answer: 'Full refund up to 30 days before departure, 50% refund up to 14 days before, no refund within 14 days of departure.' },
      { userId: sellerAlpine.id, question: 'Do I need to be very fit to join this trip?', answer: 'A moderate level of fitness is recommended. We suggest a few weeks of hiking or cardio training before departure, especially for high-altitude itineraries.' },
      { userId: sellerAlpine.id, question: 'Are permits included in the price?', answer: 'Yes, all national park entry fees and trekking permits (TIMS, national park fees) are included in the tour price.' },
    ])
    .returning();
  console.log('✅ Facts & FAQs created');

  // ---------------------------------------------------------------------
  // Tours — three fully populated tours
  // ---------------------------------------------------------------------
  const richDoc = (text: string) => ({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  });

  const tourInputs = [
    {
      title: 'Everest Base Camp Trek',
      code: 'EBC-14D-001',
      excerpt: 'A classic 14-day trek to the foot of the world’s highest mountain, through Sherpa villages and dramatic Himalayan scenery.',
      description: richDoc(
        'Trek through the Khumbu region to Everest Base Camp, passing through Namche Bazaar, Tengboche Monastery, and Gorak Shep. This 14-day adventure includes acclimatization days, experienced Sherpa guides, and unforgettable views of Everest, Lhotse, and Ama Dablam.'
      ),
      destinationId: destEverest.id,
      sellerId: sellerAlpine.id,
      categoryId: catTrekking.id,
      coverImage: 'https://images.unsplash.com/photo-1544198365-f5d60b6d8190?w=1600&h=900&fit=crop',
      price: 1850,
      salePrice: 1650,
      saleEnabled: true,
      minSize: 1,
      maxSize: 12,
      isSpecialOffer: true,
      days: 14,
      nights: 13,
      itineraryDays: [
        { title: 'Arrival in Kathmandu', description: 'Airport pickup, welcome briefing, and gear check at the hotel.' },
        { title: 'Fly to Lukla, trek to Phakding', description: 'Scenic mountain flight followed by an easy first trekking day.' },
        { title: 'Trek to Namche Bazaar', description: 'Cross suspension bridges and climb to the Sherpa capital.' },
        { title: 'Acclimatization day in Namche', description: 'Short hike to Everest View Hotel for altitude adjustment.' },
        { title: 'Trek to Tengboche', description: 'Visit the famous Tengboche Monastery with Ama Dablam views.' },
        { title: 'Trek to Dingboche', description: 'Enter the high alpine landscape of the upper Khumbu.' },
        { title: 'Acclimatization day in Dingboche', description: 'Optional hike up Nangkartshang Peak for panoramic views.' },
        { title: 'Trek to Lobuche', description: 'Walk past the Khumbu Glacier memorials for fallen climbers.' },
        { title: 'Trek to Gorak Shep, visit Everest Base Camp', description: 'Reach base camp and see the Khumbu Icefall up close.' },
        { title: 'Hike Kala Patthar, trek to Pheriche', description: 'Sunrise views of Everest from the region’s best viewpoint.' },
        { title: 'Trek to Namche Bazaar', description: 'Descend through rhododendron forests back toward Namche.' },
        { title: 'Trek to Lukla', description: 'Final trekking day back to the mountain airstrip.' },
        { title: 'Fly to Kathmandu', description: 'Morning flight back to Kathmandu, free afternoon.' },
        { title: 'Departure', description: 'Airport transfer and departure.' },
      ],
    },
    {
      title: 'Kathmandu Cultural Heritage Tour',
      code: 'KTM-4D-002',
      excerpt: 'A 4-day immersion into Kathmandu Valley’s UNESCO World Heritage temples, palaces, and living traditions.',
      description: richDoc(
        'Explore Kathmandu Durbar Square, the sacred Pashupatinath Temple, the Boudhanath Stupa, and the medieval city of Bhaktapur on this culturally rich four-day tour, led by expert local historians.'
      ),
      destinationId: destKathmandu.id,
      sellerId: sellerHimalaya.id,
      categoryId: catCultural.id,
      coverImage: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=1600&h=900&fit=crop',
      price: 420,
      salePrice: null,
      saleEnabled: false,
      minSize: 2,
      maxSize: 20,
      isSpecialOffer: false,
      days: 4,
      nights: 3,
      itineraryDays: [
        { title: 'Kathmandu Durbar Square', description: 'Explore the old royal palace complex and its ancient temples.' },
        { title: 'Pashupatinath & Boudhanath', description: 'Visit the holiest Hindu temple in Nepal and the largest stupa in Asia.' },
        { title: 'Bhaktapur Day Trip', description: 'Wander the medieval streets and pottery squares of Bhaktapur.' },
        { title: 'Swayambhunath & Departure', description: 'Morning visit to the Monkey Temple before departure.' },
      ],
    },
    {
      title: 'Chitwan Jungle Safari',
      code: 'CTN-3D-003',
      excerpt: 'A 3-day wildlife safari through Chitwan National Park, home to rhinos, tigers, and over 500 bird species.',
      description: richDoc(
        'Spot one-horned rhinos, spotted deer, and (with luck) Bengal tigers on jeep and canoe safaris through Chitwan National Park, staying at a jungle lodge on the edge of the park.'
      ),
      destinationId: destChitwan.id,
      sellerId: sellerHimalaya.id,
      categoryId: catWildlife.id,
      coverImage: 'https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=1600&h=900&fit=crop',
      price: 310,
      salePrice: 279,
      saleEnabled: true,
      minSize: 1,
      maxSize: 15,
      isSpecialOffer: false,
      days: 3,
      nights: 2,
      itineraryDays: [
        { title: 'Arrival & Village Walk', description: 'Arrive at the jungle lodge, afternoon Tharu village walking tour.' },
        { title: 'Jeep Safari & Canoe Ride', description: 'Full-day jeep safari through the park plus a canoe ride on the Rapti River.' },
        { title: 'Bird Watching & Departure', description: 'Morning bird-watching walk, then transfer back to Kathmandu or Pokhara.' },
      ],
    },
  ];

  const createdTours: (typeof tours.$inferSelect)[] = [];

  for (const t of tourInputs) {
    const [tour] = await db
      .insert(tours)
      .values({
        title: t.title,
        code: t.code,
        description: JSON.stringify(t.description),
        excerpt: t.excerpt,
        tourStatus: 'Published',
        coverImage: t.coverImage,
        // `outline` is a raw HTML map-embed snippet (see ItineraryAccordion's
        // dangerouslySetInnerHTML), not a text summary — leave it unset; the
        // real itinerary content lives in the `itinerary` array below.
        destinationId: t.destinationId,
        itinerary: t.itineraryDays.map((d, i) => ({
          id: `day-${i + 1}`,
          day: `Day ${i + 1}`,
          title: d.title,
          description: d.description,
        })),
        include: [
          'All accommodation as per itinerary',
          'All meals during the trip',
          'Experienced English-speaking guide',
          'All necessary permits and entry fees',
          'Airport/hotel transfers',
        ],
        exclude: [
          'International airfare',
          'Nepal visa fees',
          'Travel insurance',
          'Personal expenses and tips',
          'Alcoholic beverages',
        ],
        facts: [factDifficulty, factAltitude, factGroupType, factBestSeason].map((f) => ({
          factId: f.id,
          name: f.name,
          field_type: f.fieldType,
          value: f.value,
          icon: f.icon,
        })),
        faqs: [faqRefund, faqFitness, faqPermit].map((f) => ({
          faqId: f.id,
          question: f.question,
          answer: f.answer,
        })),
        gallery: [
          { image: t.coverImage, alt: t.title, sortOrder: 0, isFeatured: true },
          { image: 'https://images.unsplash.com/photo-1571401835393-8c5f35328320?w=1200&h=800&fit=crop', alt: `${t.title} highlight 2`, sortOrder: 1, isFeatured: false },
          { image: 'https://images.unsplash.com/photo-1585938389612-a552a28d6914?w=1200&h=800&fit=crop', alt: `${t.title} highlight 3`, sortOrder: 2, isFeatured: false },
        ],
        location: { city: t.destinationId === destEverest.id ? 'Namche Bazaar' : t.destinationId === destKathmandu.id ? 'Kathmandu' : 'Sauraha', country: 'Nepal' },
        discount: t.saleEnabled
          ? { type: 'percentage', value: Math.round((1 - (t.salePrice ?? t.price) / t.price) * 100), dateRange: { from: '2026-01-01', to: '2026-12-31' } }
          : null,
        pricingOptions: [
          {
            id: 'opt-adult',
            name: 'Adult',
            price: t.price,
            category: 'adult',
            paxRange: { min: 1, max: t.maxSize },
            discountEnabled: t.saleEnabled,
            discount: t.saleEnabled ? { type: 'price', value: t.price - (t.salePrice ?? t.price) } : undefined,
            isActive: true,
          },
          {
            id: 'opt-child',
            name: 'Child',
            price: Math.round(t.price * 0.6),
            category: 'child',
            paxRange: { min: 1, max: t.maxSize },
            discountEnabled: false,
            isActive: true,
          },
        ],
        tourDates: {
          type: 'multiple',
          days: t.days,
          nights: t.nights,
          dateRange: { from: '2026-10-01', to: '2027-04-30' },
          departures: [
            { id: 'dep-1', label: 'October 2026', dateRange: { from: '2026-10-05', to: '2026-10-05' }, capacity: t.maxSize },
            { id: 'dep-2', label: 'March 2027', dateRange: { from: '2027-03-10', to: '2027-03-10' }, capacity: t.maxSize },
          ],
          capacity: t.maxSize,
        },
        enquiry: true,
        isSpecialOffer: t.isSpecialOffer,
        price: t.price,
        pricePerPerson: true,
        minSize: t.minSize,
        maxSize: t.maxSize,
        groupSize: t.minSize,
        saleEnabled: t.saleEnabled,
        salePrice: t.salePrice ?? undefined,
        priceLockDate: new Date('2026-12-31'),
        pricingOptionsEnabled: true,
        fixedDeparture: false,
        multipleDates: true,
        paymentOptions: {
          fullPaymentEnabled: true,
          depositEnabled: true,
          depositPercentage: 30,
          payOnArrivalEnabled: false,
        },
      })
      .returning();

    await db.insert(tourCategories).values({ tourId: tour.id, categoryId: t.categoryId });
    await db.insert(tourAuthors).values({ tourId: tour.id, userId: t.sellerId });

    createdTours.push(tour);
    console.log(`✅ Tour: ${tour.title} (${tour.code})`);
  }

  // ---------------------------------------------------------------------
  // Reviews (approved, with one seller reply) + aggregate recompute
  // ---------------------------------------------------------------------
  const reviewTexts = [
    { user: customerAmy, rating: 5, comment: 'Absolutely incredible experience. Our guide was knowledgeable and the views were beyond what I imagined. Highly recommend!' },
    { user: customerBen, rating: 4, comment: 'Great trip overall, well organized. Food was good and accommodation was comfortable for the price.' },
    { user: customerChloe, rating: 5, comment: 'Best trip of my life. The whole team took great care of us and the itinerary was perfectly paced.' },
  ];

  for (const tour of createdTours) {
    const insertedReviews = await db
      .insert(reviews)
      .values(
        reviewTexts.map((r) => ({
          tourId: tour.id,
          userId: r.user.id,
          rating: r.rating,
          comment: r.comment,
          status: 'approved' as const,
        }))
      )
      .returning();

    await db.insert(reviewReplies).values({
      reviewId: insertedReviews[0].id,
      userId: sellerAlpine.id,
      comment: 'Thank you so much for the kind words! It was a pleasure having you on the trip.',
    });

    const avg = reviewTexts.reduce((sum, r) => sum + r.rating, 0) / reviewTexts.length;
    await db
      .update(tours)
      .set({ averageRating: Math.round(avg * 10) / 10, reviewCount: reviewTexts.length, approvedReviewCount: reviewTexts.length })
      .where(sql`${tours.id} = ${tour.id}`);

    console.log(`✅ ${reviewTexts.length} reviews for ${tour.title}`);
  }

  // ---------------------------------------------------------------------
  // Posts + comments
  // ---------------------------------------------------------------------
  const [post1, post2] = await db
    .insert(posts)
    .values([
      {
        title: '10 Tips for Trekking to Everest Base Camp',
        // Post content is rendered through the same rich-text parser as tour
        // description/outline — it must be a JSON-stringified doc, not plain
        // text, or the blog cards show "Content unavailable".
        content: JSON.stringify(
          richDoc(
            'Trekking to Everest Base Camp is a bucket-list adventure for hikers around the world. Here are our top 10 tips: 1) Train your cardio for at least 8 weeks before departure. 2) Pack layers — temperatures swing wildly between day and night. 3) Budget extra days for acclimatization. 4) Break in your boots well before the trip. 5) Bring a good sleeping bag rated for sub-zero temperatures. 6) Stay hydrated to help combat altitude sickness. 7) Consider travel insurance that covers high-altitude trekking. 8) Bring cash — there are no ATMs above Namche Bazaar. 9) Respect local customs at monasteries and villages. 10) Go slow and listen to your body — this isn’t a race.'
          )
        ),
        authorId: sellerAlpine.id,
        tags: ['trekking', 'everest', 'tips'],
        image: 'https://images.unsplash.com/photo-1516481350927-9e0d1cf95cf2?w=1200&h=800&fit=crop',
        status: 'Published',
        enableComments: true,
      },
      {
        title: 'A Food Lover’s Guide to Kathmandu',
        content: JSON.stringify(
          richDoc(
            'Kathmandu’s food scene is as rich as its history. Start your morning with a cup of Nepali chiya from a street stall, then head to Newari restaurant for a traditional feast of yomari and choila. Don’t miss momos — Nepal’s beloved dumplings — available steamed, fried, or in a spicy soup called jhol momo. For dinner, try a set thakali meal with dal bhat, seasonal vegetables, and pickles. Finish with sel roti, a sweet rice donut, from a local bakery.'
          )
        ),
        authorId: sellerHimalaya.id,
        tags: ['food', 'kathmandu', 'culture'],
        image: 'https://images.unsplash.com/photo-1567337710282-00832b415979?w=1200&h=800&fit=crop',
        status: 'Published',
        enableComments: true,
      },
    ])
    .returning();

  const [c1] = await db
    .insert(comments)
    .values({ postId: post1.id, userId: customerAmy.id, text: 'This is such a helpful list, thank you! Doing this trek next spring.', approve: true })
    .returning();
  await db.insert(comments).values([
    { postId: post1.id, userId: sellerAlpine.id, parentId: c1.id, text: 'That’s great to hear! Feel free to reach out with any questions before you go.', approve: true },
    { postId: post1.id, userId: customerBen.id, text: 'Good point about the ATMs, wish I’d known that before my trip!', approve: true },
    { postId: post2.id, userId: customerChloe.id, text: 'Now I’m hungry. Adding jhol momo to my must-try list.', approve: true },
  ]);

  console.log('✅ Posts and comments created');

  console.log('\nAll done. Test accounts (password: TestPass123!):');
  console.log('  Seller:   seller.alpine@example.com');
  console.log('  Seller:   seller.himalaya@example.com');
  console.log('  Customer: customer.amy@example.com');
  console.log('  Customer: customer.ben@example.com');
  console.log('  Customer: customer.chloe@example.com');

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
