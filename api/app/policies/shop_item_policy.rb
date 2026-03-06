class ShopItemPolicy < ApplicationPolicy
  # Owners, staff, and platform staff can manage shop items
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

  # Clients and authenticated users can browse the shop
  def show?
    user.present?
  end
end
