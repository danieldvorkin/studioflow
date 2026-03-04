class ClientPolicy < ApplicationPolicy
  def index?
    user && (user.owner? || user.staff? || user.moderator?)
  end

  def show?
    user && (user.owner? || user.staff? || user.moderator?)
  end

  def create?
    user.present?
  end

  def update?
    user && (user.owner? || user.staff? || user.moderator?)
  end

  def destroy?
    user && (user.owner? || user.moderator?)
  end
end
