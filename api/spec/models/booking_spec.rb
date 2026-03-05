require "rails_helper"

RSpec.describe Booking, type: :model do
  let(:studio) { create(:studio) }
  let(:instructor) { create(:user, :instructor, studio: studio) }
  let(:template) { create(:class_template, instructor: instructor, capacity: 2) }
  let(:session) { create(:class_session, class_template: template, instructor: instructor) }
  let(:client) { create(:client, studio: studio) }

  describe "creation" do
    it "auto-generates a hex slug on create" do
      booking = create(:booking, client: client, class_session: session, studio: studio)
      expect(booking.slug).to match(/\A[0-9a-f]{8}\z/)
    end

    it "does not overwrite an existing slug" do
      booking = create(:booking, client: client, class_session: session, studio: studio, slug: "abc12345")
      expect(booking.reload.slug).to eq("abc12345")
    end

    it "infers studio from client when studio_id is nil" do
      booking = Booking.new(client: client, class_session: session)
      booking.valid?
      expect(booking.studio_id).to eq(studio.id)
    end

    it "infers studio from class_session when client has no studio" do
      other_studio = create(:studio)
      client_no_studio = Client.new(name: "X", email: "x@x.com")
      session2 = create(:class_session, class_template: template, instructor: instructor,
                        start_time: 3.days.from_now.change(sec: 0))
      booking = Booking.new(client: client_no_studio, class_session: session2)
      booking.valid?
      expect(booking.studio_id).to eq(other_studio.id).or(eq(studio.id))
    end
  end

  describe "status enum" do
    it "defaults to booked" do
      booking = create(:booking, client: client, class_session: session, studio: studio)
      expect(booking.status).to eq("booked")
    end

    it "can be waitlisted" do
      booking = create(:booking, client: client, class_session: session, studio: studio, status: :waitlisted)
      expect(booking.waitlisted?).to be true
    end

    it "can be cancelled" do
      booking = create(:booking, client: client, class_session: session, studio: studio)
      booking.update!(status: :cancelled)
      expect(booking.cancelled?).to be true
    end

    it "can be no_show" do
      booking = create(:booking, client: client, class_session: session, studio: studio)
      booking.update!(status: :no_show)
      expect(booking.no_show?).to be true
    end
  end

  describe "uniqueness validation" do
    it "prevents a client from booking the same session twice" do
      create(:booking, client: client, class_session: session, studio: studio)
      duplicate = Booking.new(client: client, class_session: session, studio: studio)
      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:client_id]).to be_present
    end

    it "allows rebooking after cancellation" do
      b = create(:booking, client: client, class_session: session, studio: studio)
      b.update!(status: :cancelled)
      new_booking = Booking.new(client: client, class_session: session, studio: studio)
      expect(new_booking).to be_valid
    end

    it "slug must be unique" do
      create(:booking, client: client, class_session: session, studio: studio, slug: "deadbeef")
      client2 = create(:client, studio: studio)
      session2 = create(:class_session, class_template: template, instructor: instructor,
                        start_time: 5.days.from_now.change(sec: 0))
      b2 = Booking.new(client: client2, class_session: session2, studio: studio, slug: "deadbeef")
      expect(b2).not_to be_valid
    end
  end
end