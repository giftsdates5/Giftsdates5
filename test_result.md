#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "Allow users to post 2 profiles: a main profile and a VIP profile posted separately (fully independent anonymous listing with own photos/age/city/nickname, appearing only in the VIP section as its own card, with an option to show/hide VIP on the main profile; publishing stays gated behind VIP Premium)."

## NEW FEATURE (2026-09-16): Global location on signup + distance on browse
## - Signup: choose country/city globally OR press "Detect my location" (browser geolocation + reverse geocode) to auto-fill and store lat/lng
## - Browse & ProfileView: show how far each user is from the viewer in km/m (haversine); raw coords never exposed

backend:
  - task: "Register accepts + stores lat/lng; /profiles and /profiles/{id} compute distance_km via haversine and strip raw lat/lng"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: true
        -agent: "main"
        -comment: "Added lat/lng to RegisterReq and ProfileUpdate; store lat/lng on register; added haversine_km() helper; list_profiles and profile_detail now add distance_km (km from viewer) and remove raw lat/lng from payload. Manual curl verified: Paris user shows distance_km=343.56 to a London viewer and no lat/lng leaks."
        -working: true
        -agent: "testing"
        -comment: "✅ ALL TESTS PASSED (19/19). Created comprehensive test suite backend_test_location_distance.py covering all 5 scenarios from review request. SCENARIO 1 - REGISTER WITH COORDS: Alice (Paris, 48.8566, 2.3522) and Bob (London, 51.5074, -0.1278) successfully registered with lat/lng coordinates. Registration returns token and user object. ✅ SCENARIO 2 - DISTANCE ON BROWSE: Bob browsing with gender=female filter sees Alice with distance_km=343.56 km (correct Paris-London great-circle distance). Raw lat/lng are properly stripped from response (privacy protected). ✅ SCENARIO 3 - DISTANCE ON DETAIL: Bob viewing Alice's profile detail (GET /api/profiles/{alice_id}) shows distance_km=343.56 km. Raw lat/lng are properly stripped (privacy protected). ✅ SCENARIO 4 - NO-COORDS GRACEFUL: Charlie registered successfully WITHOUT lat/lng coordinates (regression test). Charlie (no coords) can browse profiles without crash. When viewer has no coords, distance_km is correctly absent from results (no crash). When Bob (has coords) views Charlie (no coords), distance_km is correctly absent (no crash). ✅ SCENARIO 5 - REGRESSION: Register without lat/lng still works. Gender filter (gender=female) returns 200. Age filter (min_age=25, max_age=35) returns 200. All existing filters working correctly. Distance calculation is accurate (343.56 km for Paris-London), privacy is protected (no raw coordinates exposed), graceful handling when coords are missing (no crashes, distance_km simply absent). Feature is production-ready."


  - task: "Separate VIP profile — save independent fields (age/city/country/gender/bio/show_on_main) + stable public_id"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "PUT /vip/profile now stores independent anonymous fields and a stable vip.public_id. Publish still forced off for non-VIP (can_publish). Need to verify persistence & public_id stability across saves."
        -working: true
        -agent: "testing"
        -comment: "✅ TESTED & WORKING. Created comprehensive test suite (backend_test_separate_vip.py) with 51 test cases. All tests passed. Verified: (1) VIP user can save separate profile with post_mode=separate, nickname, independent age/city/country/gender/bio, show_on_main flag. (2) public_id is created starting with 'v' and remains STABLE across re-saves. (3) All independent fields (nickname='Anastasia', age=25 different from real age 28, city='Moscow' different from real city 'Saint Petersburg') are correctly saved and persisted. (4) published=true for VIP users, can_publish=true. (5) Non-VIP users can save but published is forced to false, can_publish=false."
  - task: "VIP profile preview parameter — owner can preview non-VIP visitor experience with ?preview=nonvip"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Added preview=nonvip query parameter to GET /api/vip/profile/{uid}. When owner uses ?preview=nonvip, they see exactly what a non-VIP/non-premium visitor sees (locked teaser view instead of unlocked owner view)."
        -working: true
        -agent: "testing"
        -comment: "✅ TESTED & WORKING. Created focused test suite (backend_test_preview_param.py) with 23 test cases. All tests passed. Verified: (1) Owner viewing own profile WITHOUT preview gets unlocked owner view (locked=false, is_owner=true, full vip object). (2) Owner viewing own profile WITH ?preview=nonvip gets locked teaser view (locked=true, no is_owner, no full vip object, only teaser fields). (3) REGRESSION: Premium viewer (non-owner) still gets unlocked view (locked=false). (4) REGRESSION: Non-premium viewer (non-owner) still gets locked teaser (locked=true). (5) Separate mode with show_on_main=false: ?preview=nonvip as owner returns 404 (behaves like guest accessing hidden VIP). (6) Separate mode with show_on_main=true: ?preview=nonvip as owner returns locked teaser. Preview functionality working perfectly for both 'together' and 'separate' post modes."
  - task: "GET /vip/profile/{id} resolves by user id OR public_id with anonymity + show_on_main gate"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Separate listing accessed by public_id returns nickname + independent details (real_name hidden for non-owner). Accessed by real user id from a non-owner is 404 when show_on_main is false. Premium lock/teaser preserved."
        -working: true
        -agent: "testing"
        -comment: "✅ TESTED & WORKING. Verified: (1) GET /vip/profile/{public_id} as premium viewer returns 200 with locked=false, name=nickname ('Anastasia'), real_name=null (hidden), is_owner=false, separate=true. (2) GET /vip/profile/{public_id} as owner returns 200 with is_owner=true, real_name='Elena Petrova' (visible to owner). (3) show_on_main=false: GET /vip/profile/{real_user_id} by non-owner returns 404 (VIP hidden from main profile). (4) show_on_main=true: GET /vip/profile/{real_user_id} by non-owner returns 200 with nickname displayed. All anonymization and access control working correctly."
  - task: "Browse /profiles anonymizes separate VIP listings as own card in VIP filter; hides VIP hint on main feed when show_on_main off"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "vip_only browse returns anonymized cards (id=public_id, nickname/vip photos/vip age/city). Non-VIP browse sets is_vip false for separate+show_on_main off."
        -working: true
        -agent: "testing"
        -comment: "✅ TESTED & WORKING. Verified: (1) GET /api/profiles?vip_only=true returns 200 with VIP listing appearing as anonymized card. (2) Listing id=public_id (v715786f63a1cd600), NOT real user_id. (3) name='Anastasia' (nickname), NOT real name 'Elena Petrova'. (4) vip_listing=true flag set. (5) age=25 (VIP age), NOT real age 28. (6) city='Moscow' (VIP city), NOT real city 'Saint Petersburg'. (7) Real name is NOT exposed anywhere in the listing. Complete anonymization working perfectly."
  - task: "profile_detail /profiles/{public_id} returns anonymized VIP listing; vip_book resolves public_id -> owner escrow"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "GET /profiles/{public_id} returns vip_listing object for separate listings. POST /vip/book resolves target by user id or public_id, credits owner escrow, blocks self-booking."
        -working: true
        -agent: "testing"
        -comment: "✅ TESTED & WORKING. Verified: (1) GET /api/profiles/{public_id} returns 200 with vip_listing=true, name='Anastasia' (nickname), age=25 (VIP age), city='Moscow' (VIP city). (2) POST /api/vip/book with target_id=public_id returns 200, creates booking with status='escrow'. (3) Booker correctly debited 2000 coins (5000→3000). (4) Owner escrow correctly credited 2000 coins (0→2000). (5) Booking record to_id points to REAL owner user_id (not public_id), ensuring proper escrow routing. (6) Self-booking rejected with 400 'CANNOT_BOOK_SELF'. All booking flows working correctly with public_id resolution."

