class InstructorPayoutPolicy < ApplicationPolicy
  def index?
    user&.owner? || user&.moderator?
  end

  def show?
    user&.owner? || user&.moderator?
  end

  def create?
    user&.owner? || user&.moderator?
  end

  def update?
    user&.owner? || user&.moderator?
  end
end
