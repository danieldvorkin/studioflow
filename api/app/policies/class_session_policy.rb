class ClassSessionPolicy < ApplicationPolicy
  def create?
	user && (user.owner? || user.staff? || user.instructor?)
  end

  def update?
	user && (user.owner? || user.staff? || (user.instructor? && record.instructor_id == user.id))
  end

  def destroy?
	user && (user.owner? || user.staff?)
  end
end
