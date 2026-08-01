"""Immutable fictional dataset definitions for the controlled demo seeder.

No credential or real-business information belongs in this module. Dates and
relational records are derived by the management command from these stable keys.
"""

from dataclasses import dataclass
from decimal import Decimal


DATASET_VERSION = "2026.07.14-v4"
DEMO_USERNAME_PREFIX = "demo_"
DEMO_EMAIL_DOMAIN = "example.test"
DEMO_VENDOR_PREFIX = "TasteLocal Demo —"
DEMO_EXPERIENCE_PREFIX = "[Demo]"
DEMO_REVIEW_PREFIX = "[Demo review]"
DEMO_PROFILE_PREFIX = (
    "Fictional demo profile for capstone testing; not a real business."
)


@dataclass(frozen=True)
class UserSeed:
    username: str
    email: str
    full_name: str
    role: str


@dataclass(frozen=True)
class VendorSeed:
    username: str
    business_name: str
    approval_status: str
    neighbourhood: str
    speciality: str


@dataclass(frozen=True)
class CategorySeed:
    key: str
    name: str
    description: str
    managed: bool = False


@dataclass(frozen=True)
class LocationSeed:
    key: str
    address: str
    latitude: str
    longitude: str
    managed: bool = False


@dataclass(frozen=True)
class ExperienceSeed:
    key: str
    vendor_username: str
    category_key: str
    location_key: str
    title: str
    description: str
    price_sgd: Decimal
    status: str

    @property
    def image_url(self) -> str:
        """Stable Vite public-asset URL for this fictional demo experience."""
        return f"/demo-images/experiences/{self.key}.webp"


@dataclass(frozen=True)
class BookingSeed:
    key: str
    tourist_username: str
    experience_key: str
    slot_kind: str
    status: str


@dataclass(frozen=True)
class ReviewSeed:
    booking_key: str
    rating: int
    comment: str


@dataclass(frozen=True)
class ItineraryItemSeed:
    experience_key: str
    day_offset: int | None
    planned_time: str | None


@dataclass(frozen=True)
class ItinerarySeed:
    tourist_username: str
    name: str
    items: tuple[ItineraryItemSeed, ...]


USERS = (
    UserSeed("demo_tourist_01", "demo.tourist01@example.test", "Demo Tourist Aisha", "Tourist"),
    UserSeed("demo_tourist_02", "demo.tourist02@example.test", "Demo Tourist Benjamin", "Tourist"),
    UserSeed("demo_tourist_03", "demo.tourist03@example.test", "Demo Tourist Charmaine", "Tourist"),
    UserSeed("demo_tourist_04", "demo.tourist04@example.test", "Demo Tourist Daniel", "Tourist"),
    UserSeed("demo_vendor_approved_01", "demo.vendor01@example.test", "Demo Vendor Mei Lin", "Vendor"),
    UserSeed("demo_vendor_approved_02", "demo.vendor02@example.test", "Demo Vendor Hafiz", "Vendor"),
    UserSeed("demo_vendor_approved_03", "demo.vendor03@example.test", "Demo Vendor Priya", "Vendor"),
    UserSeed("demo_vendor_approved_04", "demo.vendor04@example.test", "Demo Vendor Marcus", "Vendor"),
    UserSeed("demo_vendor_approved_05", "demo.vendor05@example.test", "Demo Vendor Jia Wei", "Vendor"),
    UserSeed("demo_vendor_approved_06", "demo.vendor06@example.test", "Demo Vendor Nurul", "Vendor"),
    UserSeed("demo_vendor_pending_01", "demo.vendor.pending@example.test", "Demo Vendor Pending", "Vendor"),
    UserSeed("demo_vendor_rejected_01", "demo.vendor.rejected@example.test", "Demo Vendor Rejected", "Vendor"),
)


