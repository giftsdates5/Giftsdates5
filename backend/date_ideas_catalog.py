"""First-date idea catalog for GiftsDates. Builds ~all ideas with auto-derived
metadata (budget/duration/environment/style/tags/flags). English only."""
import re
from datetime import datetime, timezone

# slug -> (label, [idea names])
RAW = {
    "coffee_casual": ("Coffee & Casual", [
        "Coffee date", "Tea date", "Café date", "Dessert and coffee", "Breakfast date", "Brunch date",
        "Smoothie date", "Bakery date", "Donut date", "Bubble tea date", "Ice cream date", "Hot chocolate date",
        "Visit a local café", "Try a new coffee shop", "Grab coffee and take a walk"]),
    "food": ("Food Dates", [
        "Casual dinner", "Lunch date", "Brunch", "Pizza date", "Sushi date", "Taco date", "Burger date",
        "Food truck date", "Street food date", "Dessert date", "Try a new restaurant", "Explore a food market",
        "Food hall date", "Share small plates", "Try each other's favorite food", "Restaurant roulette",
        "Cook a simple meal together"]),
    "walk_explore": ("Walk & Explore", [
        "Park walk", "Downtown walk", "Waterfront walk", "Beach walk", "Nature walk", "Botanical garden walk",
        "Neighborhood exploration", "Explore a new part of the city", "Scenic walk", "Sunset walk",
        "Visit a local landmark", "Explore a historic neighborhood", "Photography walk", "Dog-friendly walk",
        "Walk and get ice cream"]),
    "creative": ("Creative Dates", [
        "Pottery class", "Painting class", "Art workshop", "Paint night", "Drawing class", "Jewelry-making class",
        "Candle-making class", "Flower-arranging workshop", "Cooking class", "Baking class", "Craft workshop",
        "Make something together", "Visit a local art studio", "Visit an art gallery"]),
    "fun_games": ("Fun & Games", [
        "Bowling", "Mini golf", "Arcade", "Board games", "Trivia night", "Escape room", "Laser tag",
        "VR experience", "Pool / billiards", "Darts", "Ping pong", "Shuffleboard", "Go-karting", "Carnival",
        "Amusement park", "Puzzle challenge"]),
    "entertainment": ("Entertainment", [
        "Movie theater", "Outdoor movie", "Drive-in movie", "Theater show", "Comedy show", "Stand-up comedy",
        "Live music", "Concert", "Local performance", "Open mic night", "Dance performance", "Magic show",
        "Cultural event", "Festival", "Local community event"]),
    "outdoor": ("Outdoor Dates", [
        "Picnic", "Hiking", "Easy nature trail", "Bike ride", "Scenic drive", "Beach day", "Visit a lake",
        "Botanical garden", "Zoo", "Aquarium", "Farmers' market", "Outdoor festival", "Stargazing",
        "Watch the sunset", "Visit a viewpoint", "Explore a nature reserve"]),
    "animal_nature": ("Animal & Nature", [
        "Visit a zoo", "Visit an aquarium", "Visit a pet-friendly café", "Animal sanctuary visit",
        "Horse farm visit", "Nature center", "Bird watching", "Butterfly garden", "Dog park walk",
        "Volunteer at an animal shelter"]),
    "culture_learning": ("Culture & Learning", [
        "Museum date", "Art museum", "History museum", "Science museum", "Local history tour",
        "Architecture tour", "Cultural center", "Bookstore date", "Library visit", "Public lecture",
        "Educational workshop", "Historical landmark tour", "Local gallery tour"]),
    "shopping": ("Shopping & Browsing", [
        "Record store date", "Thrift store date", "Vintage shop date", "Flea market", "Antique store",
        "Browse a shopping district", "Window shopping", "Pick a small gift for each other",
        "Build a fun outfit for each other"]),
    "music": ("Music Dates", [
        "Live band", "Jazz show", "Acoustic performance", "Open mic", "Karaoke", "Music festival",
        "Record store browsing", "Listen to music at a café", "Dance class", "Salsa class", "Ballroom dance class"]),
    "active": ("Active Dates", [
        "Casual bike ride", "Roller skating", "Ice skating", "Tennis", "Badminton", "Table tennis",
        "Rock climbing", "Yoga class", "Swimming", "Kayaking", "Canoeing", "Easy hike"]),
    "romantic": ("Romantic First Dates", [
        "Sunset picnic", "Scenic viewpoint", "Candlelit dinner", "Walk under the city lights", "Rooftop dinner",
        "Dinner with a view", "Scenic boat ride", "Romantic garden walk", "Live music dinner"]),
    "budget": ("Budget-Friendly First Dates", [
        "Free museum", "Coffee and a walk", "Ice cream walk", "Free local event", "Bookstore browsing",
        "Sunset watching", "Free concert", "Explore downtown", "Public art tour", "Free community festival"]),
    "unique": ("Unique First Dates", [
        "Random restaurant challenge", "Pick a random place on the map", "Explore a neighborhood you've never visited",
        "Take a disposable-camera photo walk", "Create a shared playlist", "Try three different desserts",
        "Visit three cafés in one afternoon", "Have a 'yes or no' food challenge", "Take a local mystery tour",
        "Visit a quirky museum", "Find the best dessert in town", "Create a mini bucket list together",
        "Have a themed date", "Plan a date using only coin flips"]),
    "rainy": ("Rainy Day First Dates", [
        "Cozy café", "Board game café", "Indoor market", "Indoor mini golf", "Indoor climbing"]),
    "winter": ("Winter First Dates", [
        "Winter market", "Snowy park walk", "Ski resort day", "Snowshoeing", "Winter festival", "Movie night"]),
    "summer": ("Summer First Dates", [
        "Outdoor concert", "Food festival", "Boat ride"]),
    "city": ("City First Dates", [
        "Downtown coffee", "Rooftop restaurant", "City viewpoint", "Street food tour", "Walking tour",
        "Local market", "City photography walk", "Explore a new neighborhood"]),
    "simple": ("Simple First Dates", [
        "Coffee and conversation", "Walk and talk", "Visit a bookstore", "Browse a local market",
        "Visit a park", "Grab a dessert"]),
    "conversation": ("Conversation-Focused Dates", [
        "Tea and conversation", "Long walk", "Bookstore and coffee", "Museum and coffee",
        "Dessert and conversation", "Quiet café", "Farmers' market and walk"]),
    "social": ("Social First Dates", [
        "Group board games", "Community event", "Public event", "Group cooking class"]),
    "instagram": ("Instagram-Worthy First Dates", [
        "Rooftop café", "Colorful market", "City lights walk", "Beach sunset", "Flower garden",
        "Street art tour", "Photo walk", "Beautiful café"]),
    "adventure": ("Adventure First Dates", [
        "Scenic road trip", "Zipline", "Horseback riding", "Cycling adventure", "Explore a nearby town",
        "Visit a waterfall", "Nature trail", "Scenic lookout"]),
    "surprise": ("Surprise Me First Dates", [
        "Surprise café", "Mystery restaurant", "Random destination", "Secret activity", "Surprise picnic",
        "Mystery walk", "Choose each other's dessert", "Spin-the-wheel date", "Random activity challenge",
        "You plan the first half, I plan the second half"]),
}

