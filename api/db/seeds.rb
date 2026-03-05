return if Rails.env.production?

puts "Seeding comprehensive local dev data..."

Time.zone ||= "UTC"

SEED_PASSWORD = "password"

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def upsert_studio!(slug:, name:, tier: "growth")
  studio = Studio.find_or_initialize_by(slug: slug)
  studio.name = name
  studio.invite_code ||= SecureRandom.hex(6)
  studio.save!

  sub = StudioSubscription.find_or_initialize_by(studio: studio)
  sub.tier = tier
  sub.status = "active"
  sub.current_period_end = 1.year.from_now
  sub.save!

  studio
end

def upsert_user!(studio:, email:, name:, role:, password: "password",
                 compensation_type: nil, split_percent: nil, flat_rate_cents: nil)
  u = User.find_or_initialize_by(email: email)
  u.studio = studio
  u.name = name
  u.role = User::ROLES.fetch(role)
  if u.new_record?
    u.password = password
    u.password_confirmation = password
  end
  if role == :instructor
    u.instructor_compensation_type = compensation_type || "revenue_share"
    u.instructor_default_split_percent = split_percent || 50
    u.instructor_default_flat_rate_cents = flat_rate_cents || 0
    u.available_for_sessions = true
  end
  u.save!
  u
end

def upsert_client!(studio:, email:, name:, phone: nil, user: nil)
  c = Client.find_or_initialize_by(studio: studio, email: email)
  c.name = name
  c.phone = phone
  c.user = user if user
  c.save!
  c
end

def upsert_location!(studio:, name:, address:, city:, state:, zip:)
  loc = StudioLocation.find_or_initialize_by(studio: studio, name: name)
  loc.address = address
  loc.city = city
  loc.state = state
  loc.zip = zip
  loc.save!
  loc
end

def upsert_template!(studio:, title:, description:, duration_minutes:, capacity:,
                     price_cents:, currency:, location:, instructor:)
  t = ClassTemplate.find_or_initialize_by(studio: studio, title: title)
  t.description = description
  t.duration_minutes = duration_minutes
  t.capacity = capacity
  t.price_cents = price_cents
  t.currency = currency
  t.studio_location = location
  t.instructor = instructor
  t.save!
  t
end

def upsert_session!(template:, start_time:, room:, instructor:)
  s = ClassSession.find_or_initialize_by(class_template: template, start_time: start_time, archived: false)
  s.studio_id ||= template.studio_id
  s.end_time = start_time + (template.duration_minutes || 50).minutes
  s.capacity = template.capacity
  s.room = room
  s.instructor = instructor
  s.save!
  s
end

def upsert_booking!(client:, session:, status: :booked)
  b = Booking.find_or_initialize_by(client: client, class_session: session)
  b.studio_id ||= client.studio_id
  b.status = status
  b.save!
  b
end

def upsert_membership_plan!(studio:, name:, price_cents:, currency:, reformer_per_month:,
                              mat_per_month:, min_months: 3, active: true)
  p = MembershipPlan.find_or_initialize_by(studio: studio, name: name)
  p.price_cents = price_cents
  p.currency = currency
  p.reformer_classes_per_month = reformer_per_month
  p.mat_classes_per_month = mat_per_month
  p.min_commitment_months = min_months
  p.active = active
  p.auto_renew = true
  p.save!
  p
end

def enroll_client!(client:, plan:, started_at: 3.months.ago.to_date, status: "active")
  cm = ClientMembership.find_or_initialize_by(client: client, membership_plan: plan)
  cm.studio_id ||= client.studio_id
  cm.started_at = started_at
  cm.status = status
  cm.price_cents = plan.price_cents
  cm.currency = plan.currency
  cm.save!
  cm
end

def seed_payment_settings!(studio:, title:, currency: "cad", theme: "dark")
  PaymentSetting.instance_for(studio).update!(
    dashboard_title: title,
    default_currency: currency,
    default_theme: theme,
    clients_page_enabled: true,
  )
end

