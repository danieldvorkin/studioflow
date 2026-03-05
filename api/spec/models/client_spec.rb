require "rails_helper"

RSpec.describe Client, type: :model do
  let(:studio) { create(:studio) }

  describe "validations" do
    it "is valid with name and email" do
      client = Client.new(studio: studio, name: "Alice", email: "alice@example.com")
      expect(client).to be_valid
    end

    it "requires name" do
      client = Client.new(studio: studio, email: "alice@example.com")
      expect(client).not_to be_valid
      expect(client.errors[:name]).to be_present
    end

    it "requires email" do
      client = Client.new(studio: studio, name: "Alice")
      expect(client).not_to be_valid
      expect(client.errors[:email]).to be_present
    end
  end

  describe "associations" do
    it "has many bookings" do
      client = create(:client, studio: studio)
      instructor = create(:user, :instructor, studio: studio)
      template = create(:class_template, instructor: instructor)
      session = create(:class_session, class_template: template, instructor: instructor)
      booking = create(:booking, client: client, class_session: session, studio: studio)
      expect(client.bookings).to include(booking)
    end

    it "belongs to user optionally" do
      client = create(:client, studio: studio, user: nil)
      expect(client).to be_valid
      expect(client.user).to be_nil
    end

    it "can have a user associated" do
      user = create(:user, :client, studio: studio)
      client = create(:client, studio: studio, user: user)
      expect(client.user).to eq(user)
    end
  end
end
