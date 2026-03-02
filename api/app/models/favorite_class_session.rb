class FavoriteClassSession < ApplicationRecord
  belongs_to :user
  belongs_to :class_session

  validates :user_id, uniqueness: { scope: :class_session_id }
end
