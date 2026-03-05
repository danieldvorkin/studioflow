require "rails_helper"

RSpec.describe ClassSession, type: :model do
  let(:studio) { create(:studio) }
  let(:instructor) { create(:user, :instructor, studio: studio) }
  let(:template) { create(:class_template, instructor: instructor, capacity: 5, duration_minutes: 50) }

  def build_session(**attrs)
    ClassSession.new(
      class_template: template,
      studio: studio,
      instructor: instructor,
      start_time: 3.days.from_now.change(sec: 0),
      room: "Room A",
      **attrs
    )
  end

  describe "#seats_available" do
    it "returns full capacity when no bookings exist" do
      cs = create(:class_session, class_template: template, instructor: instructor)
      expect(cs.seats_available).to eq(5)
    end

    it "decrements when booked bookings exist" do
      cs = create(:class_session, class_template: template, instructor: instructor)
      2.times { create(:booking, class_session: cs, client: create(:client, studio: studio)) }
      expect(cs.seats_available).to eq(3)
    end

    it "does not decrement for cancelled bookings" do
      cs = create(:class_session, class_template: template, instructor: instructor)
      b = create(:booking, class_session: cs, client: create(:client, studio: studio))
      b.update!(status: :cancelled)
      expect(cs.seats_available).to eq(5)
    end

    it "uses the session-level capacity override when set" do
      cs = create(:class_session, class_template: template, instructor: instructor, capacity: 2)
      expect(cs.seats_available).to eq(2)
    end
  end

  describe "#effective_end_time" do
    it "uses end_time if set" do
      start = 3.days.from_now.change(sec: 0)
      cs = build_session(start_time: start, end_time: start + 60.minutes)
      expect(cs.effective_end_time).to eq(start + 60.minutes)
    end

    it "falls back to template duration_minutes" do
      start = 3.days.from_now.change(sec: 0)
      cs = build_session(start_time: start, end_time: nil)
      expect(cs.effective_end_time).to eq(start + 50.minutes)
    end

    it "defaults to 50 minutes when template has no duration" do
      t = create(:class_template, instructor: instructor, duration_minutes: nil)
      start = 3.days.from_now.change(sec: 0)
      cs = ClassSession.new(class_template: t, studio: studio, instructor: instructor,
                            start_time: start, end_time: nil, room: "Room Z")
      expect(cs.effective_end_time).to eq(start + 50.minutes)
    end
  end

  describe "validations" do
    it "is invalid without a start_time" do
      cs = build_session(start_time: nil)
      expect(cs).not_to be_valid
      expect(cs.errors[:start_time]).to be_present
    end

    it "rejects end_time before start_time" do
      start = 3.days.from_now.change(sec: 0)
      cs = build_session(start_time: start, end_time: start - 1.minute)
      expect(cs).not_to be_valid
      expect(cs.errors[:end_time]).to be_present
    end

    it "rejects duplicate template+start_time" do
      start = 4.days.from_now.change(sec: 0)
      create(:class_session, class_template: template, instructor: instructor, start_time: start, room: "Room A")
      dup = build_session(start_time: start)
      expect(dup).not_to be_valid
      expect(dup.errors[:start_time]).to be_present
    end

    it "rejects bundle_spots without bundle_enabled" do
      cs = build_session(bundle_enabled: true, bundle_spots: 0)
      expect(cs).not_to be_valid
      expect(cs.errors[:bundle_spots]).to be_present
    end

    it "rejects bundle_spots exceeding capacity" do
      cs = build_session(capacity: 5, bundle_enabled: true, bundle_spots: 10)
      expect(cs).not_to be_valid
      expect(cs.errors[:bundle_spots]).to be_present
    end

    it "is valid with bundle_spots within capacity" do
      cs = build_session(capacity: 5, bundle_enabled: true, bundle_spots: 3,
                         start_time: 6.days.from_now.change(sec: 0), room: "Room B")
      expect(cs).to be_valid
    end

    it "prevents overlapping instructor sessions" do
      start = 7.days.from_now.change(sec: 0)
      create(:class_session, class_template: template, instructor: instructor,
             start_time: start, room: "Room A")
      overlap = build_session(start_time: start + 20.minutes, room: "Room B")
      expect(overlap).not_to be_valid
      expect(overlap.errors[:base].join).to match(/overlaps/i)
    end
  end
end