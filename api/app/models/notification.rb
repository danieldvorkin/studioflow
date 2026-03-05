# frozen_string_literal: true

class Notification < ApplicationRecord
  KINDS = %w[
    general
    subscription_trial_ending
    subscription_trial_expired
    subscription_past_due
    subscription_payment_failed
    subscription_payment_succeeded
    subscription_cancelled
    subscription_reactivated
    subscription_upgraded
    subscription_downgraded
    class_reminder
    booking_confirmed
    booking_cancelled
    waitlist_promoted
    new_client_joined
    membership_expiring
    instructor_payout_ready
    studio_milestone
  ].freeze

  belongs_to :user
  belongs_to :studio, optional: true

  validates :kind,  inclusion: { in: KINDS }
  validates :title, presence: true

  scope :unread,     -> { where(read_at: nil) }
  scope :undismissed, -> { where(dismissed_at: nil) }
  scope :visible,    -> { undismissed.order(created_at: :desc) }
  scope :recent,     -> { where("created_at > ?", 90.days.ago) }

  def read?
    read_at.present?
  end

  def dismissed?
    dismissed_at.present?
  end

  def mark_read!
    touch(:read_at) unless read?
  end

  def dismiss!
    touch(:dismissed_at) unless dismissed?
  end

  # Class-level helper to create a notification for all owner users of a studio.
  def self.notify_owners(studio:, kind:, title:, body: nil, action_url: nil)
    owner_users = studio.users.where(role: User::ROLES[:owner])
    owner_users.each do |u|
      find_or_create_by!(
        user: u,
        studio: studio,
        kind: kind,
        title: title
      ) do |n|
        n.body       = body
        n.action_url = action_url
      end
    end
  end
end
