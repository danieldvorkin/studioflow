class Client < ApplicationRecord
  belongs_to :studio
  belongs_to :user, optional: true
  has_many :bookings

  has_many :client_notes, dependent: :destroy

  has_many :client_payment_methods, dependent: :destroy

  has_many :instructor_client_blocks, dependent: :destroy
  has_many :blocking_instructors, through: :instructor_client_blocks, source: :instructor

  validates :name, presence: true
  validates :email, presence: true
end

