# frozen_string_literal: true

class StudioPage < ApplicationRecord
  belongs_to :studio

  validates :title, presence: true
  validates :slug,  presence: true, uniqueness: { scope: :studio_id }
  validates :position, numericality: { only_integer: true, greater_than_or_equal_to: 0 }

  before_validation :generate_slug, if: -> { slug.blank? && title.present? }
  after_save :purge_removed_images, if: :saved_change_to_content?

  scope :published, -> { where(published: true) }
  scope :ordered,   -> { order(:position, :created_at) }

  private

  # When content is saved, diff the old and new HTML for ActiveStorage blob URLs.
  # Any image that was present before but is gone now gets purged from storage
  # (DigitalOcean Spaces in production) so we don't accumulate orphan files.
  def purge_removed_images
    old_content, new_content = saved_change_to_content
    old_signed_ids = extract_blob_signed_ids(old_content).to_set
    new_signed_ids = extract_blob_signed_ids(new_content).to_set

    (old_signed_ids - new_signed_ids).each do |signed_id|
      blob = ActiveStorage::Blob.find_signed(signed_id)
      blob&.purge_later
    rescue ActiveSupport::MessageVerifier::InvalidSignature, ActiveRecord::RecordNotFound => e
      Rails.logger.warn("StudioPage#purge_removed_images: #{e.class} for signed_id=#{signed_id}")
    end
  end

  # Extract ActiveStorage signed IDs from <img src="..."> tags embedded in HTML content.
  # Handles both /redirect/ and /proxy/ blob URL variants.
  def extract_blob_signed_ids(html)
    return [] if html.blank?

    html.scan(%r{/rails/active_storage/blobs/(?:redirect|proxy)/([^/"]+)}).flatten
  end

  def generate_slug
    base = title.downcase.strip.gsub(/[^a-z0-9\s-]/, "").gsub(/\s+/, "-").squeeze("-")
    candidate = base
    n = 1
    while StudioPage.where(studio_id: studio_id).where.not(id: id).exists?(slug: candidate)
      candidate = "#{base}-#{n}"
      n += 1
    end
    self.slug = candidate
  end
end