CAT_STYLE = {
    "coffee_casual": "casual", "food": "food", "walk_explore": "casual", "creative": "creative",
    "fun_games": "entertainment", "entertainment": "entertainment", "outdoor": "active",
    "animal_nature": "casual", "culture_learning": "conversation", "shopping": "casual", "music": "entertainment",
    "active": "active", "romantic": "romantic", "budget": "casual", "unique": "creative", "rainy": "casual",
    "winter": "active", "summer": "active", "city": "casual", "simple": "conversation",
    "conversation": "conversation", "social": "entertainment", "instagram": "romantic", "adventure": "active",
    "surprise": "creative",
}
CAT_ENV = {
    "coffee_casual": "indoor", "food": "indoor", "walk_explore": "outdoor", "creative": "indoor",
    "fun_games": "indoor", "entertainment": "indoor", "outdoor": "outdoor", "animal_nature": "outdoor",
    "culture_learning": "indoor", "shopping": "indoor", "music": "indoor", "active": "both", "romantic": "both",
    "budget": "outdoor", "unique": "both", "rainy": "indoor", "winter": "both", "summer": "outdoor",
    "city": "both", "simple": "both", "conversation": "both", "social": "indoor", "instagram": "outdoor",
    "adventure": "outdoor", "surprise": "both",
}