VENDORS = (
    VendorSeed("demo_vendor_approved_01", f"{DEMO_VENDOR_PREFIX} Chinatown Flavours Studio", "Approved", "Chinatown", "hawker tastings and heritage trails"),
    VendorSeed("demo_vendor_approved_02", f"{DEMO_VENDOR_PREFIX} Katong Heritage Kitchen", "Approved", "Katong", "Peranakan-inspired stories and workshops"),
    VendorSeed("demo_vendor_approved_03", f"{DEMO_VENDOR_PREFIX} Little India Spice Table", "Approved", "Little India", "spice-led tastings and cooking activities"),
    VendorSeed("demo_vendor_approved_04", f"{DEMO_VENDOR_PREFIX} Tiong Bahru Food Stories", "Approved", "Tiong Bahru", "desserts and modern Singapore flavours"),
    VendorSeed("demo_vendor_approved_05", f"{DEMO_VENDOR_PREFIX} Hainanese Chicken Rice Table", "Approved", "Toa Payoh", "fictional Hainanese chicken rice tastings"),
    VendorSeed("demo_vendor_approved_06", f"{DEMO_VENDOR_PREFIX} Kampong Chicken Rice Stories", "Approved", "Chinatown", "fictional roasted chicken rice experiences"),
    VendorSeed("demo_vendor_pending_01", f"{DEMO_VENDOR_PREFIX} Pending Food Concept", "Pending", "Toa Payoh", "a pending capstone vendor workflow"),
    VendorSeed("demo_vendor_rejected_01", f"{DEMO_VENDOR_PREFIX} Rejected Food Concept", "Rejected", "Marina Bay", "a rejected capstone vendor workflow"),
)


CATEGORIES = (
    CategorySeed("hawker", "Hawker Food", "Singapore hawker-food experiences."),
    CategorySeed("fine_dining", "Fine Dining", "Curated modern dining experiences."),
    CategorySeed("workshops", "Culinary Workshops", "Hands-on local food workshops."),
    CategorySeed("trails", "Heritage Trails", "Neighbourhood food and culture trails."),
    CategorySeed("heritage_food", "[Demo] Heritage Food", "Clearly fictional heritage-food demonstration experiences.", True),
    CategorySeed("desserts", "[Demo] Local Desserts", "Clearly fictional local-dessert demonstration experiences.", True),
    CategorySeed("modern", "[Demo] Modern Singapore Food", "Clearly fictional contemporary Singapore-food demonstrations.", True),
)


