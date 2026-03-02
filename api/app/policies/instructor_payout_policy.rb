class InstructorPayoutPolicy < ApplicationPolicy
  def index?
    user&.owner?
  end

  def show?
    user&.owner?
  end

  def create?
    user&.owner?
  end

  def update?
    user&.owner?
  end
end
