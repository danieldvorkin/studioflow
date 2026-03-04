class MembershipPlanPolicy < ApplicationPolicy
  def index?
    user && (user.owner? || user.staff? || user.client? || user.moderator?)
  end

  def create?
    user && (user.owner? || user.moderator?)
  end

  def update?
    create?
  end

  def destroy?
    create?
  end
end
