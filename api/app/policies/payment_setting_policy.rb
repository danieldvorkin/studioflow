class PaymentSettingPolicy < ApplicationPolicy
  def show?
    user && (user.godmode? || user.owner? || user.moderator?)
  end

  def update?
    user && (user.godmode? || user.owner? || user.moderator?)
  end
end