# ─────────────────────────────────────────────────────────────────────────────
# PLATFORM STUDIO (godmode + moderator home)
# ─────────────────────────────────────────────────────────────────────────────
platform_studio = upsert_studio!(slug: "platform", name: "Platform (Internal)", tier: "premium")
seed_payment_settings!(studio: platform_studio, title: "Platform Admin")

upsert_user!(studio: platform_studio, email: "dvorkin212@gmail.com",
             name: "Dan (Godmode)", role: :owner)

upsert_user!(studio: platform_studio, email: "mod@studioflow.example.com",
             name: "Platform Mod", role: :moderator)

puts "Godmode: dvorkin212@gmail.com / #{SEED_PASSWORD}"
puts "Moderator: mod@studioflow.example.com / #{SEED_PASSWORD}"

# ─────────────────────────────────────────────────────────────────────────────
# STUDIO 1 — Flow Pilates (full setup, CAD, growth tier)
# ─────────────────────────────────────────────────────────────────────────────
studio1 = upsert_studio!(slug: "flow-pilates", name: "Flow Pilates", tier: "premium")
seed_payment_settings!(studio: studio1, title: "Flow Pilates Dashboard", currency: "cad")

owner1  = upsert_user!(studio: studio1, email: "owner@flowpilates.example.com",       name: "Claire Fontaine", role: :owner)
_staff1 = upsert_user!(studio: studio1, email: "staff@flowpilates.example.com",       name: "Marcus Webb",     role: :staff)
instr1a = upsert_user!(studio: studio1, email: "mia.torres@flowpilates.example.com",  name: "Mia Torres",      role: :instructor,
                       compensation_type: "revenue_share", split_percent: 55)
instr1b = upsert_user!(studio: studio1, email: "alex.chen@flowpilates.example.com",   name: "Alex Chen",       role: :instructor,
                       compensation_type: "flat_rate", flat_rate_cents: 6000)
instr1c = upsert_user!(studio: studio1, email: "sofia.rossi@flowpilates.example.com", name: "Sofia Rossi",     role: :instructor,
                       compensation_type: "revenue_share", split_percent: 50)

puts "Flow Pilates owner: #{owner1.email} / #{SEED_PASSWORD}"

loc1a = upsert_location!(studio: studio1, name: "Downtown Loft", address: "123 Market St",   city: "Toronto", state: "ON", zip: "M5H 2N2")
loc1b = upsert_location!(studio: studio1, name: "Uptown Light",  address: "987 Sunrise Ave", city: "Toronto", state: "ON", zip: "M5R 1B8")

tmpl1a = upsert_template!(studio: studio1, title: "Reformer Flow",      description: "Full-body reformer sequence.",    duration_minutes: 55, capacity: 10, price_cents: 3200, currency: "cad", location: loc1a, instructor: instr1a)
tmpl1b = upsert_template!(studio: studio1, title: "Morning Mat Reset",  description: "Gentle mat series.",              duration_minutes: 45, capacity: 14, price_cents: 2400, currency: "cad", location: loc1a, instructor: instr1b)
tmpl1c = upsert_template!(studio: studio1, title: "Lunch Express Core", description: "Quick midday burn.",              duration_minutes: 30, capacity: 12, price_cents: 1800, currency: "cad", location: loc1b, instructor: instr1c)
tmpl1d = upsert_template!(studio: studio1, title: "Evening Restore",    description: "Restorative with breathwork.",    duration_minutes: 60, capacity:  8, price_cents: 3000, currency: "cad", location: loc1b, instructor: instr1a)

plan1a = upsert_membership_plan!(studio: studio1, name: "Starter",   price_cents: 18000, currency: "cad", reformer_per_month: 4,   mat_per_month: 2,   min_months: 1)
plan1b = upsert_membership_plan!(studio: studio1, name: "Growth",    price_cents: 32000, currency: "cad", reformer_per_month: 8,   mat_per_month: 4,   min_months: 3)
plan1c = upsert_membership_plan!(studio: studio1, name: "Unlimited", price_cents: 48000, currency: "cad", reformer_per_month: nil, mat_per_month: nil, min_months: 6)

