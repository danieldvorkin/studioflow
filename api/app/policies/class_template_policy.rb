class ClassTemplatePolicy < ApplicationPolicy
  def create?
    user && (user.godmode? || user.owner? || user.staff? || user.moderator?)
  end

  def update?
    user && (user.godmode? || user.owner? || user.staff? || user.moderator?)
  end

  def destroy?
    user && (user.godmode? || user.owner? || user.staff? || user.moderator?)
  end
end