frontend:
  - task: "VIP editor separate-mode fields + show/hide VIP on main toggle"
    implemented: true
    working: "NA"
    file: "frontend/src/components/VipEditor.jsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Not yet UI-tested; awaiting user go-ahead for frontend testing."

metadata:
  created_by: "main_agent"
  version: "2.3"
  test_sequence: 4
  run_ui: false

test_plan:
  current_focus:
    - "VIP profile preview parameter — owner can preview non-VIP visitor experience with ?preview=nonvip"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    -agent: "main"
    -message: "Implemented 'separate' VIP profile as a fully independent anonymous listing. Please test backend only: (1) create a VIP-subscribed user, save VIP profile with post_mode=separate and independent age/city/country/gender/nickname/bio + show_on_main; verify vip.public_id is created and stable across re-saves. (2) A premium (non-VIP) viewer browsing with vip_only=true should see the listing as an anonymized card whose id equals public_id and name equals nickname (no real name/main photos). (3) GET /profiles/{public_id} returns vip_listing=true anonymized object. (4) GET /vip/profile/{public_id} as a premium viewer returns nickname + independent city/age and NO real_name; as owner returns is_owner true. (5) With show_on_main=false, GET /vip/profile/{real_user_id} by a non-owner returns 404 (main profile stays unlinked); with show_on_main=true it returns the VIP section. (6) POST /vip/book with target_id=public_id debits booker and credits the real owner's escrow; self-booking blocked. (7) Non-VIP user can still fill/save separate profile but publish is forced off. Note: registration/login flow and coin/premium granting endpoints exist — use POST /premium/buy-with-coins with tier vip after topping coins if needed, or inspect existing test helpers in backend_test.py."
    -agent: "testing"
    -message: "✅ ALL BACKEND TESTS PASSED (51/51). Created comprehensive test suite backend_test_separate_vip.py covering all 7 scenarios requested. Key findings: (1) SAVE: VIP user successfully saves separate profile with all independent fields (nickname, age, city, country, gender, bio, show_on_main). public_id created with 'v' prefix and remains STABLE across re-saves. ✅ (2) ANONYMIZED BROWSE: Premium viewer browsing vip_only=true sees fully anonymized card with id=public_id, name=nickname, no real identity exposed. ✅ (3) DETAIL: GET /profiles/{public_id} returns anonymized VIP listing with vip_listing=true. ✅ (4) VIP DETAIL: GET /vip/profile/{public_id} as premium viewer returns locked=false with nickname, real_name=null; as owner returns is_owner=true with real_name visible. ✅ (5) SHOW/HIDE ON MAIN: show_on_main=false correctly returns 404 when accessing via real user_id; show_on_main=true allows access. ✅ (6) BOOKING: POST /vip/book with public_id correctly debits booker, credits owner escrow, resolves to real owner user_id in booking record. Self-booking properly rejected with CANNOT_BOOK_SELF. ✅ (7) PUBLISH GATE: Non-VIP user can save but published forced to false, can_publish=false, listing not visible in browse. ✅ All anonymization, access control, and booking flows working perfectly. Ready for production."
    -agent: "main"
    -message: "Added preview=nonvip query parameter to GET /api/vip/profile/{uid}. This allows the owner to preview exactly what a non-VIP/non-premium visitor sees (locked teaser view) instead of the unlocked owner view. Please test: (1) Owner views own profile WITHOUT preview -> expect locked=false, is_owner=true (unlocked owner view). (2) Owner views own profile WITH ?preview=nonvip -> expect locked=true, no is_owner (teaser view). (3) Regression: premium viewer (non-owner) still gets unlocked view; non-premium viewer still gets locked teaser. (4) Separate mode regression: with show_on_main=false, ?preview=nonvip as owner should return 404 (like a guest); with show_on_main=true, should return locked teaser."
    -agent: "testing"
    -message: "✅ ALL PREVIEW PARAMETER TESTS PASSED (23/23). Created focused test suite backend_test_preview_param.py covering all requested scenarios. Key findings: (1) OWNER VIEW WITHOUT PREVIEW: Owner viewing own profile without preview parameter correctly returns locked=false, is_owner=true, full vip object present (unlocked owner view). ✅ (2) OWNER VIEW WITH PREVIEW: Owner viewing own profile WITH ?preview=nonvip correctly returns locked=true, no is_owner field, no full vip object, only teaser fields (services_count). This proves owner can preview the non-VIP visitor experience. ✅ (3) REGRESSION - PREMIUM VIEWER: Premium viewer (non-owner) still correctly gets unlocked view (locked=false, is_owner=false, full vip object). ✅ (4) REGRESSION - NON-PREMIUM VIEWER: Non-premium viewer (non-owner) still correctly gets locked teaser (locked=true, no full vip object). ✅ (5) SEPARATE MODE + show_on_main=false: Owner accessing via real user_id with ?preview=nonvip correctly returns 404 (behaves like a guest accessing hidden VIP). ✅ (6) SEPARATE MODE + show_on_main=true: Owner accessing via real user_id with ?preview=nonvip correctly returns locked teaser (locked=true, no is_owner). ✅ Preview functionality working perfectly for both 'together' and 'separate' post modes. No regressions detected in existing VIP profile access patterns."