c1ua = upsert_user!(studio: studio1, email: "jordan.blake@example.com", name: "Jordan Blake", role: :client)
c1a  = upsert_client!(studio: studio1, email: "jordan.blake@example.com", name: "Jordan Blake", phone: "416-555-0101", user: c1ua)
enroll_client!(client: c1a, plan: plan1b)

c1ub = upsert_user!(studio: studio1, email: "taylor.kim@example.com", name: "Taylor Kim", role: :client)
c1b  = upsert_client!(studio: studio1, email: "taylor.kim@example.com", name: "Taylor Kim", phone: "416-555-0102", user: c1ub)
enroll_client!(client: c1b, plan: plan1a)

c1uc = upsert_user!(studio: studio1, email: "sam.rivera@example.com", name: "Sam Rivera", role: :client)
c1c  = upsert_client!(studio: studio1, email: "sam.rivera@example.com", name: "Sam Rivera", phone: "416-555-0103", user: c1uc)
enroll_client!(client: c1c, plan: plan1c)

c1ud = upsert_user!(studio: studio1, email: "riley.moore@example.com", name: "Riley Moore", role: :client)
c1d  = upsert_client!(studio: studio1, email: "riley.moore@example.com", name: "Riley Moore", phone: "416-555-0104", user: c1ud)

c1ue = upsert_user!(studio: studio1, email: "devon.park@example.com", name: "Devon Park", role: :client)
c1e  = upsert_client!(studio: studio1, email: "devon.park@example.com", name: "Devon Park", phone: "416-555-0105", user: c1ue)
enroll_client!(client: c1e, plan: plan1a, status: "cancelled", started_at: 6.months.ago.to_date)

today = Time.zone.today

s1_slots = [
  { hour: 7,  min: 30, tmpl: tmpl1a, room: "Reformer Room A", instructor: instr1a },
  { hour: 10, min: 0,  tmpl: tmpl1b, room: "Mat Room",        instructor: instr1b },
  { hour: 12, min: 0,  tmpl: tmpl1c, room: "Reformer Room B", instructor: instr1c },
  { hour: 18, min: 30, tmpl: tmpl1d, room: "Main Studio",     instructor: instr1a }
]
s1_sessions = []
(-3..2).each do |wo|
  week_start = (today + wo.weeks).beginning_of_week(:monday)
  7.times do |do_|
    date = week_start + do_.days
    s1_slots.each do |slot|
      s1_sessions << upsert_session!(
        template: slot[:tmpl], room: slot[:room], instructor: slot[:instructor],
        start_time: Time.zone.local(date.year, date.month, date.day, slot[:hour], slot[:min])
      )
    end
  end
end

[ [ c1a, 0 ], [ c1a, 4 ], [ c1a, 8 ], [ c1b, 1 ], [ c1b, 5 ],
  [ c1c, 2 ], [ c1c, 6 ], [ c1c, 10 ], [ c1d, 3 ], [ c1d, 7 ], [ c1e, 0 ] ].each do |(cl, idx)|
  status_val = (cl == c1e) ? :cancelled : :booked
  upsert_booking!(client: cl, session: s1_sessions[idx], status: status_val) rescue nil
end

puts "Flow Pilates: #{s1_sessions.size} sessions, 5 clients"

# ─────────────────────────────────────────────────────────────────────────────
# STUDIO 2 — Zen Movement Studio (mid-size, USD, basic tier)
# ─────────────────────────────────────────────────────────────────────────────
studio2 = upsert_studio!(slug: "zen-movement", name: "Zen Movement Studio", tier: "basic")
seed_payment_settings!(studio: studio2, title: "Zen Movement Dashboard", currency: "usd")

