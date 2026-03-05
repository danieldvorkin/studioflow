class ClientPolicy < ApplicationPolicy
  def index?
    user && (user.godmode? || user.owner? || user.staff? || user.moderator?)
  end

  def show?
    user && (user.godmode? || user.owner? || user.staff? || user.moderator?)
  end

  def create?
    user.present?
  end

  def update?
    user && (user.godmode? || user.owner? || user.staff? || user.moderator?)
  end

  def destroy?
    user && (user.godmode? || user.owner? || user.moderator?)
  end
end
