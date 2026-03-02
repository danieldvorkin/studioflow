class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable,
         :jwt_authenticatable, jwt_revocation_strategy: JwtDenylist

  ROLES = { owner: 0, staff: 1, instructor: 2, client: 3 }.freeze

  belongs_to :studio

  has_many :instructor_payouts, foreign_key: :instructor_id, dependent: :restrict_with_exception

  def role_name
    ROLES.key(read_attribute(:role))&.to_s
  end

  def owner?
    read_attribute(:role) == ROLES[:owner]
  end

  def staff?
    read_attribute(:role) == ROLES[:staff]
  end

  def instructor?
    read_attribute(:role) == ROLES[:instructor]
  end

  def client?
    read_attribute(:role) == ROLES[:client]
  end

  validates :instructor_compensation_type,
            inclusion: { in: %w[revenue_share flat_rate] },
            if: -> { instructor? }
  validates :instructor_default_split_percent,
            numericality: { only_integer: true, greater_than_or_equal_to: 0, less_than_or_equal_to: 100 },
            if: -> { instructor? }
  validates :instructor_default_flat_rate_cents,
            numericality: { only_integer: true, greater_than_or_equal_to: 0 },
            if: -> { instructor? }

  has_many :instructor_client_blocks, foreign_key: :instructor_id, dependent: :destroy

  has_many :favorite_class_sessions, dependent: :destroy
  has_many :favorited_class_sessions, through: :favorite_class_sessions, source: :class_session
  has_many :blocked_clients, through: :instructor_client_blocks, source: :client
end