owner2  = upsert_user!(studio: studio2, email: "owner@zenmovement.example.com",        name: "Priya Nair",   role: :owner)
_staff2 = upsert_user!(studio: studio2, email: "staff@zenmovement.example.com",        name: "Leo Santos",   role: :staff)
instr2a = upsert_user!(studio: studio2, email: "naomi.wells@zenmovement.example.com",  name: "Naomi Wells",  role: :instructor,
                       compensation_type: "revenue_share", split_percent: 60)
instr2b = upsert_user!(studio: studio2, email: "kai.patel@zenmovement.example.com",    name: "Kai Patel",    role: :instructor,
                       compensation_type: "flat_rate", flat_rate_cents: 5500)

puts "Zen Movement owner: #{owner2.email} / #{SEED_PASSWORD}"

loc2a = upsert_location!(studio: studio2, name: "Studio A", address: "200 Wellness Blvd", city: "Brooklyn", state: "NY", zip: "11201")
loc2b = upsert_location!(studio: studio2, name: "Studio B", address: "200 Wellness Blvd", city: "Brooklyn", state: "NY", zip: "11201")

tmpl2a = upsert_template!(studio: studio2, title: "Power Pilates",     description: "Advanced reformer.",     duration_minutes: 60, capacity:  8, price_cents: 4500, currency: "usd", location: loc2a, instructor: instr2a)
tmpl2b = upsert_template!(studio: studio2, title: "Barre Fusion",      description: "Ballet-barre combo.",    duration_minutes: 50, capacity: 12, price_cents: 3000, currency: "usd", location: loc2b, instructor: instr2b)
tmpl2c = upsert_template!(studio: studio2, title: "Stretch & Release", description: "Deep flexibility work.", duration_minutes: 45, capacity: 10, price_cents: 2800, currency: "usd", location: loc2a, instructor: instr2a)

plan2a = upsert_membership_plan!(studio: studio2, name: "Drop-In Pack",      price_cents:  9000, currency: "usd", reformer_per_month: 3,  mat_per_month:  0, min_months: 1)
plan2b = upsert_membership_plan!(studio: studio2, name: "Monthly Unlimited", price_cents: 25000, currency: "usd", reformer_per_month: 12, mat_per_month: 12, min_months: 3)

c2ua = upsert_user!(studio: studio2, email: "maya.johnson@example.com", name: "Maya Johnson", role: :client)
c2a  = upsert_client!(studio: studio2, email: "maya.johnson@example.com", name: "Maya Johnson", phone: "718-555-0201", user: c2ua)
enroll_client!(client: c2a, plan: plan2b)

c2ub = upsert_user!(studio: studio2, email: "oscar.liu@example.com", name: "Oscar Liu", role: :client)
c2b  = upsert_client!(studio: studio2, email: "oscar.liu@example.com", name: "Oscar Liu", phone: "718-555-0202", user: c2ub)
enroll_client!(client: c2b, plan: plan2a)

c2uc = upsert_user!(studio: studio2, email: "layla.berg@example.com", name: "Layla Berg", role: :client)
c2c  = upsert_client!(studio: studio2, email: "layla.berg@example.com", name: "Layla Berg", phone: "718-555-0203", user: c2uc)

s2_slots = [
  { hour: 9,  min: 0,  tmpl: tmpl2a, room: "Reformer Studio", instructor: instr2a },
  { hour: 11, min: 0,  tmpl: tmpl2b, room: "Main Floor",      instructor: instr2b },
  { hour: 17, min: 30, tmpl: tmpl2c, room: "Reformer Studio", instructor: instr2a },
]
s2_sessions = []
(-2..2).each do |wo|
  week_start = (today + wo.weeks).beginning_of_week(:monday)
  5.times do |do_|
    date = week_start + do_.days
    s2_slots.each do |slot|
      s2_sessions << upsert_session!(
        template: slot[:tmpl], room: slot[:room], instructor: slot[:instructor],
        start_time: Time.zone.local(date.year, date.month, date.day, slot[:hour], slot[:min])
      )
    end
  end
end

[[c2a, 0], [c2a, 3], [c2b, 1], [c2b, 4], [c2c, 2]].each do |(cl, idx)|
  upsert_booking!(client: cl, session: s2_sessions[idx]) rescue nil
