class BundleProductPolicy < ApplicationPolicy
  def index?
    user && (user.owner? || user.staff?)
  end

  def create?
    index?
  end

  def update?
    index?
  end

  def destroy?
    index?
  end
end
