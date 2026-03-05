class ShopOrderPolicy < ApplicationPolicy
  # Owners, staff, and platform admins can list all studio orders
  def index?
    user && (user.godmode? || user.owner? || user.staff?)
  end

  # Any authenticated user can see their own orders (used by my_shop_orders resolver)
  def mine?
    user.present?
  end

  def create?
    user.present?
  end

  def update?
    index?
  end

  def destroy?
    index?
  end
end
