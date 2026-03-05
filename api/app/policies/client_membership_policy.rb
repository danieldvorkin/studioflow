class ClientMembershipPolicy < ApplicationPolicy
  def index?
    user && (user.godmode? || user.owner? || user.staff? || user.client?)
  end

  def create?
    user && (user.godmode? || user.owner? || user.staff?)
  end

  def update?
    create?
  end
end
