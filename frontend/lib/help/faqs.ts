export interface FaqItem { q: string; a: string }
export interface FaqGroup { id: string; title: string; items: FaqItem[] }

/** Help Center content. Plain text answers so the same data feeds the page and its FAQPage structured data. */
export const FAQ_GROUPS: FaqGroup[] = [
    {
        id: 'booking',
        title: 'Booking a tour',
        items: [
            { q: 'How do I book a tour?', a: 'Open a tour, choose your departure date and the number of travellers, pick a payment option and enter your contact details. You will get a booking confirmation by email straight away.' },
            { q: 'Do I need an account to book?', a: 'No. You can book as a guest. An account lets you see all your bookings in one place, message operators and save tours to your wishlist.' },
            { q: 'Why does a date say it is not yet bookable?', a: 'Many tours depend on hotels, guides, restaurants and transport confirming they are free on that date. A date opens for booking once those providers have confirmed. Try another departure, or send the operator an enquiry.' },
            { q: 'How do I know my booking is confirmed?', a: 'We email you when the operator confirms it, and the booking status on your booking page changes to “confirmed”. Your voucher can be downloaded from the same page.' },
            { q: 'Can I book for someone else or for a group?', a: 'Yes. Enter the names of all travellers and your own contact details. For large groups or private departures, use the enquiry form on the tour page and the operator will quote you.' },
            { q: 'Can I ask the operator a question before booking?', a: 'Yes. Use “Enquiry” on the tour page. The operator is notified by email and replies in your inbox or by email.' },
        ],
    },
    {
        id: 'payments',
        title: 'Prices and payment',
        items: [
            { q: 'What payment options are there?', a: 'Each tour offers one or more of: full payment, a deposit with the balance later, or payment on arrival. The options for a tour, and what is due now and later, are shown before you book and in your confirmation.' },
            { q: 'Which currency are prices in?', a: 'Prices are in US dollars. Other currencies shown on the site are estimates for information only.' },
            { q: 'What is included in the price?', a: 'Every tour lists what is included and excluded on its page. Costs like international flights, visas, insurance, tips and personal expenses are usually excluded.' },
            { q: 'How do discounts and promo codes work?', a: 'A discount is applied automatically while it is active and shown on the tour. If you have a promo code, enter it in the booking form; the new total is shown before you confirm.' },
            { q: 'Will I get a receipt?', a: 'Yes. When a payment is received we email you a receipt with the amount paid and any balance remaining.' },
        ],
    },
    {
        id: 'cancellations',
        title: 'Changes, cancellations and refunds',
        items: [
            { q: 'Can I cancel my booking?', a: 'Yes. Open the booking in My bookings and cancel it, up to 48 hours before departure. What you get back depends on the tour’s cancellation terms. See our Cancellation & Refund Policy.' },
            { q: 'Can I change my date or the number of travellers?', a: 'Contact the operator or us as early as you can. Changes depend on availability and can change the price.' },
            { q: 'What if the operator cancels?', a: 'You can choose another departure or receive a full refund of what you paid for that tour.' },
            { q: 'When will I receive a refund?', a: 'Approved refunds go back to the original payment method, usually within 10 business days.' },
        ],
    },
    {
        id: 'travel',
        title: 'Before you travel',
        items: [
            { q: 'Do I need travel insurance?', a: 'Yes, we require it. For treks and activities at altitude, or adventure sports, it must cover them and include emergency evacuation.' },
            { q: 'Do I need a visa?', a: 'It depends on your nationality and destination. Check the entry rules of the country you are visiting well before you travel. Many tours list visa information in their FAQs.' },
            { q: 'How fit do I need to be?', a: 'Every tour shows a difficulty and fitness level in its facts. Read it honestly, and ask the operator if you are unsure. Treks above 3,000 m carry a risk of altitude sickness whatever your fitness.' },
            { q: 'What if I have dietary needs or a medical condition?', a: 'Put them in the special requests box when you book, and tell your guide at the start. The operator can only plan for what it knows.' },
        ],
    },
    {
        id: 'account',
        title: 'Your account',
        items: [
            { q: 'I did not get my verification email.', a: 'Check your spam folder, then try signing up or requesting it again. If it still does not arrive, contact us.' },
            { q: 'I forgot my password.', a: 'Use “Forgot password” on the sign-in page and we will email you a reset link.' },
            { q: 'How do I delete my account or my data?', a: 'Email us from the address on your account and we will delete or anonymise your data, except records we must keep by law. See our Privacy Policy.' },
        ],
    },
    {
        id: 'business',
        title: 'For tour operators, providers and advertisers',
        items: [
            { q: 'How do I list my tours?', a: 'Apply to become a seller. Once approved you can create tours, set prices and dates, and receive bookings and enquiries by email and in your dashboard.' },
            { q: 'I run a hotel, restaurant, guesthouse, guide service or transport company. Can I join?', a: 'Yes. Apply as a business partner. Operators can then link your business to their itineraries and you receive supplier requests to confirm.' },
            { q: 'How do I advertise?', a: 'Approved businesses can create a campaign from their dashboard, choosing a monthly or per-view plan and the places and tour types it should appear alongside. Campaigns run once approved and paid.' },
        ],
    },
];