## FEATURE: Premium-lite tier (blue crown, $14.99, giftable/self-buy 150 coins)
backend:
  - task: "Premium-lite tier: buy-with-coins, gift, stripe checkout, coin-prices, meta, tier flags & perks"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Added premium_lite_until tier. Self-buy & gift for 150 coins (POST /premium/buy-with-coins tier=premium_lite, POST /premium/gift tier=premium_lite). Stripe package premium_lite_monthly ($14.99). /premium/coin-prices and /meta expose lite. has_premium() grants baseline perks (unlimited likes, advanced filters, see who liked you, 3-tier boosted placement) to lite+premium+vip, but VIP content stays is_premium-only so lite CANNOT access VIP content. auth/me & profiles expose is_premium_lite."
        -working: true
        -agent: "testing"
        -comment: "✅ ALL TESTS PASSED (42/42). Created comprehensive test suite backend_test_premium_lite.py covering all 7 scenarios. SCENARIO 1 - SELF-BUY: User with 200 coins successfully buys premium_lite for 150 coins. Response returns tier='premium_lite', premium_lite_until ~30 days ahead. 150 coins correctly debited. GET /api/auth/me shows is_premium_lite=true, is_premium=false, is_vip=false. ✅ SCENARIO 2 - BASELINE PERKS: (a) Unlimited likes: Premium_lite user can like 20+ times without hitting LIKE_LIMIT (429 error). ✅ (b) Advanced filters: GET /api/profiles with intent and online_now filters returns 200 (not 403 PREMIUM_REQUIRED). ✅ (c) See who liked you: GET /api/likes/received returns premium=true with full liker details (id, name, age, city). ✅ SCENARIO 3 - NO VIP CONTENT: Premium_lite user accessing published VIP profile returns locked=true (VIP content blocked). Full premium user accessing same VIP profile returns locked=false (VIP content unlocked). VIP user also gets locked=false. ✅ SCENARIO 4 - GIFT: User B gifts premium_lite to recipient for 150 coins. Gifter correctly debited 150 coins. Recipient GET /api/auth/me shows is_premium_lite=true. ✅ SCENARIO 5 - META/PRICES: GET /api/meta returns premium_lite.amount=14.99 and premium_lite_coins=150. GET /api/premium/coin-prices returns premium_lite=150, premium=300, vip=500. ✅ SCENARIO 6 - INSUFFICIENT: User with 100 coins (< 150) buying premium_lite returns 400 error with 'Insufficient coins' message. ✅ SCENARIO 7 - REGRESSION: Premium tier (300 coins) still sets premium_until and grants is_premium=true. VIP tier (500 coins) still sets vip_until and grants is_vip=true, is_premium=true. VIP user can access VIP content (locked=false). Gift premium and gift vip both work correctly. ✅ All premium-lite functionality working perfectly. VIP content access correctly gated by is_premium/is_vip (not has_premium). Baseline perks correctly granted to lite/premium/vip users via has_premium()."

