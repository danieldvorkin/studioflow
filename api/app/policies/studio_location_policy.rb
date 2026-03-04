class StudioLocationPolicy < ApplicationPolicy
  def index?
    user && (user.owner? || user.staff? || user.moderator?)
  end

  def create?
    user && (user.owner? || user.moderator?)
  end

  def update?
    user && (user.owner? || user.moderator?)
  end

  def destroy?
    user && (user.owner? || user.moderator?)
  end
end
