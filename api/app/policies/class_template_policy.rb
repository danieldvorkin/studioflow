class ClassTemplatePolicy < ApplicationPolicy
  def create?
    user && (user.godmode? || user.owner? || user.staff? || user.moderator? || user.instructor?)
  end

  def update?
    return false unless user
    return true if user.godmode? || user.owner? || user.staff? || user.moderator?
    # Instructors may update templates they are assigned to
    user.instructor? && record.instructor_id == user.id
  end

  def destroy?
    return false unless user
    return true if user.godmode? || user.owner? || user.staff? || user.moderator?
    # Instructors may delete their own un-approved templates only
    user.instructor? && record.instructor_id == user.id && !record.approved?
  end

  def approve?
    user && (user.godmode? || user.owner? || user.moderator?)
  end
end
