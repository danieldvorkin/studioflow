class ClassSessionPolicy < ApplicationPolicy
  def create?
  user && (user.godmode? || user.owner? || user.staff? || user.instructor?)
  end

  def update?
  user && (user.godmode? || user.owner? || user.staff? || (user.instructor? && record.instructor_id == user.id))
  end

  def destroy?
  user && (user.godmode? || user.owner? || user.staff?)
  end
end
