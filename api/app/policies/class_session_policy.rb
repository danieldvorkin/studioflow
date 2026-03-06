class ClassSessionPolicy < ApplicationPolicy
  def create?
    user && (user.godmode? || user.owner? || user.staff? || user.instructor? || user.moderator?)
  end

  def update?
    user && (user.godmode? || user.owner? || user.staff? || user.moderator? || (user.instructor? && record.instructor_id == user.id))
  end

  def destroy?
    user && (user.godmode? || user.owner? || user.staff? || user.moderator?)
  end
end
