class BundlePurchasePolicy < ApplicationPolicy
  def create?
    user && (user.godmode? || user.client? || user.owner? || user.staff? || user.moderator?)
  end

  def index?
    user && user.client?
  end
end
