class PaymentSettingPolicy < ApplicationPolicy
  def show?
    user && (user.owner? || user.moderator?)
  end

  def update?
    user && (user.owner? || user.moderator?)
  end
end
