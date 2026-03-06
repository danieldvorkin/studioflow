class ClientMembershipPolicy < ApplicationPolicy
  def index?
    user && (user.godmode? || user.owner? || user.staff? || user.client? || user.moderator?)
  end

  def create?
    user && (user.godmode? || user.owner? || user.staff? || user.moderator?)
  end

  def update?
    create?
  end
end