LOCATIONS = (
    LocationSeed("chinatown", "Chinatown, Singapore", "1.2830000", "103.8430000"),
    LocationSeed("little_india", "Little India, Singapore", "1.3060000", "103.8520000"),
    LocationSeed("kampong_glam", "Kampong Glam, Singapore", "1.3020000", "103.8590000"),
    LocationSeed("katong", "Katong, Singapore", "1.3050000", "103.9050000"),
    LocationSeed("tiong_bahru", "Demo area — Tiong Bahru, Singapore", "1.2849000", "103.8323000", True),
    LocationSeed("joo_chiat", "Demo area — Joo Chiat, Singapore", "1.3151000", "103.8987000", True),
    LocationSeed("toa_payoh", "Demo area — Toa Payoh, Singapore", "1.3343000", "103.8563000", True),
    LocationSeed("marina_bay", "Demo area — Marina Bay, Singapore", "1.2838000", "103.8591000", True),
    # Approximate, fictional presentation coordinates. These are deliberately
    # distinct and do not represent vendor premises or real business map pins.
    LocationSeed("satay_stories_map", "Demo area — Chinatown South, Singapore", "1.2817000", "103.8416000", True),
    LocationSeed("chinatown_trail_map", "Demo area — Chinatown North, Singapore", "1.2842000", "103.8419000", True),
    LocationSeed("dumpling_workshop_map", "Demo area — Chinatown East, Singapore", "1.2819000", "103.8450000", True),
    LocationSeed("roasted_chicken_rice_map", "Demo area — Chinatown Northeast, Singapore", "1.2844000", "103.8452000", True),
    LocationSeed("kopi_breakfast_map", "Demo area — Toa Payoh West, Singapore", "1.3324000", "103.8545000", True),
    LocationSeed("hainanese_chicken_rice_map", "Demo area — Toa Payoh North, Singapore", "1.3356000", "103.8548000", True),
    LocationSeed("peranakan_stories_map", "Demo area — Katong West, Singapore", "1.3033000", "103.9032000", True),
    LocationSeed("kueh_colours_map", "Demo area — Katong North, Singapore", "1.3065000", "103.9036000", True),
    LocationSeed("laksa_workshop_map", "Demo area — Katong East, Singapore", "1.3048000", "103.9076000", True),
    LocationSeed("joo_chiat_tasting_map", "Demo area — Joo Chiat East, Singapore", "1.3148000", "103.9002000", True),
    LocationSeed("little_india_bites_map", "Demo area — Little India Southwest, Singapore", "1.3046000", "103.8505000", True),
    LocationSeed("spice_blending_map", "Demo area — Little India Northeast, Singapore", "1.3075000", "103.8537000", True),
    LocationSeed("spice_heritage_map", "Demo area — Kampong Glam East, Singapore", "1.3007000", "103.8608000", True),
    LocationSeed("pandan_desserts_map", "Demo area — Tiong Bahru West, Singapore", "1.2835000", "103.8307000", True),
    LocationSeed("modern_flavours_map", "Demo area — Tiong Bahru Northeast, Singapore", "1.2863000", "103.8340000", True),
    LocationSeed("modern_tasting_map", "Demo area — Marina Bay East, Singapore", "1.2817000", "103.8611000", True),
)


