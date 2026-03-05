class InstructorPayoutPolicy < ApplicationPolicy
  def index?
    user&.godmode? || user&.owner? || user&.moderator?
  end

  def show?
    user&.godmode? || user&.owner? || user&.moderator?
  end

  def create?
    user&.godmode? || user&.owner? || user&.moderator?
  end

  def update?
    user&.godmode? || user&.owner? || user&.moderator?
  end
end