OUT_KW = ["walk", "park", "beach", "hike", "hiking", "picnic", "outdoor", "garden", "sunset", "stargaz",
          "bike", "cycling", "kayak", "canoe", "boat", "trail", "road trip", "zoo", "farmers", "viewpoint",
          "lookout", "waterfall", "nature", "festival", "zipline", "horseback", "drive", "snow", "ski", "lake",
          "waterfront", "downtown"]
IN_KW = ["museum", "gallery", "café", "cafe", "coffee", "bowling", "arcade", "movie", "theater", "class",
         "indoor", "bookstore", "library", "restaurant", "cooking", "baking", "karaoke", "escape room",
         "board game", "pottery", "painting", "vr", "laser", "lecture", "workshop", "billiard", "darts",
         "ping pong", "cozy", "quiet"]
FREE_KW = ["free", "window shopping", "park walk", "walk and talk", "sunset watching", "stargazing",
           "library visit", "bookstore browsing", "public art", "browse a", "window", "watch the sunset",
           "beach walk", "nature walk", "scenic walk", "photography walk", "photo walk", "dog park",
           "bird watching", "coin flip"]
HIGH_KW = ["concert", "ski resort", "amusement park", "go-kart", "zipline", "horseback", "rooftop dinner",
           "candlelit", "boat ride", "scenic boat", "road trip", "escape room", "carnival", "live music dinner",
           "dinner with a view"]
LOW_KW = ["coffee", "tea", "ice cream", "dessert", "donut", "bakery", "smoothie", "bubble tea", "hot chocolate",
          "bowling", "mini golf", "arcade", "brunch", "lunch", "pizza", "taco", "burger", "cozy café", "karaoke"]
SHORT_KW = ["coffee", "tea", "ice cream", "dessert", "donut", "smoothie", "bubble tea", "hot chocolate",
            "breakfast", "grab a dessert", "grab coffee"]
LONG_KW = ["hike", "hiking", "road trip", "amusement park", "ski", "festival", "kayak", "canoe", "boat",
           "adventure", "zoo", "aquarium", "waterfall", "zipline", "horseback", "carnival"]
FOOD_KW = ["coffee", "tea", "café", "cafe", "dinner", "lunch", "brunch", "breakfast", "pizza", "sushi", "taco",
           "burger", "dessert", "donut", "bakery", "smoothie", "bubble tea", "ice cream", "food", "restaurant",
           "cook", "baking", "small plates", "hot chocolate", "snack"]
CONV_KW = ["conversation", "walk and talk", "coffee", "tea", "bookstore", "museum", "long walk", "quiet"]
ENT_KW = ["movie", "theater", "comedy", "concert", "music", "show", "karaoke", "arcade", "bowling", "game",
          "trivia", "festival", "performance", "magic", "carnival"]
ROM_KW = ["sunset", "candlelit", "rooftop", "romantic", "city lights", "flower", "scenic", "picnic",
          "dinner with a view", "boat", "stargaz"]
CRE_KW = ["pottery", "painting", "paint", "drawing", "craft", "make something", "jewelry", "candle",
          "flower-arranging", "cooking class", "baking class", "diy", "playlist", "themed", "create", "mystery",
          "surprise", "random", "quirky", "disposable-camera"]
