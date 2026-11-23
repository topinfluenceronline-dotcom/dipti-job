export interface FirsthandSourceLink {
  name: string;
  group:
    | 'Dubai Multi-Joint, QSR & Restaurant Groups'
    | 'Direct Dubai Luxury Hotel & Resort Portals'
    | 'Social & Recruiter Hiring Feeds'
    | 'Hospitality Specialist Job Boards'
    | 'UAE & Dubai Job Portals & Aggregators';
  description: string;
  url: string;
  liveIntegrated?: boolean;
}

export const FIRSTHAND_DUBAI_SOURCES: FirsthandSourceLink[] = [
  // 1. Dubai Multi-Joint, QSR & Restaurant Groups (Operations / Area / Outlet / Floor Manager)
  {
    name: 'Alshaya Group (Starbucks, Shake Shack, Cheesecake Factory, P.F. Chang’s)',
    group: 'Dubai Multi-Joint, QSR & Restaurant Groups',
    description: 'Massive UAE multi-brand restaurant & QSR operator hiring Operations, Area, and Restaurant Managers.',
    url: 'https://www.alshaya.com/en/careers/',
    liveIntegrated: true,
  },
  {
    name: 'Americana Restaurants (KFC, Hardee’s, Pizza Hut, TGI Fridays, Costa, Krispy Kreme)',
    group: 'Dubai Multi-Joint, QSR & Restaurant Groups',
    description: 'MENA’s largest QSR & casual dining operator — frequent Dubai Area, Operations & Multi-Store Manager roles.',
    url: 'https://careers.americanarestaurants.com/',
  },
  {
    name: 'Azadea Group (PAUL, Eataly, Butcher Shop & Grill, New Shanghai)',
    group: 'Dubai Multi-Joint, QSR & Restaurant Groups',
    description: 'Multi-outlet F&B brands across Dubai Mall, Mall of the Emirates, and Dubai Marina.',
    url: 'https://www.azadea.com/en/careers',
  },
  {
    name: 'Kitopi (Multi-Brand Cloud Kitchens & Restaurant Operations)',
    group: 'Dubai Multi-Joint, QSR & Restaurant Groups',
    description: 'Dubai-headquartered F&B operations leader hiring Kitchen/Hub Operations Managers & Heads of Ops.',
    url: 'https://www.kitopi.com/careers',
    liveIntegrated: true,
  },
  {
    name: 'Emirates Leisure Retail (Costa Coffee, Giraffe, Pret A Manger, DXB Airport F&B)',
    group: 'Dubai Multi-Joint, QSR & Restaurant Groups',
    description: 'Emirates Group F&B arm running dozens of multi-outlet cafes, bars, and restaurants across Dubai.',
    url: 'https://www.emiratesleisureretail.com/careers/',
  },
  {
    name: 'Gourmet Gulf (Texas de Brazil, Dalloyau, Panda Express, YO! Sushi)',
    group: 'Dubai Multi-Joint, QSR & Restaurant Groups',
    description: 'Dubai hospitality group operating fast-casual and fine-casual multi-outlet dining concepts.',
    url: 'https://gourmetgulf.com/careers/',
  },
  {
    name: 'Cravia (Five Guys UAE, Cinnabon, Zaatar w Zeit, Seattle’s Best)',
    group: 'Dubai Multi-Joint, QSR & Restaurant Groups',
    description: 'UAE multi-unit QSR & cafe operator hiring Area Operations Managers and Multi-Outlet Managers.',
    url: 'https://www.cravia.com/careers/',
  },
  {
    name: 'Apparel Group F&B (Tim Hortons, Jamie’s Italian, Cold Stone)',
    group: 'Dubai Multi-Joint, QSR & Restaurant Groups',
    description: 'Dubai retail & F&B powerhouse hiring F&B Operations Heads, Area Managers, and Outlet Managers.',
    url: 'https://careers.apparelglobal.com/',
  },
  {
    name: 'Sunset Hospitality Group (SUSHISAMBA, Aura Skypool, Mott 32, Attiko)',
    group: 'Dubai Multi-Joint, QSR & Restaurant Groups',
    description: 'Leading Dubai luxury dining & lifestyle operator — tracked via SmartRecruiters ATS.',
    url: 'https://www.sunsethospitality.com/careers/',
    liveIntegrated: true,
  },
  {
    name: 'Addmind Hospitality (Clap, Iris, Babylon, White, Raspoutine)',
    group: 'Dubai Multi-Joint, QSR & Restaurant Groups',
    description: 'DIFC & Palm dining & lounge operator hiring Floor, Outlet & Operations Managers.',
    url: 'https://www.addmind.com/careers',
    liveIntegrated: true,
  },
  {
    name: 'Solutions Leisure Group (STK, Asia Asia, Lock Stock & Barrel)',
    group: 'Dubai Multi-Joint, QSR & Restaurant Groups',
    description: 'Multi-outlet Dubai restaurant and venue group hiring Operations & Floor Managers.',
    url: 'https://www.solutions-leisure.com/careers/',
  },
  {
    name: 'Rikas Hospitality Group (La Cantine, Mimi Kakushi, Twiggy, Ninive)',
    group: 'Dubai Multi-Joint, QSR & Restaurant Groups',
    description: 'Premier Dubai independent luxury dining group across DIFC, Jumeirah, and Dubai Creek.',
    url: 'https://rikasgroup.com/careers/',
  },
  {
    name: 'Fundamental Hospitality (GAIA, Shanghai Me, Alaya, La Maison Ani)',
    group: 'Dubai Multi-Joint, QSR & Restaurant Groups',
    description: 'High-volume luxury DIFC & Dubai dining operator hiring Restaurant & Floor Managers.',
    url: 'https://fundamentalhospitality.com/careers/',
  },
  {
    name: 'Gates Hospitality (Reform Social & Grill, Bistro Des Arts, Publique)',
    group: 'Dubai Multi-Joint, QSR & Restaurant Groups',
    description: 'Dubai multi-venue hospitality group hiring General, Floor, and Operations Managers.',
    url: 'https://www.gateshospitality.com/careers/',
  },
  {
    name: 'Tashas Group (Tashas, Flamingo Room, Avli, Bungalo34)',
    group: 'Dubai Multi-Joint, QSR & Restaurant Groups',
    description: 'Multi-site boutique restaurant operator across Jumeirah, DIFC, and Dubai Marina.',
    url: 'https://www.tashasgroup.com/careers/',
  },

  // 2. Direct Dubai Luxury Hotel & Resort Portals
  {
    name: 'Taj Hotels / IHCL (Taj Dubai & Taj Exotica The Palm)',
    group: 'Direct Dubai Luxury Hotel & Resort Portals',
    description: 'Former employer (Taj Lands End & Taj Wellington Mews) — apply directly for Dubai F&B leadership.',
    url: 'https://www.tajhotels.com/en-in/about-us/careers/',
  },
  {
    name: 'Marriott International (Westin Mina Seyahi, St. Regis, W Dubai, JW Marriott)',
    group: 'Direct Dubai Luxury Hotel & Resort Portals',
    description: 'Former Dubai employer (Westin Mina Seyahi) — pre-filtered Dubai F&B Management openings.',
    url: 'https://jobs.marriott.com/jobs?keywords=Food%20and%20Beverage&location=Dubai',
  },
  {
    name: 'Jumeirah Group (Burj Al Arab, Madinat Jumeirah, Jumeirah Beach Hotel)',
    group: 'Direct Dubai Luxury Hotel & Resort Portals',
    description: 'Dubai flagship luxury resorts — tracked via SmartRecruiters ATS in this app.',
    url: 'https://careers.jumeirah.com/',
    liveIntegrated: true,
  },
  {
    name: 'Accor Hotels (Fairmont, Raffles, Sofitel, SLS, Rixos, Mövenpick)',
    group: 'Direct Dubai Luxury Hotel & Resort Portals',
    description: 'Dubai luxury & lifestyle hotel openings across all-day dining, banquets, and lounges.',
    url: 'https://careers.accor.com/',
    liveIntegrated: true,
  },
  {
    name: 'Kerzner International (Atlantis The Palm, Atlantis The Royal, One&Only)',
    group: 'Direct Dubai Luxury Hotel & Resort Portals',
    description: 'Mega-resort banquets, buffets, and celebrity restaurants on Palm Jumeirah.',
    url: 'https://careers.kerzner.com/',
    liveIntegrated: true,
  },
  {
    name: 'Emaar Hospitality (Address Hotels, Vida, Palace Downtown)',
    group: 'Direct Dubai Luxury Hotel & Resort Portals',
    description: 'Downtown Dubai & Marina hotels, club lounges, and banquet operations.',
    url: 'https://careers.emaar.com/',
    liveIntegrated: true,
  },
  {
    name: 'Four Seasons Dubai (Jumeirah Beach & DIFC)',
    group: 'Direct Dubai Luxury Hotel & Resort Portals',
    description: 'Ultra-luxury restaurant, lounge, and banquet leadership in Dubai.',
    url: 'https://jobs.fourseasons.com/',
    liveIntegrated: true,
  },
  {
    name: 'Hilton Dubai (Waldorf Astoria, Conrad, Hilton Palm Jumeirah)',
    group: 'Direct Dubai Luxury Hotel & Resort Portals',
    description: 'Large-scale banquets, all-day dining buffets, and F&B operations management.',
    url: 'https://jobs.hilton.com/emea/en/search-results?keywords=Food%20and%20Beverage%20Dubai',
  },
  {
    name: 'IHG Hotels & Resorts Dubai (InterContinental, Crowne Plaza, Kimpton)',
    group: 'Direct Dubai Luxury Hotel & Resort Portals',
    description: 'Festival City, Marina, and Sheikh Zayed Road hotel F&B & Banquet roles.',
    url: 'https://careers.ihg.com/en/jobs/?search=Dubai&category=Food+%26+Beverage',
  },
  {
    name: 'Hyatt Hotels Dubai (Park Hyatt, Grand Hyatt, Andaz The Palm)',
    group: 'Direct Dubai Luxury Hotel & Resort Portals',
    description: 'High-volume luxury hotel dining, buffet, and convention banquet teams.',
    url: 'https://careers.hyatt.com/en-US/careers/search?location=Dubai',
  },
  {
    name: 'Rotana Hotels Dubai (Al Bandar, Towers, Amwaj Rotana)',
    group: 'Direct Dubai Luxury Hotel & Resort Portals',
    description: 'Extensive Dubai portfolio with All-Day Dining, Banquets, and Club Rotana roles.',
    url: 'https://www.rotanacareers.com/',
    liveIntegrated: true,
  },
  {
    name: 'Kempinski Hotels Dubai (Mall of the Emirates & Palm Jumeirah)',
    group: 'Direct Dubai Luxury Hotel & Resort Portals',
    description: 'European luxury hotel F&B, Executive Lounge, and banquet operations.',
    url: 'https://www.kempinski.com/en/careers',
    liveIntegrated: true,
  },
  {
    name: 'Shangri-La & Mandarin Oriental Jumeira Dubai',
    group: 'Direct Dubai Luxury Hotel & Resort Portals',
    description: 'Five-star hotel F&B and fine dining leadership on Sheikh Zayed Road & Jumeirah.',
    url: 'https://careers.mandarinoriental.com/',
  },

  // 3. Social & Recruiter Hiring Feeds
  {
    name: 'LinkedIn Jobs · Past 24 Hours (Operations, Floor, Outlet, QSR, Restaurant, Banquet)',
    group: 'Social & Recruiter Hiring Feeds',
    description: 'Pre-sorted by Past 24 Hours for all Dubai F&B & QSR leadership titles.',
    url: 'https://www.linkedin.com/jobs/search/?keywords=(%22Operations%20Manager%22%20OR%20%22Floor%20Manager%22%20OR%20%22Outlet%20Manager%22%20OR%20%22Restaurant%20Manager%22%20OR%20%22Banquet%20Manager%22)%20AND%20(Restaurant%20OR%20Hospitality%20OR%20QSR%20OR%20Food)&location=Dubai%2C%20United%20Arab%20Emirates&f_TPR=r86400&sortBy=DD',
  },
  {
    name: 'LinkedIn Recruiter Posts (Direct HR Emails & Urgent Dubai Hiring)',
    group: 'Social & Recruiter Hiring Feeds',
    description: 'Live recruiter posts sorted by latest date—often includes direct HR email and WhatsApp.',
    url: 'https://www.linkedin.com/search/results/content/?keywords=Dubai%20(%22Operations%20Manager%22%20OR%20%22Floor%20Manager%22%20OR%20%22Outlet%20Manager%22%20OR%20%22Restaurant%20Manager%22%20OR%20%22Banquet%22)%20hiring&sortBy=%22date_posted%22',
  },
  {
    name: 'X / Twitter · Latest Dubai F&B & QSR Hiring',
    group: 'Social & Recruiter Hiring Feeds',
    description: 'Real-time hiring announcements and pre-opening calls in Dubai sorted by Latest.',
    url: 'https://x.com/search?q=Dubai%20(%22Restaurant%20Manager%22%20OR%20%22Operations%20Manager%22%20OR%20%22Floor%20Manager%22%20OR%20%22Banquet%22%20OR%20%22QSR%22)%20hiring&f=live',
  },
  {
    name: 'Facebook · Dubai Hospitality, QSR & Restaurant Jobs',
    group: 'Social & Recruiter Hiring Feeds',
    description: 'Public Dubai hospitality & multi-outlet hiring posts on Facebook.',
    url: 'https://www.facebook.com/search/posts/?q=Dubai%20Restaurant%20Operations%20OR%20Floor%20Manager%20OR%20Outlet%20Manager%20hiring',
  },
  {
    name: 'Instagram · #dubaihospitalityjobs & #dubaifnbjobs',
    group: 'Social & Recruiter Hiring Feeds',
    description: 'Direct restaurant, beach club, and venue hiring posts on Instagram in Dubai.',
    url: 'https://www.instagram.com/explore/tags/dubaihospitalityjobs/',
  },
  {
    name: 'Instagram · #dubairestaurantjobs',
    group: 'Social & Recruiter Hiring Feeds',
    description: 'Direct outlet manager, floor manager, and dining concept openings in Dubai.',
    url: 'https://www.instagram.com/explore/tags/dubairestaurantjobs/',
  },

  // 4. Hospitality Specialist Job Boards
  {
    name: 'CatererGlobal · Dubai F&B & Operations Management (Newest)',
    group: 'Hospitality Specialist Job Boards',
    description: 'GCC’s #1 specialist luxury hotel, restaurant, and catering management job board.',
    url: 'https://www.catererglobal.com/jobs/food-and-beverage/in-dubai?sort=date',
  },
  {
    name: 'Hosco · Dubai Luxury Hospitality & Multi-Outlet Roles',
    group: 'Hospitality Specialist Job Boards',
    description: 'Used directly by Four Seasons, Jumeirah, Fairmont, Raffles, and Mandarin Oriental.',
    url: 'https://www.hosco.com/en/jobs?location=Dubai',
  },
  {
    name: 'HospitalityOnline · Dubai Hotel & Restaurant Careers',
    group: 'Hospitality Specialist Job Boards',
    description: 'Dedicated hotel & resort operations board covering UAE luxury properties.',
    url: 'https://www.hospitalityonline.com/jobs?location=Dubai',
  },
  {
    name: 'HCareers · Dubai F&B Management',
    group: 'Hospitality Specialist Job Boards',
    description: 'International hotel operations, banquet, and multi-outlet F&B postings.',
    url: 'https://www.hcareers.com/jobs?location=Dubai',
  },
  {
    name: 'Caterer.com International · UAE Hospitality',
    group: 'Hospitality Specialist Job Boards',
    description: 'International hospitality & catering leadership roles relocating or hiring in UAE.',
    url: 'https://www.caterer.com/jobs/in-dubai',
  },

  // 5. UAE & Dubai Job Portals & Aggregators
  {
    name: 'Talent.com UAE · Dubai Operations, Floor, Outlet & Restaurant Manager',
    group: 'UAE & Dubai Job Portals & Aggregators',
    description: 'Actively synced live in this app across all F&B operations, floor, QSR, and banquet queries.',
    url: 'https://ae.talent.com/jobs?k=operations+manager+restaurant+food+beverage&l=Dubai',
    liveIntegrated: true,
  },
  {
    name: 'Jobrapido UAE · Dubai Hospitality & QSR Operations',
    group: 'UAE & Dubai Job Portals & Aggregators',
    description: 'Actively synced live in this app — aggregates FounditGulf, WhatJobs, and SourcingSquare.',
    url: 'https://ae.jobrapido.com/Operations-Manager-Restaurant-jobs-in-Dubai',
    liveIntegrated: true,
  },
  {
    name: 'NaukriGulf · Dubai Food & Beverage / QSR / Operations',
    group: 'UAE & Dubai Job Portals & Aggregators',
    description: 'High-volume UAE hospitality, QSR, restaurant, buffet, and operations head postings.',
    url: 'https://www.naukrigulf.com/food-and-beverage-jobs-in-dubai',
  },
  {
    name: 'GulfTalent · UAE Restaurant & Operations Management',
    group: 'UAE & Dubai Job Portals & Aggregators',
    description: 'Senior Operations Heads, Area Managers, and Restaurant Management across Dubai.',
    url: 'https://www.gulftalent.com/uae/jobs/hospitality-tourism',
  },
  {
    name: 'Bayt.com · Dubai Restaurant, Outlet & Operations Manager',
    group: 'UAE & Dubai Job Portals & Aggregators',
    description: 'GCC job portal sorted by date for Dubai restaurant, QSR, and banquet leadership.',
    url: 'https://www.bayt.com/en/uae/jobs/restaurant-manager-jobs-in-dubai/',
  },
  {
    name: 'Indeed UAE · Dubai F&B & QSR Operations (Last 24 Hours)',
    group: 'UAE & Dubai Job Portals & Aggregators',
    description: 'Filtered to last 24 hours for Operations, Floor, Outlet, Restaurant & Banquet Managers.',
    url: 'https://ae.indeed.com/jobs?q=Operations+Manager+OR+Floor+Manager+OR+Outlet+Manager+OR+Restaurant+Manager+OR+Banquet+Manager&l=Dubai&fromage=1&sort=date',
  },
  {
    name: 'Glassdoor UAE · Dubai F&B Operations & Management',
    group: 'UAE & Dubai Job Portals & Aggregators',
    description: 'Verified company reviews + Dubai hospitality and QSR operations openings.',
    url: 'https://www.glassdoor.com/Job/dubai-food-and-beverage-manager-jobs-SRCH_IL.0,5_IC2204498_KO6,31.htm',
  },
  {
    name: 'FounditGulf (Monster Gulf) · Dubai Hospitality & QSR',
    group: 'UAE & Dubai Job Portals & Aggregators',
    description: 'Direct Gulf hotel, multi-outlet, and QSR restaurant group listings.',
    url: 'https://www.founditgulf.com/search/restaurant-manager-jobs-in-dubai',
  },
  {
    name: 'Dubizzle Jobs · Dubai Hospitality, Restaurants & Outlets',
    group: 'UAE & Dubai Job Portals & Aggregators',
    description: 'Direct Dubai restaurant owners & outlets often post mobile/WhatsApp numbers here.',
    url: 'https://dubai.dubizzle.com/jobs/hospitality-restaurants/',
  },
  {
    name: 'Laimoon UAE · Dubai Hospitality & Food & Beverage',
    group: 'UAE & Dubai Job Portals & Aggregators',
    description: 'Dubai-based aggregator covering hotels, restaurants, cafes, and catering.',
    url: 'https://jobs.laimoon.com/uae/dubai/hospitality-food-beverage',
  },
  {
    name: 'Careerjet UAE · Dubai Restaurant, Floor & Operations Manager',
    group: 'UAE & Dubai Job Portals & Aggregators',
    description: 'Broad UAE job search engine indexing corporate & restaurant career sites.',
    url: 'https://www.careerjet.ae/search/jobs?s=Restaurant+Operations+Floor+Outlet+Manager&l=Dubai',
  },
  {
    name: 'Khaleej Times Buzzon · Dubai Hospitality & Dining Jobs',
    group: 'UAE & Dubai Job Portals & Aggregators',
    description: 'UAE newspaper classifieds with direct employer & HR contact details.',
    url: 'https://buzzon.khaleejtimes.com/classifieds/jobs/hotel-catering/',
  },
  {
    name: 'Gulf News Jobs · UAE Hospitality & F&B Careers',
    group: 'UAE & Dubai Job Portals & Aggregators',
    description: 'Major Dubai news portal job board for F&B operations and hospitality management.',
    url: 'https://gulfnews.com/jobs',
  },
  {
    name: 'Tanqeeb UAE · Dubai Food & Beverage Management',
    group: 'UAE & Dubai Job Portals & Aggregators',
    description: 'Middle East job aggregator pulling across regional boards and direct employers.',
    url: 'https://uae.tanqeeb.com/jobs-in-dubai/restaurant-manager',
  },
  {
    name: 'GrabJobs UAE · Dubai Quick-Apply Hospitality & QSR',
    group: 'UAE & Dubai Job Portals & Aggregators',
    description: 'Fast chat-based applications for Dubai restaurants, cafes, and multi-outlet brands.',
    url: 'https://grabjobs.co/uae/jobs-in-dubai/hospitality-f-b',
  },
  {
    name: 'Jooble UAE · Dubai Operations & Outlet Manager (F&B)',
    group: 'UAE & Dubai Job Portals & Aggregators',
    description: 'Aggregates regional UAE hospitality, QSR, and multi-joint restaurant listings.',
    url: 'https://ae.jooble.org/jobs-restaurant-operations-manager/Dubai',
  },
];
