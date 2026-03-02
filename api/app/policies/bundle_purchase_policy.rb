class BundlePurchasePolicy < ApplicationPolicy
  def create?
    user && (user.client? || user.owner? || user.staff?)
  end

  def index?
    user && user.client?
  end
end
