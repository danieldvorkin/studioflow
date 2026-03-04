class ClassTemplatePolicy < ApplicationPolicy
  def create?
    user && (user.owner? || user.staff? || user.moderator?)
  end

  def update?
    user && (user.owner? || user.staff? || user.moderator?)
  end

  def destroy?
    user && (user.owner? || user.staff? || user.moderator?)
  end
end
