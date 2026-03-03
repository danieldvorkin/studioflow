class ClientNote < ApplicationRecord
  belongs_to :client
  belongs_to :author, class_name: "User"

  validates :body, presence: true
end
