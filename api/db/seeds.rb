return if Rails.env.production?

puts 'Seeding demo Pilates studio data…'

Time.zone ||= 'UTC'

SEED_PASSWORD = ENV.fetch('SEED_PASSWORD', 'password')
OWNER_EMAIL = ENV.fetch('SEED_OWNER_EMAIL', 'owner@studio.example.com')
STAFF_EMAIL = ENV.fetch('SEED_STAFF_EMAIL', 'staff@studio.example.com')
secondary_owner_email = ENV['SEED_SECONDARY_OWNER_EMAIL']

# Convenient secondary owner for local dev.
# Override by setting SEED_SECONDARY_OWNER_EMAIL (set to blank to disable).
secondary_owner_email = secondary_owner_email.presence || 'dvorkin212@gmail.com'

demo_studio = Studio.find_or_create_by!(slug: 'demo') do |s|
  s.name = 'Demo Studio'
end


def upsert_user!(studio:, email:, name:, role:, password:)
  user = User.find_or_initialize_by(email: email)
  user.studio = studio
  user.name = name
  user.role = User::ROLES.fetch(role)

  if user.new_record?
    user.password = password
    user.password_confirmation = password
  end

  user.save!
  user
end

def upsert_location!(studio:, name:, address:, city:, state:, zip:)
  loc = StudioLocation.find_or_initialize_by(studio_id: studio.id, name: name)
  loc.address = address
  loc.city = city
  loc.state = state
  loc.zip = zip
  loc.save!
  loc
end

def upsert_template!(studio:, title:, description:, duration_minutes:, capacity:, price_cents:, currency:, location:, instructor:)
  tpl = ClassTemplate.find_or_initialize_by(studio_id: studio.id, title: title)
  tpl.studio = studio
  tpl.description = description
  tpl.duration_minutes = duration_minutes
  tpl.capacity = capacity
  tpl.price_cents = price_cents
  tpl.currency = currency
  tpl.studio_location = location
  tpl.instructor = instructor
  tpl.save!
  tpl
end

def upsert_session!(template:, start_time:, room:, instructor:)
  session = ClassSession.find_or_initialize_by(class_template: template, start_time: start_time, archived: false)
  session.studio_id ||= template.studio_id
  session.end_time = start_time + (template.duration_minutes || 50).minutes
  session.capacity = template.capacity
  session.room = room
  session.instructor = instructor
  session.save!
  session
end

def upsert_booking!(client:, session:)
  booking = Booking.find_or_initialize_by(client: client, class_session: session)
  booking.studio_id ||= client.studio_id
  booking.status ||= :booked
  booking.status = :booked if booking.cancelled?
  booking.save!
  booking
end

# Ensure app-level settings exist for GraphQL queries.
PaymentSetting.instance_for(demo_studio).update!(
  dashboard_title: 'Pilates Studio Dashboard',
  default_currency: 'cad',
  default_theme: 'dark',
  clients_page_enabled: true,
)

owner = upsert_user!(studio: demo_studio, email: OWNER_EMAIL, name: 'Studio Owner', role: :owner, password: SEED_PASSWORD)
puts "Owner: #{owner.email} / #{SEED_PASSWORD}"

staff = upsert_user!(studio: demo_studio, email: STAFF_EMAIL, name: 'Front Desk Staff', role: :staff, password: SEED_PASSWORD)
puts "Staff: #{staff.email} / #{SEED_PASSWORD}"

if secondary_owner_email.present?
  secondary_owner = upsert_user!(studio: demo_studio, email: secondary_owner_email, name: 'Secondary Owner', role: :owner, password: SEED_PASSWORD)
  puts "Secondary owner: #{secondary_owner.email} / #{SEED_PASSWORD}"
end

instructors = [
  { email: 'mia.torres@studio.example.com', name: 'Mia Torres' },
  { email: 'alex.chen@studio.example.com', name: 'Alex Chen' },
  { email: 'sofia.rossi@studio.example.com', name: 'Sofia Rossi' }
].map do |attrs|
  upsert_user!(studio: demo_studio, email: attrs[:email], name: attrs[:name], role: :instructor, password: SEED_PASSWORD)