EXPERIENCES = (
    ExperienceSeed("satay_stories", "demo_vendor_approved_01", "hawker", "satay_stories_map", "[Demo] Charcoal Satay Stories Tasting", "A fictional guided tasting that compares smoky skewers, sauces and serving traditions for capstone demonstration.", Decimal("28.00"), "Published"),
    ExperienceSeed("chinatown_trail", "demo_vendor_approved_01", "trails", "chinatown_trail_map", "[Demo] Chinatown Food Story Trail", "A fictional small-group neighbourhood walk connecting local-food themes through guided storytelling.", Decimal("48.00"), "Published"),
    ExperienceSeed("kopi_breakfast", "demo_vendor_approved_01", "hawker", "kopi_breakfast_map", "[Demo] Kopi and Breakfast Classics", "A fictional introduction to kopi vocabulary and familiar Singapore breakfast flavours.", Decimal("22.00"), "Published"),
    ExperienceSeed("dumpling_workshop", "demo_vendor_approved_01", "workshops", "dumpling_workshop_map", "[Demo] Handmade Dumpling Workshop", "A fictional hands-on session covering folding styles and a simple savoury filling.", Decimal("72.00"), "Published"),
    ExperienceSeed("hawker_host_lab", "demo_vendor_approved_01", "hawker", "toa_payoh", "[Demo] Hawker Hosting Lab", "A fictional draft concept used to demonstrate vendor listing management.", Decimal("38.00"), "Draft"),

    ExperienceSeed("peranakan_stories", "demo_vendor_approved_02", "heritage_food", "peranakan_stories_map", "[Demo] Katong Peranakan Flavour Stories", "A fictional hosted tasting about colourful ingredients and family-table traditions.", Decimal("58.00"), "Published"),
    ExperienceSeed("joo_chiat_tasting", "demo_vendor_approved_02", "heritage_food", "joo_chiat_tasting_map", "[Demo] Joo Chiat Heritage Tasting", "A fictional tasting route presenting contrasting savoury and sweet heritage flavours.", Decimal("62.00"), "Published"),
    ExperienceSeed("kueh_colours", "demo_vendor_approved_02", "desserts", "kueh_colours_map", "[Demo] Kueh Colours Discovery", "A fictional guided sampling of textures, colours, pandan and coconut notes.", Decimal("26.00"), "Published"),
    ExperienceSeed("laksa_workshop", "demo_vendor_approved_02", "workshops", "laksa_workshop_map", "[Demo] Laksa Flavour Workshop", "A fictional practical session exploring broth balance, noodles and garnishes.", Decimal("88.00"), "Published"),
    ExperienceSeed("dessert_lab", "demo_vendor_approved_02", "desserts", "joo_chiat", "[Demo] Local Dessert Workshop Lab", "A fictional draft dessert-workshop concept for vendor editing demonstrations.", Decimal("46.00"), "Draft"),

    ExperienceSeed("little_india_bites", "demo_vendor_approved_03", "hawker", "little_india_bites_map", "[Demo] Little India Hawker Bites", "A fictional tasting of spice-forward snacks presented with neighbourhood food stories.", Decimal("34.00"), "Published"),
    ExperienceSeed("spice_heritage", "demo_vendor_approved_03", "heritage_food", "spice_heritage_map", "[Demo] Kampong Glam Spice Heritage", "A fictional sensory session introducing spice aromas and food-memory prompts.", Decimal("52.00"), "Published"),
    ExperienceSeed("spice_blending", "demo_vendor_approved_03", "workshops", "spice_blending_map", "[Demo] Singapore Spice Blending Workshop", "A fictional hands-on blending activity using labelled demonstration ingredients.", Decimal("68.00"), "Published"),
    ExperienceSeed("night_spice_walk", "demo_vendor_approved_03", "trails", "kampong_glam", "[Demo] Evening Spice Story Walk", "A fictional draft trail concept with demo availability only.", Decimal("56.00"), "Draft"),

    ExperienceSeed("pandan_desserts", "demo_vendor_approved_04", "desserts", "pandan_desserts_map", "[Demo] Pandan and Coconut Desserts", "A fictional tasting focused on fragrance, texture and presentation.", Decimal("30.00"), "Published"),
    ExperienceSeed("modern_flavours", "demo_vendor_approved_04", "modern", "modern_flavours_map", "[Demo] Tiong Bahru Modern Flavours", "A fictional contemporary tasting that reimagines familiar Singapore flavour pairings.", Decimal("68.00"), "Published"),
    ExperienceSeed("modern_tasting", "demo_vendor_approved_04", "fine_dining", "modern_tasting_map", "[Demo] Modern Singapore Tasting Journey", "A fictional presentation-led menu created solely for high-price filter demonstration.", Decimal("168.00"), "Published"),
    ExperienceSeed("inactive_pop_up", "demo_vendor_approved_04", "modern", "marina_bay", "[Demo] Contemporary Flavour Pop-up Archive", "A fictional inactive listing used to demonstrate non-public vendor inventory.", Decimal("98.00"), "Inactive"),

    ExperienceSeed("hainanese_chicken_rice", "demo_vendor_approved_05", "hawker", "hainanese_chicken_rice_map", "[Demo] Hainanese Chicken Rice Tasting", "A fictional chicken rice tasting comparing fragrant rice, poached chicken and classic demo condiments.", Decimal("24.00"), "Published"),
    ExperienceSeed("roasted_chicken_rice", "demo_vendor_approved_06", "hawker", "roasted_chicken_rice_map", "[Demo] Roasted Chicken Rice Discovery", "A fictional chicken rice experience presenting roasted chicken, seasoned rice and clearly labelled demonstration accompaniments.", Decimal("26.00"), "Published"),
)


