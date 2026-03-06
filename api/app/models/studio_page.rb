# frozen_string_literal: true

class StudioPage < ApplicationRecord
  belongs_to :studio

  validates :title, presence: true
  validates :slug,  presence: true, uniqueness: { scope: :studio_id }
  validates :position, numericality: { only_integer: true, greater_than_or_equal_to: 0 }

  before_validation :generate_slug, if: -> { slug.blank? && title.present? }

  scope :published, -> { where(published: true) }
  scope :ordered,   -> { order(:position, :created_at) }

  private

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