agent_communication:
    -agent: "main"
    -message: "Test Premium-lite backend: (1) POST /premium/buy-with-coins {tier:premium_lite} debits 150 coins and sets premium_lite_until ~30d; auth/me returns is_premium_lite true, is_premium false, is_vip false. (2) Lite user gets baseline perks: unlimited likes (no LIKE_LIMIT), advanced filters allowed on GET /profiles (no 403 PREMIUM_REQUIRED), GET /likes/received returns premium:true with full liker details. (3) Lite user must NOT access VIP content: GET /vip/profile of a published VIP owner returns locked:true for lite viewer. (4) POST /premium/gift {tier:premium_lite} debits 150 and sets recipient premium_lite_until. (5) /meta exposes premium_lite {amount:14.99} and premium_lite_coins:150. (6) Insufficient coins path errors. (7) Regression: premium & vip buy-with-coins/gift still work (300/500 coins) and vip still unlocks VIP content."
    -agent: "testing"
    -message: "✅ ALL PREMIUM-LITE TESTS PASSED (42/42). Comprehensive testing completed for all 7 scenarios. Key findings: (1) Self-buy working perfectly - 150 coins debited, premium_lite_until set ~30 days ahead, correct tier flags. (2) Baseline perks working - unlimited likes (no LIKE_LIMIT), advanced filters allowed (no PREMIUM_REQUIRED), see who liked you returns full details. (3) VIP content access correctly restricted - lite users get locked=true, premium/vip users get locked=false. (4) Gift functionality working - 150 coins debited from gifter, recipient receives premium_lite. (5) Meta/prices endpoints returning correct values. (6) Insufficient coins error handling working. (7) No regressions - premium and vip tiers still work correctly. Premium-lite tier is production-ready."