BOOKINGS = (
    BookingSeed("pending_01", "demo_tourist_01", "satay_stories", "future_1", "Pending Approval"),
    BookingSeed("pending_02", "demo_tourist_02", "peranakan_stories", "future_1", "Pending Approval"),
    BookingSeed("pending_03", "demo_tourist_03", "little_india_bites", "future_1", "Pending Approval"),
    BookingSeed("pending_04", "demo_tourist_04", "pandan_desserts", "future_1", "Pending Approval"),
    BookingSeed("pending_05", "demo_tourist_01", "modern_flavours", "future_1", "Pending Approval"),
    BookingSeed("approved_01", "demo_tourist_01", "chinatown_trail", "future_2", "Approved"),
    BookingSeed("approved_02", "demo_tourist_02", "joo_chiat_tasting", "future_2", "Approved"),
    BookingSeed("approved_03", "demo_tourist_03", "spice_heritage", "future_2", "Approved"),
    BookingSeed("approved_04", "demo_tourist_04", "modern_tasting", "future_2", "Approved"),
    BookingSeed("rejected_01", "demo_tourist_01", "kopi_breakfast", "future_3", "Rejected"),
    BookingSeed("rejected_02", "demo_tourist_02", "kueh_colours", "future_3", "Rejected"),
    BookingSeed("rejected_03", "demo_tourist_03", "spice_blending", "future_3", "Rejected"),
    BookingSeed("cancelled_01", "demo_tourist_04", "dumpling_workshop", "future_3", "Cancelled"),
    BookingSeed("cancelled_02", "demo_tourist_01", "laksa_workshop", "future_3", "Cancelled"),
    BookingSeed("cancelled_03", "demo_tourist_02", "little_india_bites", "future_3", "Cancelled"),
    BookingSeed("completed_01", "demo_tourist_01", "satay_stories", "historical", "Completed"),
    BookingSeed("completed_02", "demo_tourist_02", "peranakan_stories", "historical", "Completed"),
    BookingSeed("completed_03", "demo_tourist_03", "little_india_bites", "historical", "Completed"),
    BookingSeed("completed_04", "demo_tourist_04", "pandan_desserts", "historical", "Completed"),
    BookingSeed("completed_05", "demo_tourist_01", "chinatown_trail", "historical", "Completed"),
    BookingSeed("completed_06_review_eligible", "demo_tourist_02", "modern_flavours", "historical", "Completed"),
)


REVIEWS = (
    ReviewSeed("completed_01", 5, "[Demo review] A warm and clearly explained fictional tasting journey."),
    ReviewSeed("completed_02", 4, "[Demo review] The demo flavour stories made the sample experience easy to follow."),
    ReviewSeed("completed_03", 5, "[Demo review] A lively fictional introduction to spice-led neighbourhood food."),
    ReviewSeed("completed_04", 4, "[Demo review] The pandan and coconut theme worked well for this capstone scenario."),
    ReviewSeed("completed_05", 5, "[Demo review] A useful fictional trail for demonstrating itinerary planning."),
)


ITINERARIES = (
    ItinerarySeed("demo_tourist_01", "TasteLocal Demo — Aisha's Food Day", (
        ItineraryItemSeed("kopi_breakfast", 0, "09:30"),
        ItineraryItemSeed("chinatown_trail", 0, "14:00"),
        ItineraryItemSeed("modern_tasting", 1, "19:00"),
    )),
    ItinerarySeed("demo_tourist_02", "TasteLocal Demo — Benjamin's Heritage Plan", (
        ItineraryItemSeed("peranakan_stories", 1, "11:00"),
        ItineraryItemSeed("kueh_colours", 1, "15:00"),
        ItineraryItemSeed("joo_chiat_tasting", 2, "12:30"),
    )),
    ItinerarySeed("demo_tourist_03", "TasteLocal Demo — Charmaine's Spice Trail", (
        ItineraryItemSeed("little_india_bites", 2, "10:30"),
        ItineraryItemSeed("spice_blending", 2, "14:30"),
        ItineraryItemSeed("spice_heritage", None, None),
    )),
    ItinerarySeed("demo_tourist_04", "TasteLocal Demo — Daniel's Modern Bites", (
        ItineraryItemSeed("pandan_desserts", 3, "10:00"),
        ItineraryItemSeed("modern_flavours", 3, "13:30"),
        ItineraryItemSeed("satay_stories", None, None),
    )),
)
