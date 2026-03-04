class ApplicationPolicy
  attr_reader :user, :record

  def initialize(user, record)
    @user = user
    @record = record
  end

  def index?
    false
  end

  def show?
    scope.where(id: record.id).exists?
  end

  def create?
    false
  end

  def new?
    create?
  end

  def update?
    false
  end

  def edit?
    update?
  end

  def destroy?
    false
  end

  def scope
    Pundit.policy_scope!(user, record.class)
  end

  class Scope
    attr_reader :user, :scope

    def initialize(user, scope)
      @user = user
      @scope = scope
    end

    def resolve
      return scope.none unless user

      # Platform staff (godmode + moderators) are platform-wide overseers and see all data
      return scope.all if user.respond_to?(:platform_staff?) && user.platform_staff?

      if scope.respond_to?(:column_names) && scope.column_names.include?("studio_id")
        scope.where(studio_id: user.studio_id)
      else
        scope.all
      end
    end
  end
end
