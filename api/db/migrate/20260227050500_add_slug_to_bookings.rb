class AddSlugToBookings < ActiveRecord::Migration[7.1]
  def up
    add_column :bookings, :slug, :string
    add_index :bookings, :slug, unique: true

    say_with_time "Backfilling booking slugs" do
      require 'securerandom'
      Booking.reset_column_information

      Booking.find_each do |booking|
        next if booking.slug.present?

        slug = nil
        loop do
          candidate = SecureRandom.hex(4) # 8-char hex code
          unless Booking.exists?(slug: candidate)
            slug = candidate
            break
          end
        end

        booking.update_columns(slug: slug) if slug
      end
    end
  end

  def down
    remove_index :bookings, :slug if index_exists?(:bookings, :slug)
    remove_column :bookings, :slug if column_exists?(:bookings, :slug)
  end
end
