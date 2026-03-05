class BookingPolicy < ApplicationPolicy
  def create?
    user && (user.godmode? || user.client? || user.owner? || user.staff? || user.instructor? || user.moderator?)
  end

  def cancel?
    user && (
      user.godmode? ||
      user.owner? ||
      user.staff? ||
      user.moderator? ||
      (user.client? && record.client.user_id == user.id) ||
      (user.instructor? && record.class_session.instructor_id == user.id)
    )
  end

  def archive?
    user && (
      user.godmode? ||
      user.owner? ||
      user.staff? ||
      user.moderator? ||
      (user.instructor? && record.class_session.instructor_id == user.id)
    )
  end

  def rebook?
    cancel?
  end
end
