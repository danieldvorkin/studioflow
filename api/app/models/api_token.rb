class ApiToken < ApplicationRecord
  TOKEN_PREFIX_LENGTH = 8
  TOKEN_BYTES         = 32

  belongs_to :user
  belongs_to :studio

  validates :name,         presence: true
  validates :token_digest, presence: true, uniqueness: true
  validates :token_prefix, presence: true

  scope :active, -> { where(revoked_at: nil).where("expires_at IS NULL OR expires_at > ?", Time.current) }

  # ─── Class helpers ───────────────────────────────────────────────────────────

  # Generate a new raw token, build the record (unsaved), and return both.
  # The raw token is only returned once — the caller must persist it immediately.
  def self.generate!(user:, studio:, name:)
    raw                = SecureRandom.hex(TOKEN_BYTES)          # 64-char hex string
    prefix             = raw[0, TOKEN_PREFIX_LENGTH]
    hashed             = BCrypt::Password.create(raw)

    token = create!(
      user:         user,
      studio:       studio,
      name:         name,
      token_digest: hashed,
      token_prefix: prefix
    )

    [ token, raw ]
  end

  # Authenticate a raw token against all active records for the studio.
  # Returns the matching ApiToken (and touches last_used_at) or nil.
  def self.authenticate!(raw_token)
    prefix  = raw_token.to_s[0, TOKEN_PREFIX_LENGTH]
    # Narrow the candidate set by prefix first (fast DB lookup)
    candidates = active.where(token_prefix: prefix)
    candidates.find do |record|
      BCrypt::Password.new(record.token_digest) == raw_token
    end&.tap(&:touch_last_used)
  end

  # ─── Instance helpers ────────────────────────────────────────────────────────

  def revoked?
    revoked_at.present?
  end

  def expired?
    expires_at.present? && expires_at <= Time.current
  end

  def active?
    !revoked? && !expired?
  end

  def revoke!
    touch(:revoked_at)
  end

  def touch_last_used
    update_column(:last_used_at, Time.current)
  end
end
