class BundleProductPolicy < ApplicationPolicy
  def index?
    user && (user.godmode? || user.owner? || user.staff? || user.moderator?)
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
