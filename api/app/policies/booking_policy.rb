class BookingPolicy < ApplicationPolicy
  def create?
  user && (user.client? || user.owner? || user.staff? || user.instructor?)
  end

  def cancel?
  user && (
    user.owner? ||
    user.staff? ||
    (user.client? && record.client.user_id == user.id) ||
    (user.instructor? && record.class_session.instructor_id == user.id)
  )
  end

  def archive?
  user && (
    user.owner? ||
    user.staff? ||
    (user.instructor? && record.class_session.instructor_id == user.id)
  )
  end

  def rebook?
    cancel?
  end
end
