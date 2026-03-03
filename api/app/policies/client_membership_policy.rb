class ClientMembershipPolicy < ApplicationPolicy
  def index?
    user && (user.owner? || user.staff? || user.client?)
  end

  def create?
    user && (user.owner? || user.staff?)
  end

  def update?
    create?
  end
end