ACT_KW = ["hike", "hiking", "bike", "cycling", "skating", "climbing", "tennis", "badminton", "swimming",
          "kayak", "canoe", "dance", "yoga", "go-kart", "roller", "walk", "trail", "zipline", "horseback"]


def _slug(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def _any(name, kws):
    n = name.lower()
    return any(k in n for k in kws)


def build_catalog():
    # name -> set of categories it appears in (first is primary)
    order = []
    cats_of = {}
    for slug, (_label, names) in RAW.items():
        for nm in names:
            if nm not in cats_of:
                cats_of[nm] = []
                order.append(nm)
            cats_of[nm].append(slug)
    now = datetime.now(timezone.utc).isoformat()
    out = []
    for nm in order:
        cats = cats_of[nm]
        primary = cats[0]
        # environment
        if _any(nm, OUT_KW) and _any(nm, IN_KW):
            env = "both"
        elif _any(nm, OUT_KW):
            env = "outdoor"
        elif _any(nm, IN_KW):
            env = "indoor"
        else:
            env = CAT_ENV[primary]
        # budget
        if _any(nm, FREE_KW):
            budget = "free"
        elif _any(nm, HIGH_KW):
            budget = "high"
        elif _any(nm, LOW_KW):
            budget = "low"
        else:
            budget = "medium"
        # duration
        if _any(nm, SHORT_KW):
            duration = "short"
        elif _any(nm, LONG_KW):
            duration = "long"
        else:
            duration = "medium"
        style = CAT_STYLE[primary]
        # boolean flags (union of category styles + keyword hits)
        cat_styles = {CAT_STYLE[c] for c in cats}
        casual = "casual" in cat_styles or primary in ("coffee_casual", "walk_explore", "simple", "shopping")
        food = "food" in cat_styles or _any(nm, FOOD_KW)
        conversation = "conversation" in cat_styles or _any(nm, CONV_KW)
        entertainment = "entertainment" in cat_styles or _any(nm, ENT_KW)
        romantic = "romantic" in cat_styles or _any(nm, ROM_KW)
        creative = "creative" in cat_styles or _any(nm, CRE_KW)
        style_active = "active" in cat_styles or _any(nm, ACT_KW)
        indoor = env in ("indoor", "both")
        outdoor = env in ("outdoor", "both")
        free = budget == "free"
        tags = sorted({primary} | cat_styles | {env, budget, duration})
        desc = f"{nm} — a {style} first-date idea, {('free' if free else budget + '-budget')}, {duration} duration, {env}."
        out.append({
            "id": _slug(nm), "name": nm, "category": primary, "category_label": RAW[primary][0],
            "all_categories": cats, "description": desc, "budget_level": budget, "duration": duration,
            "environment": env, "style": style, "tags": tags,
            "indoor": indoor, "outdoor": outdoor, "casual": casual, "romantic": romantic, "creative": creative,
            "style_active": style_active, "food": food, "conversation": conversation, "entertainment": entertainment,
            "free": free, "active": True, "created_at": now,
        })
    return out



# Representative photo per category (Unsplash). Shown on idea cards in the invite modal.
CAT_IMG = {
    "coffee_casual": "https://images.unsplash.com/photo-1469631423273-6995642a6a40?crop=entropy&cs=srgb&fm=jpg&q=80&w=500&ixlib=rb-4.1.0",
    "food": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?crop=entropy&cs=srgb&fm=jpg&q=80&w=500&ixlib=rb-4.1.0",
    "walk_explore": "https://images.unsplash.com/photo-1767259119685-b78a6ea25423?crop=entropy&cs=srgb&fm=jpg&q=80&w=500&ixlib=rb-4.1.0",
    "creative": "https://images.unsplash.com/photo-1590605095243-072811dbe64c?crop=entropy&cs=srgb&fm=jpg&q=80&w=500&ixlib=rb-4.1.0",
    "fun_games": "https://images.unsplash.com/photo-1558324190-c940eb141401?crop=entropy&cs=srgb&fm=jpg&q=80&w=500&ixlib=rb-4.1.0",
    "entertainment": "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?crop=entropy&cs=srgb&fm=jpg&q=80&w=500&ixlib=rb-4.1.0",
    "outdoor": "https://images.unsplash.com/photo-1731186622228-38f68d3f64ad?crop=entropy&cs=srgb&fm=jpg&q=80&w=500&ixlib=rb-4.1.0",
    "animal_nature": "https://images.unsplash.com/photo-1599492816933-2101fe60bc72?crop=entropy&cs=srgb&fm=jpg&q=80&w=500&ixlib=rb-4.1.0",
    "culture_learning": "https://images.unsplash.com/photo-1565799515768-2dcfd834625c?crop=entropy&cs=srgb&fm=jpg&q=80&w=500&ixlib=rb-4.1.0",
    "shopping": "https://images.unsplash.com/photo-1488841714725-bb4c32d1ac94?crop=entropy&cs=srgb&fm=jpg&q=80&w=500&ixlib=rb-4.1.0",
    "music": "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?crop=entropy&cs=srgb&fm=jpg&q=80&w=500&ixlib=rb-4.1.0",
    "active": "https://images.unsplash.com/photo-1609987052013-0f4e84e9ff5d?crop=entropy&cs=srgb&fm=jpg&q=80&w=500&ixlib=rb-4.1.0",
    "romantic": "https://images.unsplash.com/photo-1513279922550-250c2129b13a?crop=entropy&cs=srgb&fm=jpg&q=80&w=500&ixlib=rb-4.1.0",
    "budget": "https://images.unsplash.com/photo-1505908846027-e6ad54bc8ddc?crop=entropy&cs=srgb&fm=jpg&q=80&w=500&ixlib=rb-4.1.0",
    "unique": "https://images.unsplash.com/photo-1544441452-326ff5a947fd?crop=entropy&cs=srgb&fm=jpg&q=80&w=500&ixlib=rb-4.1.0",
    "rainy": "https://images.unsplash.com/photo-1698767747188-22daa33ea9e5?crop=entropy&cs=srgb&fm=jpg&q=80&w=500&ixlib=rb-4.1.0",
    "winter": "https://images.unsplash.com/photo-1544176617-98a2c9f5ba9e?crop=entropy&cs=srgb&fm=jpg&q=80&w=500&ixlib=rb-4.1.0",
    "summer": "https://images.unsplash.com/photo-1684348406379-950ef79e81c9?crop=entropy&cs=srgb&fm=jpg&q=80&w=500&ixlib=rb-4.1.0",
    "city": "https://images.unsplash.com/photo-1635438556492-cff83abdd3c2?crop=entropy&cs=srgb&fm=jpg&q=80&w=500&ixlib=rb-4.1.0",
    "simple": "https://images.unsplash.com/photo-1640037984424-ac1a02cb742a?crop=entropy&cs=srgb&fm=jpg&q=80&w=500&ixlib=rb-4.1.0",
    "conversation": "https://images.unsplash.com/photo-1604881988758-f76ad2f7aac1?crop=entropy&cs=srgb&fm=jpg&q=80&w=500&ixlib=rb-4.1.0",
    "social": "https://images.unsplash.com/photo-1506869640319-fe1a24fd76dc?crop=entropy&cs=srgb&fm=jpg&q=80&w=500&ixlib=rb-4.1.0",
    "instagram": "https://images.unsplash.com/photo-1483648969698-5e7dcaa3444f?crop=entropy&cs=srgb&fm=jpg&q=80&w=500&ixlib=rb-4.1.0",
    "adventure": "https://images.unsplash.com/photo-1494822493217-c9840aba840c?crop=entropy&cs=srgb&fm=jpg&q=80&w=500&ixlib=rb-4.1.0",
    "surprise": "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?crop=entropy&cs=srgb&fm=jpg&q=80&w=500&ixlib=rb-4.1.0",
}