## FEATURE: Global location on signup + distance on browse (2026-09-16)
test_plan:
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    -agent: "main"
    -message: "New location feature to test on backend: (1) POST /auth/register now accepts optional lat/lng floats and stores them on the user. (2) GET /profiles as a viewer who has lat/lng returns each profile with a numeric distance_km field (great-circle km) and MUST NOT include raw lat/lng in the response. (3) GET /profiles/{id} same behaviour. (4) If viewer OR target has no coords, distance_km is simply absent (no crash). (5) Regression: registering WITHOUT lat/lng still works and profiles list still returns normally. Suggested check: register A at Paris (48.8566,2.3522) and B at London (51.5074,-0.1278); B browsing should see A with distance_km ≈ 343-344 and no lat/lng keys."
    -agent: "testing"
    -message: "✅ ALL LOCATION + DISTANCE TESTS PASSED (19/19). Created comprehensive test suite backend_test_location_distance.py covering all 5 scenarios from review request. Key findings: (1) REGISTER WITH COORDS: Alice (Paris, 48.8566, 2.3522) and Bob (London, 51.5074, -0.1278) successfully registered with lat/lng. ✅ (2) DISTANCE ON BROWSE: Bob browsing sees Alice with distance_km=343.56 km (correct Paris-London distance). Raw lat/lng properly stripped (privacy protected). ✅ (3) DISTANCE ON DETAIL: Bob viewing Alice's detail shows distance_km=343.56 km. Raw lat/lng properly stripped. ✅ (4) NO-COORDS GRACEFUL: Charlie registered without coords. Charlie (no coords) can browse without crash. When viewer has no coords, distance_km correctly absent. When Bob (has coords) views Charlie (no coords), distance_km correctly absent. No crashes. ✅ (5) REGRESSION: Register without lat/lng works. Gender and age filters work correctly. ✅ Distance calculation accurate (343.56 km), privacy protected (no raw coordinates exposed), graceful handling when coords missing. Feature is production-ready."

