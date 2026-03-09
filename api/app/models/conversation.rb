# frozen_string_literal: true

class Conversation < ApplicationRecord
  belongs_to :studio

  has_many :conversation_participants, dependent: :destroy
  has_many :participants, through: :conversation_participants, source: :user
  has_many :messages, dependent: :destroy

  def other_participant(user)
    participants.where.not(id: user.id).first
  end

  def last_message
    messages.order(created_at: :desc).first
  end

  def unread_count_for(user)
    messages.where.not(sender_id: user.id).where(read_at: nil).count
  end

  def mark_read_for!(user)
    messages.where.not(sender_id: user.id).where(read_at: nil).update_all(read_at: Time.current)
  end

  # Find an existing 1:1 conversation between two users in a studio
  def self.between(user_a, user_b, studio:)
    # Ensure we only match conversations with exactly 2 participants total
    two_participant_ids = ConversationParticipant
      .select(:conversation_id)
      .group(:conversation_id)
      .having("COUNT(*) = 2")

    joins(:conversation_participants)
      .where(studio: studio)
      .where(id: two_participant_ids)
      .where(conversation_participants: { user_id: [user_a.id, user_b.id] })
      .group(:id)
      .having("COUNT(conversation_participants.id) = 2")
      .first
  end
end