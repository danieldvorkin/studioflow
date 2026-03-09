# frozen_string_literal: true

class Message < ApplicationRecord
  belongs_to :conversation
  belongs_to :sender, class_name: "User"

  validates :body, presence: true

  scope :chronological, -> { order(created_at: :asc) }

  def read?
    read_at.present?
  end
end