end

downtown = upsert_location!(
  studio: demo_studio,
  name: 'Downtown Loft',
  address: '123 Market St',
  city: 'Metropolis',
  state: 'NY',
  zip: '10001',
)

uptown = upsert_location!(
  studio: demo_studio,
  name: 'Uptown Light',
  address: '987 Sunrise Ave',
  city: 'Metropolis',
  state: 'NY',
  zip: '10019',
)

templates = [
  {
    title: 'Reformer Flow',
    description: 'A dynamic full-body reformer sequence focusing on strength and length.',
    duration_minutes: 55,
    capacity: 10,
    price_cents: 3200,
    currency: 'cad',
    location: downtown,
    instructor: instructors[0],
    room: 'Reformer Room'
  },
  {
    title: 'Morning Mat Reset',
    description: 'A gentle mat series to wake up the spine and core.',
    duration_minutes: 45,
    capacity: 14,
    price_cents: 2400,
    currency: 'cad',
    location: downtown,
    instructor: instructors[1],
    room: 'Mat Room'
  },
  {
    title: 'Lunch Express Core',
    description: 'A high-energy midday burn for busy schedules.',
    duration_minutes: 30,
    capacity: 12,
    price_cents: 1800,
    currency: 'cad',
    location: uptown,
    instructor: instructors[2],
    room: 'Main Studio'
  },
  {
    title: 'Evening Restore',
    description: 'A slow restorative session with breathwork and mobility focus.',
    duration_minutes: 60,
    capacity: 8,
    price_cents: 3000,
    currency: 'cad',
    location: uptown,
    instructor: instructors[0],
    room: 'Main Studio'
  }
].map do |attrs|
  tpl = upsert_template!(
    studio: demo_studio,
    title: attrs[:title],
    description: attrs[:description],
    duration_minutes: attrs[:duration_minutes],
    capacity: attrs[:capacity],
    price_cents: attrs[:price_cents],
    currency: attrs[:currency],
    location: attrs[:location],
    instructor: attrs[:instructor],
  )
  attrs.merge(template: tpl)
end

clients = [
  { name: 'Jordan Blake', email: 'jordan.blake@example.com', phone: '555-0101' },
  { name: 'Taylor Kim', email: 'taylor.kim@example.com', phone: '555-0102' },
  { name: 'Sam Rivera', email: 'sam.rivera@example.com', phone: '555-0103' },
  { name: 'Riley Moore', email: 'riley.moore@example.com', phone: '555-0104' }
].map do |attrs|
  user = upsert_user!(studio: demo_studio, email: attrs[:email], name: attrs[:name], role: :client, password: SEED_PASSWORD)
  client = Client.find_or_initialize_by(studio_id: demo_studio.id, email: attrs[:email])
  client.studio_id ||= demo_studio.id
  client.name = attrs[:name]
  client.phone = attrs[:phone]
  client.user = user
  client.save!
  client
end

today = Time.zone.today

# Create 2 weeks of sessions starting this week.
start_day = today.beginning_of_week(:monday)

session_slots = [
  { hour: 7, min: 30, template_idx: 1 },
  { hour: 12, min: 0, template_idx: 2 },
  { hour: 18, min: 0, template_idx: 0 }
]

sessions = []

14.times do |day_offset|
  date = start_day + day_offset.days
  session_slots.each do |slot|
    tpl = templates.fetch(slot[:template_idx])
    start_time = Time.zone.local(date.year, date.month, date.day, slot[:hour], slot[:min])
    sessions << upsert_session!(
      template: tpl[:template],
      start_time: start_time,
      room: tpl[:room],
      instructor: tpl[:instructor],
    )
  end
end

# Seed a handful of bookings so the client UI isn't empty.
upsert_booking!(client: clients[0], session: sessions[0])
upsert_booking!(client: clients[0], session: sessions[3])
upsert_booking!(client: clients[1], session: sessions[1])
upsert_booking!(client: clients[2], session: sessions[2])
upsert_booking!(client: clients[3], session: sessions[4])

puts 'Seeding complete.'
