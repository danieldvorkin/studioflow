class InstructorClientBlock < ApplicationRecord
  belongs_to :studio
  belongs_to :instructor, class_name: 'User'
  belongs_to :client

  validates :instructor_id, uniqueness: { scope: :client_id }
end