end

puts "Zen Movement: #{s2_sessions.size} sessions, 3 clients"

# ─────────────────────────────────────────────────────────────────────────────
# STUDIO 3 — CoreHouse (small, CAD, basic tier)
# ─────────────────────────────────────────────────────────────────────────────
studio3 = upsert_studio!(slug: "corehouse", name: "CoreHouse", tier: "basic")
seed_payment_settings!(studio: studio3, title: "CoreHouse", currency: "cad")

owner3  = upsert_user!(studio: studio3, email: "owner@corehouse.example.com",    name: "Brett Langford", role: :owner)
instr3a = upsert_user!(studio: studio3, email: "petra.wolf@corehouse.example.com", name: "Petra Wolf",   role: :instructor,
                       compensation_type: "flat_rate", flat_rate_cents: 7000)

puts "CoreHouse owner: #{owner3.email} / #{SEED_PASSWORD}"

loc3a = upsert_location!(studio: studio3, name: "Main Room", address: "55 Fitness Lane", city: "Vancouver", state: "BC", zip: "V6B 1A1")

tmpl3a = upsert_template!(studio: studio3, title: "CoreHouse Signature", description: "Full-body reformer.", duration_minutes: 50, capacity: 6, price_cents: 3500, currency: "cad", location: loc3a, instructor: instr3a)
tmpl3b = upsert_template!(studio: studio3, title: "Private Session",     description: "One-on-one work.",   duration_minutes: 60, capacity: 1, price_cents: 9500, currency: "cad", location: loc3a, instructor: instr3a)

c3ua = upsert_user!(studio: studio3, email: "emma.carter@example.com", name: "Emma Carter", role: :client)
c3a  = upsert_client!(studio: studio3, email: "emma.carter@example.com", name: "Emma Carter", phone: "604-555-0301", user: c3ua)
c3ub = upsert_user!(studio: studio3, email: "liam.foster@example.com", name: "Liam Foster", role: :client)
c3b  = upsert_client!(studio: studio3, email: "liam.foster@example.com", name: "Liam Foster", phone: "604-555-0302", user: c3ub)

s3_sessions = []
(-1..2).each do |wo|
  week_start = (today + wo.weeks).beginning_of_week(:monday)
  3.times do |do_|
    date = week_start + (do_ * 2).days
    s3_sessions << upsert_session!(
      template: tmpl3a, start_time: Time.zone.local(date.year, date.month, date.day, 10, 0),
      room: "Main Room", instructor: instr3a
    )
  end
end

upsert_booking!(client: c3a, session: s3_sessions[0]) rescue nil
upsert_booking!(client: c3b, session: s3_sessions[0]) rescue nil
upsert_booking!(client: c3a, session: s3_sessions[1]) rescue nil

puts "CoreHouse: #{s3_sessions.size} sessions, 2 clients"

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
puts ""
puts "━━ SEED ACCOUNTS (all password: #{SEED_PASSWORD}) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
puts "  GODMODE    dvorkin212@gmail.com"
puts "  MODERATOR  mod@studioflow.example.com"
puts "  [Flow Pilates]"
puts "    owner    owner@flowpilates.example.com"
puts "    staff    staff@flowpilates.example.com"
puts "    instrs   mia.torres / alex.chen / sofia.rossi @flowpilates.example.com"
puts "    clients  jordan.blake / taylor.kim / sam.rivera / riley.moore / devon.park @example.com"
puts "  [Zen Movement]"
puts "    owner    owner@zenmovement.example.com"
puts "    staff    staff@zenmovement.example.com"
puts "    instrs   naomi.wells / kai.patel @zenmovement.example.com"
puts "    clients  maya.johnson / oscar.liu / layla.berg @example.com"
puts "  [CoreHouse]"
puts "    owner    owner@corehouse.example.com"
puts "    instr    petra.wolf@corehouse.example.com"
puts "    clients  emma.carter / liam.foster @example.com"
puts "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
puts "Seeding complete."
