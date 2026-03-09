class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable,
         :jwt_authenticatable, jwt_revocation_strategy: JwtDenylist

  ROLES = { owner: 0, staff: 1, instructor: 2, client: 3, moderator: 4 }.freeze
  GODMODE_EMAIL = "dvorkin212@gmail.com".freeze

  belongs_to :studio

  has_many :instructor_payouts, foreign_key: :instructor_id, dependent: :restrict_with_exception
  has_many :notifications, dependent: :destroy
  has_many :api_tokens, dependent: :destroy

  def godmode?
    email.to_s.strip.casecmp?(GODMODE_EMAIL)
  end

  def role_name
    return "godmode" if godmode?

    ROLES.key(read_attribute(:role))&.to_s
  end

  def moderator?
    read_attribute(:role) == ROLES[:moderator]
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

  def platform_staff?
    godmode? || moderator?
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
  has_many :conversation_participants, dependent: :destroy
  has_many :conversations, through: :conversation_participants
  has_many :sent_messages, class_name: "Message", foreign_key: :sender_id, dependent: :destroy

  has_many :favorite_class_sessions, dependent: :destroy
  has_many :favorited_class_sessions, through: :favorite_class_sessions, source: :class_session
  has_many :blocked_clients, through: :instructor_client_blocks, source: :client
end
