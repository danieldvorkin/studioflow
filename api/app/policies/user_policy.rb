class UserPolicy < ApplicationPolicy
  def invite?
    user && (user.owner? || user.moderator?)
  end

  def create_moderator?
    user&.godmode? || user&.owner?
  end

  def update?
    user && (user.owner? || user.moderator?)
  end
end
